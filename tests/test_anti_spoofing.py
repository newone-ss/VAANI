import logging
import time
from pathlib import Path

import numpy as np
import pytest
import scipy.io.wavfile as wav
import scipy.signal

from backend.gateway.sip_mirror_sim import SIPMirrorSimulator
from backend.inference.anti_spoofing_ensemble import (
    TRANSFORMERS_AVAILABLE,
    AntiSpoofingEnsemble,
    HuggingFaceSpoofDetector,
)

logger = logging.getLogger("test_anti_spoofing")

FIXTURES_DIR = Path(__file__).parent / "fixtures"

def ensure_fixtures_exist():
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    media_dir = Path(r"C:\Windows\Media")
    sources = [
        ("genuine_speech_1.wav", media_dir / "Speech Off.wav"),
        ("genuine_speech_2.wav", media_dir / "Speech On.wav"),
        ("genuine_speech_3.wav", media_dir / "Speech Disambiguation.wav"),
    ]
    for target_name, src_path in sources:
        target_path = FIXTURES_DIR / target_name
        if not target_path.exists() and src_path.exists():
            import shutil
            shutil.copy(src_path, target_path)

    cloned_targets = [
        ("cloned_speech_1.wav", "Good morning, this is the chief executive officer calling to request an emergency wire transfer."),
        ("cloned_speech_2.wav", "Please transfer one million dollars to the offshore settlement account immediately."),
        ("cloned_speech_3.wav", "Authentication verified. Authorizing payment execution on high-priority security channel."),
    ]
    for target_name, text in cloned_targets:
        target_path = FIXTURES_DIR / target_name
        if not target_path.exists():
            try:
                import subprocess
                ps_script = f"""
                Add-Type -AssemblyName System.Speech
                $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
                $s.SetOutputToWaveFile('{target_path!s}')
                $s.Speak('{text}')
                $s.Dispose()
                """
                subprocess.run(["powershell", "-Command", ps_script], check=True)
            except (subprocess.SubprocessError, OSError) as e:
                logger.debug("Fixture creation skipped: %s", e)

ensure_fixtures_exist()

def load_audio_as_pcm16(filepath: Path, target_sr: int = 16000) -> bytes:
    """Loads a WAV file, converts to mono 16kHz float32, and returns PCM16 bytes."""
    sr, data = wav.read(str(filepath))
    if data.dtype == np.int16:
        audio = data.astype(np.float32) / 32768.0
    elif data.dtype == np.int32:
        audio = data.astype(np.float32) / 2147483648.0
    else:
        audio = data.astype(np.float32)

    # Downmix stereo to mono if needed
    if audio.ndim > 1:
        audio = np.mean(audio, axis=-1)

    # Resample to target sample rate
    if sr != target_sr:
        num_target_samples = int(len(audio) * target_sr / sr)
        audio = scipy.signal.resample(audio, num_target_samples)

    # Convert to PCM16
    pcm16 = np.clip(audio * 32767.0, -32768, 32767).astype(np.int16).tobytes()
    return pcm16


