import os
from typing import Dict
from pydantic import BaseModel, Field

class AudioSettings(BaseModel):
    sample_rate: int = 16000
    channels: int = 1
    bytes_per_sample: int = 2  # 16-bit linear PCM
    frame_duration_ms: int = 50  # 50 ms frame = 800 samples = 1600 bytes
    ring_buffer_capacity_seconds: float = 3.0  # Max in-memory storage (zero disk write)
    analysis_window_frames: int = 10  # 500 ms context window

    @property
    def frame_samples(self) -> int:
        return int((self.sample_rate * self.frame_duration_ms) / 1000)

    @property
    def frame_bytes(self) -> int:
        return self.frame_samples * self.bytes_per_sample

class DSPGateSettings(BaseModel):
    energy_threshold: float = 0.012  # RMS energy cutoff for silence
    zero_crossing_rate_min: float = 0.008
    zero_crossing_rate_max: float = 0.60
    spectral_flatness_threshold: float = 0.45  # Detects unvoiced or white noise
    snr_floor_db: float = 6.0  # Signal-to-noise ratio floor

class NonInvertibleSpeakerSettings(BaseModel):
    feature_dim: int = 64
    projection_dim: int = 128
    projection_seed: int = 429496729  # Enterprise-wide salt for non-invertible mapping
    consistency_threshold: float = 0.72  # Minimum cosine similarity on projected template

class PolicySettings(BaseModel):
    # Tier thresholds
    threshold_monitor: float = 30.0
    threshold_warn_analyst: float = 60.0
    threshold_step_up_mfa: float = 75.0
    threshold_active_hold: float = 90.0

    # Decision smoothing
    ema_alpha: float = 0.28  # Weight for current frame vs historical trend
    smoothing_window_size: int = 12  # Rolling window frame count

class N8NDispatcherSettings(BaseModel):
    webhook_url: str = os.getenv("N8N_WEBHOOK_URL", "http://localhost:5678/webhook/voice-threat")
    hmac_secret: str = os.getenv("N8N_HMAC_SECRET", "byte-me-security-enterprise-hmac-key-2026")
    dispatch_timeout_sec: float = 0.25  # Sub-250ms cold path dispatch SLA
    enabled: bool = True

class AppConfig(BaseModel):
    app_name: str = "BiTe_me: Real-Time Voice Impersonation Detection Engine"
    version: str = "1.0.0"
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    max_decision_latency_ms: float = 300.0  # Hard budget: < 300 ms

    audio: AudioSettings = Field(default_factory=AudioSettings)
    dsp: DSPGateSettings = Field(default_factory=DSPGateSettings)
    speaker: NonInvertibleSpeakerSettings = Field(default_factory=NonInvertibleSpeakerSettings)
    policy: PolicySettings = Field(default_factory=PolicySettings)
    n8n: N8NDispatcherSettings = Field(default_factory=N8NDispatcherSettings)

config = AppConfig()
