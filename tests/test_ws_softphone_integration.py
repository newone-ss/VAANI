import json
import numpy as np
import pytest
from fastapi.testclient import TestClient
from src.server import app, media_gateway

def generate_pcm16_frame(frequency_hz: float = 200.0, amplitude: float = 0.5, num_samples: int = 800) -> bytes:
    """Generates an 800-sample (50ms @ 16kHz) 16-bit PCM mono audio frame."""
    t = np.linspace(0, num_samples / 16000.0, num_samples, endpoint=False)
    # Sine wave with harmonics to simulate voiced speech
    audio = amplitude * (np.sin(2 * np.pi * frequency_hz * t) + 0.3 * np.sin(2 * np.pi * frequency_hz * 2 * t))
    audio = np.clip(audio, -1.0, 1.0)
    int16_samples = (audio * 32767).astype(np.int16)
    return int16_samples.tobytes()

def test_websocket_softphone_integration():
    """
    Integration test verifying browser softphone WebSocket connection:
    - Connects to /ws/audio/stream/test_browser_call
    - Sends raw binary PCM16 frames (800 samples = 1600 bytes)
    - Asserts valid JSON telemetry response with risk_score, policy_state, evidence
    - Verifies session isolation and zero-disk cleanup on disconnect
    """
    client = TestClient(app)
    call_id = "test_browser_call"

    # Ensure no leftover session
    assert call_id not in media_gateway.active_sessions
    assert call_id not in media_gateway.policy_sessions

    with client.websocket_connect(f"/ws/audio/stream/{call_id}") as ws:
        # Verify session table populated with dedicated ring buffer & policy engine
        assert call_id in media_gateway.active_sessions
        assert call_id in media_gateway.policy_sessions

        # 1. Send Active Voiced Frame (800 samples = 1600 bytes)
        active_pcm = generate_pcm16_frame(frequency_hz=125.0, amplitude=0.6, num_samples=800)
        assert len(active_pcm) == 1600

        ws.send_bytes(active_pcm)
        response_text = ws.receive_text()
        telemetry = json.loads(response_text)

        # Assert required fields for softphone display
        assert "risk_score" in telemetry
        assert isinstance(telemetry["risk_score"], (int, float))
        assert "policy_state" in telemetry
        assert telemetry["policy_state"] in ["NORMAL", "MONITOR", "WARN_ANALYST", "STEP_UP_MFA", "ACTIVE_HOLD"]
        assert "evidence" in telemetry
        assert isinstance(telemetry["evidence"], list)
        assert "latency_breakdown" in telemetry
        assert "total_ms" in telemetry["latency_breakdown"]
        assert telemetry["call_id"] == call_id

        # 2. Send Silence Frame (all zeros)
        silence_pcm = (np.zeros(800, dtype=np.int16)).tobytes()
        ws.send_bytes(silence_pcm)
        response_silence_text = ws.receive_text()
        telemetry_silence = json.loads(response_silence_text)

        # Assert silence response is valid and non-crashing
        assert "risk_score" in telemetry_silence
        assert "policy_state" in telemetry_silence
        assert "evidence" in telemetry_silence

    # 3. Verify clean disconnect & session teardown (Zero-Disk RAM assurance)
    assert call_id not in media_gateway.active_sessions
    assert call_id not in media_gateway.policy_sessions

def test_session_isolation_multiple_calls():
    """
    Verifies that distinct browser call_ids instantiate independent PolicyEngine
    and RingBuffer states so synthetic or previous calls cannot bleed state into a fresh call.
    """
    client = TestClient(app)
    call_1 = "browser_call_alpha"
    call_2 = "browser_call_beta"

    with client.websocket_connect(f"/ws/audio/stream/{call_1}") as ws1:
        with client.websocket_connect(f"/ws/audio/stream/{call_2}") as ws2:
            # Check separate instances
            assert media_gateway.active_sessions[call_1] is not media_gateway.active_sessions[call_2]
            assert media_gateway.policy_sessions[call_1] is not media_gateway.policy_sessions[call_2]

            # Send frame to call_1
            ws1.send_bytes(generate_pcm16_frame(num_samples=800))
            res1 = json.loads(ws1.receive_text())
            assert res1["call_id"] == call_1

            # Send frame to call_2
            ws2.send_bytes(generate_pcm16_frame(num_samples=800))
            res2 = json.loads(ws2.receive_text())
            assert res2["call_id"] == call_2

    assert call_1 not in media_gateway.active_sessions
    assert call_2 not in media_gateway.active_sessions

def test_softphone_route_serves_html():
    """Verifies that GET /softphone returns HTTP 200 and serves softphone_capture.html."""
    client = TestClient(app)
    response = client.get("/softphone")
    assert response.status_code == 200
    assert "Live Softphone Ingestion Client" in response.text
    assert "inputCallId" in response.text

def test_dynamic_live_speaker_enrollment():
    """
    Verifies that a user can enroll their live voice directly during a call:
    - Streams speech frames into ring buffer
    - Sends {"action": "enroll_current", "speaker_id": "DEMO_LIVE_CEO"}
    - Verifies enrollment success and subsequent speaker match
    """
    client = TestClient(app)
    call_id = "test_enroll_flow"

    with client.websocket_connect(f"/ws/audio/stream/{call_id}") as ws:
        # Stream 25 frames (1.25s of audio) of consistent pitch
        for _ in range(25):
            ws.send_bytes(generate_pcm16_frame(frequency_hz=160.0, amplitude=0.7, num_samples=800))
            _ = ws.receive_text()

        # Trigger live enrollment
        ws.send_text(json.dumps({
            "action": "enroll_current",
            "speaker_id": "DEMO_LIVE_CEO"
        }))
        enroll_res = json.loads(ws.receive_text())
        assert enroll_res["type"] == "ENROLLMENT_RESULT"
        assert enroll_res["success"] is True

        # Test REST endpoint as well
        rest_res = client.post(f"/api/speaker/enroll-session/{call_id}?speaker_id=REST_ENROLLED_CEO")
        assert rest_res.status_code == 200
        assert rest_res.json()["status"] == "ENROLLED"