def simulate_g711_mulaw(pcm16_bytes: bytes) -> bytes:
    """
    Simulates ITU-T G.711 mu-law telephony companding degradation:
    1. Compands and quantizes 16-bit linear PCM to 8-bit mu-law.
    2. Expands 8-bit mu-law back to 16-bit linear PCM.
    """
    try:
        import audioop
        mulaw_bytes = audioop.lin2ulaw(pcm16_bytes, 2)
        return audioop.ulaw2lin(mulaw_bytes, 2)
    except (ImportError, OSError, ValueError):
        # High-fidelity NumPy mu-law simulation fallback
        samples = np.frombuffer(pcm16_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        mu = 255.0
        # Compression
        compressed = np.sign(samples) * np.log1p(mu * np.abs(samples)) / np.log1p(mu)
        # 8-bit Quantization (-128 to 127)
        quantized = np.clip(np.round(compressed * 127.0), -128, 127)
        # Expansion
        norm_quant = np.abs(quantized / 127.0)
        expanded = np.sign(quantized) * (1.0 / mu) * ((1.0 + mu) ** norm_quant - 1.0)
        return np.clip(expanded * 32767.0, -32768, 32767).astype(np.int16).tobytes()


@pytest.fixture(scope="module")
def audio_sim():
    return SIPMirrorSimulator(sample_rate=16000)


@pytest.fixture(scope="module")
def hf_detector():
    if not TRANSFORMERS_AVAILABLE:
        pytest.skip("transformers and torch are not installed")
    return HuggingFaceSpoofDetector()


def test_legacy_anti_spoofing_latency_under_35ms():
    """Verify legacy ensemble executes within sub-35ms budget."""
    ensemble = AntiSpoofingEnsemble(sample_rate=16000, backend="legacy")
    frame = np.random.randn(800).astype(np.float32) * 0.2
    res = ensemble.predict(frame)
    assert res.latency_ms < 35.0, f"Legacy inference latency {res.latency_ms}ms exceeds 35ms budget"


def test_legacy_anti_spoofing_detects_vocoder_buzz():
    """Verify legacy ensemble vocoder harmonic detection."""
    ensemble = AntiSpoofingEnsemble(sample_rate=16000, spoof_threshold=0.55, backend="legacy")
    t = np.linspace(0, 0.05, 800, endpoint=False)
    synthetic_vocoder = (
        np.sin(2 * np.pi * 120 * t) * 0.3 +
        np.sin(2 * np.pi * 6400 * t) * 0.45 +
        np.sin(2 * np.pi * 7200 * t) * 0.35
    ).astype(np.float32)

    res = ensemble.predict(synthetic_vocoder)
    assert res.spoof_probability > 0.50
    assert len(res.detected_artifacts) > 0


@pytest.mark.skipif(not TRANSFORMERS_AVAILABLE, reason="transformers not installed")
def test_huggingface_label_mapping(hf_detector):
    """
    Explicitly test and verify that model.config.id2label is parsed correctly
    and the spoof/fake index is not flipped.
    """
    assert hasattr(hf_detector, "id2label"), "Detector must expose id2label"
    assert hf_detector.id2label is not None
    print(f"\n[Label Mapping] Verified model.config.id2label: {hf_detector.id2label}")

    # Check that index 0 maps to real and 1 maps to fake in Gustking model
    assert hf_detector.id2label.get(0, "").lower() == "real", f"Expected label 0 to be 'real', got {hf_detector.id2label.get(0)}"
    assert hf_detector.id2label.get(1, "").lower() == "fake", f"Expected label 1 to be 'fake', got {hf_detector.id2label.get(1)}"
    assert hf_detector.fake_class_idx == 1, f"Expected fake_class_idx to be 1, got {hf_detector.fake_class_idx}"


@pytest.mark.skipif(not TRANSFORMERS_AVAILABLE, reason="transformers not installed")
def test_huggingface_accuracy_and_g711_shift(hf_detector):
    """
    Evaluates HuggingFaceSpoofDetector on genuine and synthetic/cloned audio clips,
    asserts classification accuracy, and measures G.711 mu-law degradation shift.
    """
    # 1. Genuine speech clips
    genuine_files = [
        ("genuine_speech_1", FIXTURES_DIR / "genuine_speech_1.wav"),
        ("genuine_speech_2", FIXTURES_DIR / "genuine_speech_2.wav"),
        ("genuine_speech_3", FIXTURES_DIR / "genuine_speech_3.wav"),
    ]

    # 2. Cloned / Synthetic speech clips
    cloned_files = [
        ("cloned_speech_1", FIXTURES_DIR / "cloned_speech_1.wav"),
        ("cloned_speech_2", FIXTURES_DIR / "cloned_speech_2.wav"),
        ("cloned_speech_3", FIXTURES_DIR / "cloned_speech_3.wav"),
    ]

    print("\n" + "=" * 80)
    print(f"{'CLIP ID':<22} | {'GROUND TRUTH':<12} | {'CLEAN SCORE':<12} | {'G.711 SCORE':<12} | {'SHIFT':<8}")
    print("=" * 80)

    shifts: list[float] = []
    threshold = 0.50
    correct_classifications = 0
    total_clips = len(genuine_files) + len(cloned_files)

    # Test Genuine Clips
    for clip_id, file_path in genuine_files:
        pcm_clean = load_audio_as_pcm16(file_path)
        pcm_g711 = simulate_g711_mulaw(pcm_clean)

        score_clean = hf_detector.predict(pcm_clean, sample_rate=16000)
        score_g711 = hf_detector.predict(pcm_g711, sample_rate=16000)
        shift = abs(score_g711 - score_clean)
        shifts.append(shift)

        print(f"{clip_id:<22} | {'GENUINE':<12} | {score_clean:<12.4f} | {score_g711:<12.4f} | {shift:<8.4f}")
        if score_clean < threshold:
            correct_classifications += 1

        assert score_clean < threshold, f"Genuine clip {clip_id} scored {score_clean:.4f}, expected < {threshold}"

    # Test Cloned Clips
    for clip_id, file_path in cloned_files:
        pcm_clean = load_audio_as_pcm16(file_path)
        pcm_g711 = simulate_g711_mulaw(pcm_clean)

        score_clean = hf_detector.predict(pcm_clean, sample_rate=16000)
        score_g711 = hf_detector.predict(pcm_g711, sample_rate=16000)
        shift = abs(score_g711 - score_clean)
        shifts.append(shift)

        print(f"{clip_id:<22} | {'CLONED':<12} | {score_clean:<12.4f} | {score_g711:<12.4f} | {shift:<8.4f}")
        if score_clean > threshold:
            correct_classifications += 1

        assert score_clean > threshold, f"Cloned clip {clip_id} scored {score_clean:.4f}, expected > {threshold}"

    accuracy = (correct_classifications / total_clips) * 100.0
    avg_shift = float(np.mean(shifts))
    max_shift = float(np.max(shifts))

    print("-" * 80)
    print(f"Classification Accuracy: {accuracy:.1f}% ({correct_classifications}/{total_clips} passed)")
    print(f"Average G.711 Degradation Score Shift: {avg_shift:.4f} ({avg_shift*100:.2f}%)")
    print(f"Maximum G.711 Degradation Score Shift: {max_shift:.4f} ({max_shift*100:.2f}%)")
    print("=" * 80)


@pytest.mark.skipif(not TRANSFORMERS_AVAILABLE, reason="transformers not installed")
def test_huggingface_inference_latency(hf_detector):
    """
    Measures per-call inference latency across streaming frames (50ms)
    and context windows (500ms) to evaluate against sub-60ms hot-path budget.
    """
    # Warm up model
    warmup_frame = (np.random.randn(800) * 1000).astype(np.int16).tobytes()
    hf_detector.predict(warmup_frame)

    # 1. Benchmark 50ms frames (800 samples)
    frame_50ms_latencies = []
    for _ in range(10):
        frame = (np.random.randn(800) * 1000).astype(np.int16).tobytes()
        t0 = time.perf_counter()
        _ = hf_detector.predict(frame)
        frame_50ms_latencies.append((time.perf_counter() - t0) * 1000.0)

    avg_50ms = float(np.mean(frame_50ms_latencies))
    min_50ms = float(np.min(frame_50ms_latencies))
    max_50ms = float(np.max(frame_50ms_latencies))

    # 2. Benchmark 500ms context windows (8000 samples)
    context_500ms_latencies = []
    for _ in range(5):
        frame = (np.random.randn(8000) * 1000).astype(np.int16).tobytes()
        t0 = time.perf_counter()
        _ = hf_detector.predict(frame)
        context_500ms_latencies.append((time.perf_counter() - t0) * 1000.0)

    avg_500ms = float(np.mean(context_500ms_latencies))

    print("\n" + "=" * 70)
    print("HUGGINGFACE SPOOF DETECTOR LATENCY BENCHMARK")
    print("=" * 70)
    print(f"50ms Frame (800 samples):   Avg: {avg_50ms:.2f} ms | Min: {min_50ms:.2f} ms | Max: {max_50ms:.2f} ms")
    print(f"500ms Context (8k samples): Avg: {avg_500ms:.2f} ms")
    print("Hot-path Budget: 60.0 ms")
    if avg_50ms <= 60.0:
        print("[Status] FITS inside the 60ms hot-path budget for 50ms frames.")
    else:
        print("[Status] EXCEEDS 60ms budget. Needs conditional invocation behind lightweight DSP gate.")
    print("=" * 70)


def test_ensemble_backend_switching():
    """Verify switching between 'huggingface' and 'legacy' backends via configuration."""
    # Legacy backend
    ens_legacy = AntiSpoofingEnsemble(sample_rate=16000, backend="legacy")
    assert ens_legacy.backend == "legacy"
    assert ens_legacy.hf_detector is None

    test_pcm = (np.random.randn(800) * 1000).astype(np.int16).tobytes()
    res_legacy = ens_legacy.predict(test_pcm)
    assert 0.0 <= res_legacy.spoof_probability <= 1.0

    # HuggingFace backend (if installed)
    if TRANSFORMERS_AVAILABLE:
        ens_hf = AntiSpoofingEnsemble(sample_rate=16000, backend="huggingface")
        assert ens_hf.backend == "huggingface"
        assert ens_hf.hf_detector is not None
        res_hf = ens_hf.predict(test_pcm)
        assert 0.0 <= res_hf.spoof_probability <= 1.0
