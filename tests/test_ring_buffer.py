import numpy as np
import pytest
from backend.gateway.ring_buffer import AudioRingBuffer

def test_ring_buffer_initialization():
    ring = AudioRingBuffer(sample_rate=16000, capacity_seconds=2.0)
    assert ring.capacity == 32000
    assert ring.total_samples_written == 0

def test_ring_buffer_push_and_extract():
    ring = AudioRingBuffer(sample_rate=16000, capacity_seconds=1.0)
    
    # 50ms frame at 16kHz = 800 samples
    samples = np.linspace(-0.5, 0.5, 800, dtype=np.float32)
    pushed = ring.push_samples(samples)
    assert pushed == 800
    assert ring.total_samples_written == 800

    extracted = ring.get_latest_frame(800)
    assert len(extracted) == 800
    np.testing.assert_allclose(extracted, samples, atol=1e-5)

def test_ring_buffer_pcm16_conversion():
    ring = AudioRingBuffer(sample_rate=16000, capacity_seconds=1.0)
    
    # Create 16-bit PCM bytes: 100 samples
    int16_data = np.array([0, 16384, -16384, 32767, -32768], dtype=np.int16)
    pcm_bytes = int16_data.tobytes()

    ring.push_pcm16_bytes(pcm_bytes)
    assert ring.total_samples_written == 5

    extracted = ring.get_latest_frame(5)
    assert extracted[0] == pytest.approx(0.0, abs=1e-3)
    assert extracted[1] == pytest.approx(0.5, abs=1e-2)
    assert extracted[2] == pytest.approx(-0.5, abs=1e-2)

def test_ring_buffer_overflow_wrap():
    # Capacity: 1000 samples
    ring = AudioRingBuffer(sample_rate=1000, capacity_seconds=1.0)
    
    # Push 1500 samples
    samples = np.arange(1500, dtype=np.float32)
    ring.push_samples(samples)
    assert ring.total_samples_written == 1500

    # Buffer should hold only the latest 1000 samples [500..1499]
    latest = ring.get_latest_frame(1000)
    assert len(latest) == 1000
    assert latest[0] == pytest.approx(500.0, abs=1.0)
    assert latest[-1] == pytest.approx(1499.0, abs=1.0)

def test_ring_buffer_secure_clear():
    ring = AudioRingBuffer(sample_rate=16000, capacity_seconds=1.0)
    ring.push_samples(np.ones(500, dtype=np.float32))
    assert ring.total_samples_written == 500

    ring.clear()
    assert ring.total_samples_written == 0
    empty = ring.get_latest_frame(100)
    assert np.all(empty == 0.0)
