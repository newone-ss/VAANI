import numpy as np
import pytest
from src.inference.dsp_gate import DSPGate

def test_dsp_gate_latency_under_5ms():
    gate = DSPGate(sample_rate=16000)
    # 50ms frame = 800 samples
    frame = np.random.randn(800).astype(np.float32) * 0.1

    res = gate.evaluate(frame)
    assert res.latency_ms < 5.0, f"DSP gate latency {res.latency_ms}ms exceeds 5ms threshold"

def test_dsp_gate_silence_detection():
    gate = DSPGate(sample_rate=16000, energy_threshold=0.012)
    
    # Low energy background noise
    silence = np.random.randn(800).astype(np.float32) * 0.001
    res = gate.evaluate(silence)
    
    assert res.is_speech is False
    assert res.rms_energy < 0.005

def test_dsp_gate_active_speech_detection():
    gate = DSPGate(sample_rate=16000)
    
    # 150 Hz tone with harmonics (simulating voiced speech)
    t = np.linspace(0, 0.05, 800, endpoint=False)
    voice = (np.sin(2 * np.pi * 150 * t) + 0.5 * np.sin(2 * np.pi * 300 * t)) * 0.4
    
    res = gate.evaluate(voice.astype(np.float32))
    assert res.is_speech is True
    assert res.rms_energy > 0.1
    assert res.zero_crossing_rate > 0.01
    assert res.zero_crossing_rate < 0.30

def test_dsp_gate_vocoder_anomaly_flag():
    gate = DSPGate(sample_rate=16000)
    
    # Unnatural 6500 Hz high frequency tone (vocoder buzz)
    t = np.linspace(0, 0.05, 800, endpoint=False)
    anomaly_sound = (np.sin(2 * np.pi * 200 * t) * 0.3 + np.sin(2 * np.pi * 6500 * t) * 0.5).astype(np.float32)
    
    res = gate.evaluate(anomaly_sound)
    assert res.high_freq_ratio > 0.28 or res.dsp_anomaly_flag is True
