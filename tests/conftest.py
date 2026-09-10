"""
Shared pytest configuration, fixtures, and audio frame generators for BiTe_me test suite.
"""
from pathlib import Path
from typing import Callable
import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.core.config import config
from backend.server import app, media_gateway


@pytest.fixture(scope="session")
def fixtures_dir() -> Path:
    """Returns path to tests/fixtures directory."""
    p = Path(__file__).parent / "fixtures"
    p.mkdir(parents=True, exist_ok=True)
    return p


@pytest.fixture(scope="session")
def sample_rate() -> int:
    """Default system audio sample rate (16 kHz)."""
    return config.audio.sample_rate


@pytest.fixture
def pcm16_frame_generator() -> Callable[..., bytes]:
    """
    Factory fixture providing a deterministic 16-bit linear PCM audio frame generator.
    By default generates an 800-sample (50ms @ 16kHz) mono frame.
    """
    def _generate(
        frequency_hz: float = 200.0,
        amplitude: float = 0.5,
        num_samples: int = 800,
        sample_rate: int = 16000,
    ) -> bytes:
        t = np.linspace(0, num_samples / float(sample_rate), num_samples, endpoint=False)
        audio = amplitude * (np.sin(2 * np.pi * frequency_hz * t) + 0.3 * np.sin(2 * np.pi * frequency_hz * 2 * t))
        audio = np.clip(audio, -1.0, 1.0)
        return (audio * 32767).astype(np.int16).tobytes()

    return _generate


@pytest.fixture
def test_client() -> TestClient:
    """FastAPI TestClient fixture bound to the BiTe_me server application."""
    return TestClient(app)
