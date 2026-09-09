import hmac
import hashlib
import json
import pytest
from src.policy.n8n_dispatcher import N8NDispatcher

def test_n8n_dispatcher_hmac_signing():
    dispatcher = N8NDispatcher(
        webhook_url="http://localhost:5678/webhook/test",
        hmac_secret="test-secret-key-32b",
        enabled=True,
    )

    payload = dispatcher.build_metadata_payload(
        call_id="CALL-88",
        speaker_id="CEO_EXEC_01",
        state="STEP_UP_MFA",
        action="CHALLENGE_MFA",
        risk_score=81.5,
        reasons=["Vocoder buzz"],
        total_latency_ms=22.4,
    )

    # Assert zero raw audio in payload
    assert "audio" not in payload
    assert "raw_audio" not in payload
    assert "pcm" not in payload
    assert payload["call_id"] == "CALL-88"
    assert payload["dynamic_risk_score"] == 81.5

    # Compute signature
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    sig = dispatcher.sign_payload(payload_bytes)
    assert len(sig) == 64  # SHA256 hex string

    # Verify signature
    expected_mac = hmac.new(b"test-secret-key-32b", payload_bytes, hashlib.sha256).hexdigest()
    assert sig == expected_mac
