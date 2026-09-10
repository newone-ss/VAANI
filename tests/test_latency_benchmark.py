import time
import numpy as np
import pytest
from backend.gateway.ring_buffer import AudioRingBuffer
from backend.inference.dsp_gate import DSPGate
from backend.inference.anti_spoofing_ensemble import AntiSpoofingEnsemble
from backend.inference.non_invertible_speaker import NonInvertibleSpeakerVerifier
from backend.policy.policy_engine import PolicyEngine
from backend.policy.audit_ledger import AuditLedger
from backend.policy.n8n_dispatcher import N8NDispatcher

def test_sub_300ms_decision_latency_sla():
    sample_rate = 16000
    frame_samples = 800  # 50 ms frame
    num_frames = 50

    # Initialize all planes
    ring = AudioRingBuffer(sample_rate=sample_rate, capacity_seconds=3.0)
    dsp = DSPGate(sample_rate=sample_rate)
    spoof = AntiSpoofingEnsemble(sample_rate=sample_rate)
    speaker = NonInvertibleSpeakerVerifier()
    policy = PolicyEngine()
    ledger = AuditLedger()
    n8n = N8NDispatcher()

    # Pre-enroll speaker
    ref_audio = np.sin(2 * np.pi * 125 * np.linspace(0, 1.0, 16000)).astype(np.float32)
    speaker.enroll_speaker("CEO_01", ref_audio)

    latencies = []

    # Stream 50 frames (simulating 2.5 seconds of live call)
    for i in range(num_frames):
        t_start = time.perf_counter()

        # 1. Ingestion
        t_frame = np.sin(2 * np.pi * 125 * np.linspace(i * 0.05, (i + 1) * 0.05, frame_samples)).astype(np.float32)
        pcm_bytes = (t_frame * 32767).astype(np.int16).tobytes()
        ring.push_pcm16_bytes(pcm_bytes)
        audio_frame = ring.get_latest_frame(frame_samples)

        # 2. Hot Path: DSP Gate
        dsp_res = dsp.evaluate(audio_frame)

        # 3. Hot Path: Anti-Spoofing
        spoof_res = spoof.predict(audio_frame)

        # 4. Hot Path: Non-Invertible Speaker
        speaker_res = speaker.verify("CEO_01", audio_frame)

        # 5. Cold Path: Policy & Smoothing
        decision = policy.evaluate(
            spoof_probability=spoof_res.spoof_probability,
            speaker_inconsistency_risk=speaker_res.consistency_risk,
            dsp_anomaly=dsp_res.dsp_anomaly_flag,
            spectral_flatness=dsp_res.spectral_flatness,
        )

        # 6. Cold Path: Audit & HMAC
        if decision.state_changed or decision.smoothed_risk_score >= 60.0:
            ledger.append_decision(
                call_id="BENCHMARK",
                speaker_id="CEO_01",
                risk_score=decision.smoothed_risk_score,
                policy_state=decision.state.value,
                action=decision.action.value,
                reasons=decision.reasons,
            )
            n8n.build_metadata_payload(
                call_id="BENCHMARK",
                speaker_id="CEO_01",
                state=decision.state.value,
                action=decision.action.value,
                risk_score=decision.smoothed_risk_score,
                reasons=decision.reasons,
                total_latency_ms=10.0,
            )

        latency_ms = (time.perf_counter() - t_start) * 1000.0
        latencies.append(latency_ms)

    avg_latency = float(np.mean(latencies))
    max_latency = float(np.max(latencies))

    print(f"\n[LATENCY BENCHMARK] Mean: {avg_latency:.2f} ms, Max: {max_latency:.2f} ms (Target: < 300 ms)")

    # Hard SLA assertions
    assert max_latency < 300.0, f"Max latency {max_latency:.2f} ms violated the 300 ms SLA!"
    assert avg_latency < 60.0, f"Mean latency {avg_latency:.2f} ms is higher than expected (< 60 ms)"
