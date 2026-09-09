import asyncio
import os
import time
from typing import Optional
import hmac
import hashlib
from fastapi import FastAPI, WebSocket, Request, Response, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from config import config
from src.gateway.ring_buffer import AudioRingBuffer
from src.gateway.sip_mirror_sim import SIPMirrorSimulator
from src.gateway.ws_server import MediaGatewayServer
from src.inference.dsp_gate import DSPGate
from src.inference.anti_spoofing_ensemble import AntiSpoofingEnsemble
from src.inference.non_invertible_speaker import NonInvertibleSpeakerVerifier
from src.policy.policy_engine import PolicyEngine
from src.policy.n8n_dispatcher import N8NDispatcher
from src.policy.audit_ledger import AuditLedger

# Initialize Core Services
dsp_gate = DSPGate(
    sample_rate=config.audio.sample_rate,
    energy_threshold=config.dsp.energy_threshold,
    zcr_min=config.dsp.zero_crossing_rate_min,
    zcr_max=config.dsp.zero_crossing_rate_max,
    spectral_flatness_threshold=config.dsp.spectral_flatness_threshold,
    snr_floor_db=config.dsp.snr_floor_db,
)

anti_spoofing = AntiSpoofingEnsemble(
    sample_rate=config.audio.sample_rate,
)

speaker_verifier = NonInvertibleSpeakerVerifier(
    feature_dim=config.speaker.feature_dim,
    projection_dim=config.speaker.projection_dim,
    projection_seed=config.speaker.projection_seed,
    consistency_threshold=config.speaker.consistency_threshold,
)

policy_engine = PolicyEngine(
    threshold_monitor=config.policy.threshold_monitor,
    threshold_warn=config.policy.threshold_warn_analyst,
    threshold_mfa=config.policy.threshold_step_up_mfa,
    threshold_hold=config.policy.threshold_active_hold,
    smoothing_window=config.policy.smoothing_window_size,
    ema_alpha=config.policy.ema_alpha,
)

audit_ledger = AuditLedger()

n8n_dispatcher = N8NDispatcher(
    webhook_url=config.n8n.webhook_url,
    hmac_secret=config.n8n.hmac_secret,
    timeout_sec=config.n8n.dispatch_timeout_sec,
    enabled=config.n8n.enabled,
)

media_gateway = MediaGatewayServer(
    dsp_gate=dsp_gate,
    anti_spoofing=anti_spoofing,
    speaker_verifier=speaker_verifier,
    policy_engine=policy_engine,
    n8n_dispatcher=n8n_dispatcher,
    audit_ledger=audit_ledger,
)

sip_simulator = SIPMirrorSimulator(sample_rate=config.audio.sample_rate)

# Pre-enroll CEO template using clean human reference speech
ceo_reference_audio = sip_simulator.generate_human_voice(duration_sec=3.0, base_f0=120.0)
speaker_verifier.enroll_speaker("CEO_EXEC_01", ceo_reference_audio)

app = FastAPI(
    title="BiTe_me Engine",
    description="AI-Powered Real-Time Voice Impersonation Detection Engine",
    version=config.version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST Endpoints
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": config.app_name,
        "version": config.version,
        "latency_target_ms": config.max_decision_latency_ms,
        "privacy_mode": "in_memory_ephemeral_zero_disk",
    }

@app.get("/api/audit/blocks")
async def get_audit_blocks(limit: int = 50):
    """Retrieves recent blocks from the SHA-256 hash-chained audit ledger."""
    return {
        "total_blocks": audit_ledger.total_blocks,
        "blocks": audit_ledger.get_recent_blocks(limit=limit),
    }

@app.get("/api/audit/verify")
async def verify_audit_ledger():
    """Cryptographically verifies every block in the ledger chain from genesis."""
    is_valid, error = audit_ledger.verify_integrity()
    return {
        "valid": is_valid,
        "total_blocks": audit_ledger.total_blocks,
        "error": error,
        "status": "TAMPER_FREE_VERIFIED" if is_valid else "CORRUPTED_TAMPER_DETECTED",
    }

@app.post("/api/audit/tamper-test")
async def tamper_test():
    """Test endpoint demonstrating cryptographic detection if an adversary modifies a block."""
    if len(audit_ledger._chain) > 1:
        # Alter a block risk score directly
        audit_ledger._chain[1].risk_score = 12.34
        is_valid, err = audit_ledger.verify_integrity()
        return {"tamper_detected": not is_valid, "error_message": err}
    return {"message": "Need at least 2 blocks to run tamper test"}

# Mock n8n Webhook Receiver for standalone verification
mock_received_webhooks = []

@app.post("/api/test/n8n-mock")
async def mock_n8n_endpoint(request: Request):
    """Mock receiver that verifies incoming HMAC-SHA256 signatures."""
    raw_body = await request.body()
    received_signature = request.headers.get("X-Signature-SHA256", "")
    
    # Verify HMAC
    mac = hmac.new(config.n8n.hmac_secret.encode("utf-8"), raw_body, hashlib.sha256)
    expected_sig = mac.hexdigest()
    
    is_authentic = hmac.compare_digest(received_signature, expected_sig)
    payload = await request.json() if raw_body else {}
    mock_received_webhooks.append({
        "timestamp": time.time(),
        "is_authentic": is_authentic,
        "payload": payload,
    })
    return {"status": "received", "signature_valid": is_authentic}

@app.get("/api/test/n8n-mock/received")
async def get_mock_webhooks():
    return {"count": len(mock_received_webhooks), "items": mock_received_webhooks[-10:]}

# Audio Streaming WebSocket Gateway
@app.websocket("/ws/audio/stream/{call_id}")
async def websocket_audio_stream(websocket: WebSocket, call_id: str):
    await media_gateway.handle_audio_stream(websocket, call_id=call_id)

# Monitoring Console WebSocket
@app.websocket("/ws/monitor")
async def websocket_monitor(websocket: WebSocket):
    await media_gateway.register_monitor(websocket)

# Static Dashboard Assets
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(static_dir, "index.html"))
