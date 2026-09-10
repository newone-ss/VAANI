import asyncio
import hmac
import hashlib
import json
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import httpx

class N8NDispatcher:
    """
    Asynchronous, Signed Metadata-Only Webhook Dispatcher for self-hosted n8n.
    
    Enterprise Privacy & Security:
    1. Zero Raw Audio: Only structured security metadata is transmitted.
    2. Cryptographic Authenticity: Every request is signed via HMAC-SHA256 in the
       'X-Signature-SHA256' header using an enterprise pre-shared key.
    3. Asynchronous Non-Blocking: Dispatched in a background task to never hold up
       the < 300 ms streaming decision pipeline.
    """

    def __init__(
        self,
        webhook_url: str = "http://localhost:5678/webhook/voice-threat",
        hmac_secret: str = "bite-me-enterprise-hmac-secret-key-32b",
        timeout_sec: float = 0.25,
        enabled: bool = True,
    ):
        self.webhook_url = webhook_url
        self.hmac_secret = hmac_secret.encode("utf-8")
        self.timeout_sec = timeout_sec
        self.enabled = enabled
        self._sent_payloads: List[Dict[str, Any]] = []

    def sign_payload(self, payload_bytes: bytes) -> str:
        """Computes HMAC-SHA256 signature for payload verification in n8n."""
        mac = hmac.new(self.hmac_secret, payload_bytes, hashlib.sha256)
        return mac.hexdigest()

    def build_metadata_payload(
        self,
        call_id: str,
        speaker_id: str,
        state: str,
        action: str,
        risk_score: float,
        reasons: List[str],
        total_latency_ms: float,
    ) -> Dict[str, Any]:
        """
        Builds privacy-compliant metadata-only telemetry payload.
        Ensures zero biometric voice patterns or audio waveforms are transmitted.
        """
        return {
            "source": "BiTe_me_Inference_Engine",
            "event_type": "EXECUTIVE_VOICE_THREAT_DETECTED" if risk_score >= 60.0 else "CALL_STATE_UPDATE",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "call_id": call_id,
            "speaker_id": speaker_id,
            "policy_state": state,
            "recommended_action": action,
            "dynamic_risk_score": round(risk_score, 2),
            "threat_reasons": reasons,
            "latency_telemetry": {
                "decision_latency_ms": round(total_latency_ms, 2),
                "within_sla": total_latency_ms < 300.0,
            },
            "graduated_controls": {
                "warn_analyst": risk_score >= 60.0,
                "challenge_mfa": risk_score >= 75.0,
                "sip_call_hold": risk_score >= 90.0,
            },
        }

    async def dispatch(
        self,
        call_id: str,
        speaker_id: str,
        state: str,
        action: str,
        risk_score: float,
        reasons: List[str],
        total_latency_ms: float,
    ) -> bool:
        """
        Dispatches signed webhook asynchronously.
        """
        if not self.enabled:
            return False

        payload_data = self.build_metadata_payload(
            call_id=call_id,
            speaker_id=speaker_id,
            state=state,
            action=action,
            risk_score=risk_score,
            reasons=reasons,
            total_latency_ms=total_latency_ms,
        )

        payload_bytes = json.dumps(payload_data, separators=(",", ":")).encode("utf-8")
        signature = self.sign_payload(payload_bytes)

        headers = {
            "Content-Type": "application/json",
            "X-Signature-SHA256": signature,
            "X-BiTe-Timestamp": str(int(time.time())),
        }

        # Store for audit / inspection
        self._sent_payloads.append(payload_data)

        # Non-blocking async dispatch
        try:
            async with httpx.AsyncClient(timeout=self.timeout_sec) as client:
                resp = await client.post(self.webhook_url, content=payload_bytes, headers=headers)
                return resp.status_code in (200, 201, 202, 204)
        except Exception:
            # Network failure or n8n offline does not disrupt the live call
            return False

    @property
    def dispatched_count(self) -> int:
        return len(self._sent_payloads)

    @property
    def last_dispatched_payload(self) -> Optional[Dict[str, Any]]:
        return self._sent_payloads[-1] if self._sent_payloads else None
