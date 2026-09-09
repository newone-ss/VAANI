import numpy as np
import pytest
from src.inference.anti_spoofing_ensemble import AntiSpoofingEnsemble

def test_anti_spoofing_latency_under_35ms():
    ensemble = AntiSpoofingEnsemble(sample_rate=16000)
    frame = np.random.randn(800).astype(np.float32) * 0.2

    res = ensemble.predict(frame)
    assert res.latency_ms < 35.0, f"Inference latency {res.latency_ms}ms exceeds 35ms budget"

def test_anti_spoofing_detects_vocoder_buzz():
    ensemble = AntiSpoofingEnsemble(sample_rate=16000, spoof_threshold=0.55)
    
    # Generate high frequency vocoder harmonic artifact
    t = np.linspace(0, 0.05, 800, endpoint=False)
    synthetic_vocoder = (
        np.sin(2 * np.pi * 120 * t) * 0.3 + 
        np.sin(2 * np.pi * 6400 * t) * 0.45 +
        np.sin(2 * np.pi * 7200 * t) * 0.35
    ).astype(np.float32)

    res = ensemble.predict(synthetic_vocoder)
    assert res.spoof_probability > 0.50
    assert len(res.detected_artifacts) > 0
