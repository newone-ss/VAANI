import asyncio
import json
import time
from typing import Dict, Optional, Set
import numpy as np
from fastapi import WebSocket, WebSocketDisconnect

from config import config
from .ring_buffer import AudioRingBuffer
from src.inference.dsp_gate import DSPGate, DSPResult
from src.inference.anti_spoofing_ensemble import AntiSpoofingEnsemble
from src.inference.non_invertible_speaker import NonInvertibleSpeakerVerifier
from src.policy.policy_engine import PolicyEngine, PolicyState
from src.policy.n8n_dispatcher import N8NDispatcher
from src.policy.audit_ledger import AuditLedger

class MediaGatewayServer:
    """
    Real-Time Streaming Audio Gateway and Orchestration Hub.
    Coordinates the Ingestion, Inference Hot Path (< 60ms), and Policy Cold Path (< 250ms).
    """

    def __init__(
        self,
        dsp_gate: DSPGate,
        anti_spoofing: AntiSpoofingEnsemble,
        speaker_verifier: NonInvertibleSpeakerVerifier,
        policy_engine: PolicyEngine,
        n8n_dispatcher: N8NDispatcher,
        audit_ledger: AuditLedger,
    ):
        self.dsp_gate = dsp_gate
        self.anti_spoofing = anti_spoofing
        self.speaker_verifier = speaker_verifier
        self.policy_engine = policy_engine
        self.n8n_dispatcher = n8n_dispatcher
        self.audit_ledger = audit_ledger

        # Active call sessions: call_id -> AudioRingBuffer
        self.active_sessions: Dict[str, AudioRingBuffer] = {}
        # Per-session PolicyEngine instances to prevent state leakage between calls
        self.policy_sessions: Dict[str, PolicyEngine] = {}
        # Connected telemetry WebSockets for analysts/monitoring
        self.monitor_connections: Set[WebSocket] = set()

    def create_session(self, call_id: str) -> AudioRingBuffer:
        """Initializes in-memory ring buffer and dedicated policy engine for a call. No disk allocation."""
        ring = AudioRingBuffer(
            sample_rate=config.audio.sample_rate,
            capacity_seconds=config.audio.ring_buffer_capacity_seconds,
        )
        self.active_sessions[call_id] = ring
        self.policy_sessions[call_id] = PolicyEngine(
            threshold_monitor=config.policy.threshold_monitor,
            threshold_warn=config.policy.threshold_warn_analyst,
            threshold_mfa=config.policy.threshold_step_up_mfa,
            threshold_hold=config.policy.threshold_active_hold,
            smoothing_window=config.policy.smoothing_window_size,
            ema_alpha=config.policy.ema_alpha,
        )
        return ring

    def terminate_session(self, call_id: str) -> None:
        """Securely zeroizes RAM and clears call session."""
        if call_id in self.active_sessions:
            self.active_sessions[call_id].clear()
            del self.active_sessions[call_id]
        if call_id in self.policy_sessions:
            del self.policy_sessions[call_id]

    def enroll_speaker_from_buffer(self, call_id: str, speaker_id: str, duration_sec: float = 2.0) -> bool:
        """
        Dynamically enrolls a speaker's biometric template using recent audio from the live call ring buffer.
        Enables seamless live executive enrollment during interactive demos.
        """
        if call_id not in self.active_sessions:
            return False
        ring_buffer = self.active_sessions[call_id]
        needed_samples = int(config.audio.sample_rate * duration_sec)
        available = min(ring_buffer._total_samples_written, ring_buffer.capacity_samples)
        if available < config.audio.sample_rate:
            return False

        samples = ring_buffer.get_latest_frame(min(needed_samples, available))
        # Remove DC offset
        samples = samples - np.mean(samples)
        rms = float(np.sqrt(np.mean(np.square(samples)) + 1e-12))
        if rms < config.dsp.energy_threshold:
            return False

        self.speaker_verifier.enroll_speaker(speaker_id, samples)
        return True

    async def handle_audio_stream(
        self,
        websocket: WebSocket,
        call_id: str,
        speaker_id: str = "CEO_EXEC_01",
    ) -> None:
        """
        Handles bidirectional PCM stream for a live call session.
        Receives binary PCM frames (e.g. 50ms = 1600 bytes), executes hot path,
        and streams telemetry.
        """
        await websocket.accept()
        ring_buffer = self.create_session(call_id)
        frame_samples = config.audio.frame_samples

        try:
            while True:
                message = await websocket.receive()
                if message.get("type") == "websocket.disconnect":
                    break

                # Handle interactive WebSocket control commands (e.g. live voice enrollment)
                if "text" in message and message["text"]:
                    try:
                        cmd = json.loads(message["text"])
                        action = cmd.get("action")
                        if action == "enroll_current":
                            target_spk = cmd.get("speaker_id", speaker_id)
                            ok = self.enroll_speaker_from_buffer(call_id, target_spk)
                            await websocket.send_text(json.dumps({
                                "call_id": call_id,
                                "type": "ENROLLMENT_RESULT",
                                "success": ok,
                                "speaker_id": target_spk,
                                "message": f"Successfully enrolled live voice as {target_spk}!" if ok else "Speak continuously for 1-2 seconds first to capture vocal tract features."
                            }))
                            continue
                        elif action == "set_speaker":
                            speaker_id = cmd.get("speaker_id", speaker_id)
                            await websocket.send_text(json.dumps({
                                "call_id": call_id,
                                "type": "SPEAKER_UPDATED",
                                "speaker_id": speaker_id
                            }))
                            continue
                    except Exception:
                        pass
                    continue

                if "bytes" not in message:
                    continue

                raw_bytes: bytes = message["bytes"]
                if len(raw_bytes) == 0:
                    continue

                t_pipeline_start = time.perf_counter()

                # 1. Ingestion: push PCM into bounded ring buffer (RAM only)
                ring_buffer.push_pcm16_bytes(raw_bytes)
                audio_frame = ring_buffer.get_latest_frame(frame_samples)
                # Microphone DC offset removal
                audio_frame = audio_frame - np.mean(audio_frame)

                # 2. Hot Path Step 1: Sub-5ms DSP Gate (VAD + Spectral Check)
                dsp_res = self.dsp_gate.evaluate(audio_frame)
                session_policy = self.policy_sessions.get(call_id, self.policy_engine)

                # Silence drop optimization: preserve compute if silent/comfort noise
                if not dsp_res.is_speech and not dsp_res.dsp_anomaly_flag:
                    # Decay risk smoothly during natural pauses between words
                    decayed_decision = session_policy.evaluate(
                        spoof_probability=0.05,
                        speaker_inconsistency_risk=0.10,
                        dsp_anomaly=False,
                        spectral_flatness=dsp_res.spectral_flatness,
                    )
                    latency_ms = (time.perf_counter() - t_pipeline_start) * 1000.0
                    telemetry = {
                        "call_id": call_id,
                        "status": "SILENCE_DROPPED",
                        "risk_score": round(decayed_decision.smoothed_risk_score, 1),
                        "raw_risk_score": 0.0,
                        "policy_state": decayed_decision.state.value,
                        "state": decayed_decision.state.value,
                        "action": decayed_decision.action.value,
                        "evidence": ["Silence or comfort noise"],
                        "reasons": ["Silence or comfort noise"],
                        "artifacts": [],
                        "rms_energy": round(dsp_res.rms_energy, 4),
                        "latency_breakdown": {
                            "dsp_ms": round(dsp_res.latency_ms, 2),
                            "inference_ms": 0.0,
                            "policy_ms": round(decayed_decision.latency_ms, 2),
                            "total_ms": round(latency_ms, 2),
                        },
                    }
                    await websocket.send_text(json.dumps(telemetry))
                    continue

                # Adaptive temporal analysis window (up to 300ms / 4800 samples)
                # Stabilizes vocoder phase analysis and biometric matching across live phrases
                context_samples = min(
                    ring_buffer._total_samples_written,
                    frame_samples * 6
                )
                if context_samples > frame_samples:
                    inference_frame = ring_buffer.get_latest_frame(context_samples)
                    inference_frame = inference_frame - np.mean(inference_frame)
                else:
                    inference_frame = audio_frame

                # 3. Hot Path Step 2: Anti-Spoofing Deep Neural Ensemble (< 35ms)
                spoof_res = self.anti_spoofing.predict(inference_frame)

                # 4. Hot Path Step 3: Non-Invertible Speaker Consistency Check (< 2ms)
                speaker_res = self.speaker_verifier.verify(speaker_id, inference_frame)

                # 5. Cold Path Step 1: Decision Smoothing & Graduated Policy (< 2ms)
                decision = session_policy.evaluate(
                    spoof_probability=spoof_res.spoof_probability,
                    speaker_inconsistency_risk=speaker_res.consistency_risk,
                    dsp_anomaly=dsp_res.dsp_anomaly_flag,
                    spectral_flatness=dsp_res.spectral_flatness,
                )

                total_decision_latency_ms = (time.perf_counter() - t_pipeline_start) * 1000.0

                # 6. Cold Path Step 2: Audit Block & n8n Dispatcher
                if decision.state_changed or decision.smoothed_risk_score >= config.policy.threshold_warn_analyst:
                    # Append immutable block to SHA-256 ledger
                    self.audit_ledger.append_decision(
                        call_id=call_id,
                        speaker_id=speaker_id,
                        risk_score=decision.smoothed_risk_score,
                        policy_state=decision.state.value,
                        action=decision.action.value,
                        reasons=decision.reasons,
                    )

                    # Asynchronous signed webhook to n8n (metadata only)
                    asyncio.create_task(
                        self.n8n_dispatcher.dispatch(
                            call_id=call_id,
                            speaker_id=speaker_id,
                            state=decision.state.value,
                            action=decision.action.value,
                            risk_score=decision.smoothed_risk_score,
                            reasons=decision.reasons,
                            total_latency_ms=total_decision_latency_ms,
                        )
                    )

                # 7. Real-Time Telemetry to caller/analyst UI
                evidence_list = decision.reasons + spoof_res.detected_artifacts
                payload = {
                    "call_id": call_id,
                    "speaker_id": speaker_id,
                    "state": decision.state.value,
                    "policy_state": decision.state.value,
                    "action": decision.action.value,
                    "risk_score": round(decision.smoothed_risk_score, 1),
                    "raw_risk_score": round(decision.raw_risk_score, 1),
                    "evidence": evidence_list,
                    "reasons": decision.reasons,
                    "artifacts": spoof_res.detected_artifacts,
                    "spoof_probability": round(spoof_res.spoof_probability, 3),
                    "speaker_similarity": round(speaker_res.similarity_score, 3),
                    "speaker_match": speaker_res.is_match,
                    "dsp": {
                        "is_speech": dsp_res.is_speech,
                        "rms_energy": round(dsp_res.rms_energy, 4),
                        "spectral_flatness": round(dsp_res.spectral_flatness, 3),
                        "high_freq_ratio": round(dsp_res.high_freq_ratio, 3),
                        "snr_db": round(dsp_res.estimated_snr_db, 1),
                    },
                    "latency_breakdown": {
                        "dsp_ms": round(dsp_res.latency_ms, 2),
                        "spoof_inference_ms": round(spoof_res.latency_ms, 2),
                        "speaker_verify_ms": round(speaker_res.latency_ms, 2),
                        "policy_ms": round(decision.latency_ms, 2),
                        "total_ms": round(total_decision_latency_ms, 2),
                        "within_300ms_sla": total_decision_latency_ms < config.max_decision_latency_ms,
                    },
                }

                await websocket.send_text(json.dumps(payload))
                await self.broadcast_to_monitors(payload)

        except (WebSocketDisconnect, RuntimeError):
            pass
        finally:
            self.terminate_session(call_id)

    async def register_monitor(self, websocket: WebSocket) -> None:
        """Connects a SecOps analyst console for live fleet monitoring."""
        await websocket.accept()
        self.monitor_connections.add(websocket)
        try:
            while True:
                # Keep alive
                await websocket.receive_text()
        except WebSocketDisconnect:
            self.monitor_connections.remove(websocket)

    async def broadcast_to_monitors(self, payload: dict) -> None:
        """Broadcasts threat updates to connected analyst dashboards."""
        if not self.monitor_connections:
            return
        dead = set()
        text = json.dumps(payload)
        for ws in self.monitor_connections:
            try:
                await ws.send_text(text)
            except Exception:
                dead.add(ws)
        self.monitor_connections -= dead
