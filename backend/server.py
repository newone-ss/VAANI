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

from backend.core.config import config
from backend.gateway.ring_buffer import AudioRingBuffer
from backend.gateway.sip_mirror_sim import SIPMirrorSimulator
from backend.gateway.ws_server import MediaGatewayServer
from backend.inference.dsp_gate import DSPGate
from backend.inference.anti_spoofing_ensemble import AntiSpoofingEnsemble
from backend.inference.non_invertible_speaker import NonInvertibleSpeakerVerifier
from backend.policy.policy_engine import PolicyEngine
from backend.policy.n8n_dispatcher import N8NDispatcher
from backend.policy.audit_ledger import AuditLedger

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

@app.post("/api/speaker/enroll-session/{call_id}")
async def enroll_speaker_session(call_id: str, speaker_id: str = "CEO_EXEC_01"):
    """Dynamically enrolls the speaker using live speech currently in the call's buffer."""
    success = media_gateway.enroll_speaker_from_buffer(call_id=call_id, speaker_id=speaker_id)
    if not success:
        raise HTTPException(status_code=400, detail="Insufficient speech in session buffer. Please speak clearly for at least 1-2 seconds.")
    return {"status": "ENROLLED", "call_id": call_id, "speaker_id": speaker_id}

# Audio Streaming WebSocket Gateway
@app.websocket("/ws/audio/stream/{call_id}")
async def websocket_audio_stream(websocket: WebSocket, call_id: str):
    await media_gateway.handle_audio_stream(websocket, call_id=call_id)

# Monitoring Console WebSocket
@app.websocket("/ws/monitor")
async def websocket_monitor(websocket: WebSocket):
    await media_gateway.register_monitor(websocket)

# Frontend Assets & HTML Pages
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
frontend_dir = os.path.join(project_root, "frontend")
pages_dir = os.path.join(frontend_dir, "pages")
assets_dir = os.path.join(frontend_dir, "assets")

if os.path.exists(assets_dir):
    # Backward compatibility aliases for legacy flat paths
    @app.get("/static/style.css")
    @app.get("/assets/style.css")
    async def legacy_style_css():
        css_path = os.path.join(assets_dir, "css", "style.css")
        if os.path.exists(css_path):
            return FileResponse(css_path)
        raise HTTPException(status_code=404, detail="style.css not found")

    @app.get("/static/app.js")
    @app.get("/assets/app.js")
    async def legacy_app_js():
        js_path = os.path.join(assets_dir, "js", "app.js")
        if os.path.exists(js_path):
            return FileResponse(js_path)
        raise HTTPException(status_code=404, detail="app.js not found")

    # Mount frontend assets at /assets, plus /static for full backward compatibility
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    app.mount("/static", StaticFiles(directory=assets_dir), name="static")

if os.path.exists(pages_dir):
    @app.get("/")
    async def serve_index():
        index_path = os.path.join(pages_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="index.html not found")

    @app.get("/softphone")
    async def serve_softphone():
        softphone_path = os.path.join(pages_dir, "softphone_capture.html")
        if os.path.exists(softphone_path):
            return FileResponse(softphone_path)
        raise HTTPException(status_code=404, detail="softphone_capture.html not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.server:app", host=config.host, port=config.port, reload=True)


