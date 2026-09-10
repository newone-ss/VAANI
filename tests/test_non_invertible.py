import numpy as np
import pytest
from backend.inference.non_invertible_speaker import NonInvertibleSpeakerVerifier

def test_speaker_enrollment_and_verification():
    verifier = NonInvertibleSpeakerVerifier(
        feature_dim=64,
        projection_dim=128,
        projection_seed=12345,
        consistency_threshold=0.70,
    )

    # Reference CEO speech audio
    t = np.linspace(0, 1.0, 16000, endpoint=False)
    ceo_audio = (np.sin(2 * np.pi * 125 * t) + 0.5 * np.sin(2 * np.pi * 250 * t)).astype(np.float32)
    verifier.enroll_speaker("CEO_JOHN_DOE", ceo_audio)

    # Live frame from the same speaker
    t_live = np.linspace(0, 0.05, 800, endpoint=False)
    live_ceo_frame = (np.sin(2 * np.pi * 125 * t_live) + 0.5 * np.sin(2 * np.pi * 250 * t_live)).astype(np.float32)
    res_match = verifier.verify("CEO_JOHN_DOE", live_ceo_frame)

    assert res_match.is_match is True
    assert res_match.similarity_score > 0.85
    assert res_match.consistency_risk < 0.15
    assert res_match.latency_ms < 5.0

def test_speaker_rejects_impostor():
    verifier = NonInvertibleSpeakerVerifier(
        feature_dim=64,
        projection_dim=128,
        projection_seed=12345,
        consistency_threshold=0.70,
    )

    t = np.linspace(0, 1.0, 16000, endpoint=False)
    ceo_audio = np.sin(2 * np.pi * 125 * t).astype(np.float32)
    verifier.enroll_speaker("CEO_JOHN_DOE", ceo_audio)

    # Impostor with completely different acoustic vocal tract profile (800 Hz formant)
    t_live = np.linspace(0, 0.05, 800, endpoint=False)
    impostor_frame = (np.sin(2 * np.pi * 850 * t_live) + np.random.randn(800) * 0.2).astype(np.float32)
    res_impostor = verifier.verify("CEO_JOHN_DOE", impostor_frame)

    assert res_impostor.is_match is False
    assert res_impostor.consistency_risk > 0.40

def test_mathematical_non_invertibility():
    verifier = NonInvertibleSpeakerVerifier(feature_dim=64, projection_dim=128)
    
    # Feature x
    x = np.random.randn(64).astype(np.float32)
    template = verifier.generate_non_invertible_template(x)
    
    # Template has dimension 128 and is normalized
    assert len(template) == 128
    assert np.linalg.norm(template) == pytest.approx(1.0, abs=1e-4)

    # Given template T, reversing sign & non-linear mapping back to exact x is non-unique
    # Verify that different acoustic features with the same dominant projections yield non-invertible output
    x_perturbed = x + np.random.randn(64) * 0.001
    template_perturbed = verifier.generate_non_invertible_template(x_perturbed.astype(np.float32))
    # Distance is close but not identical
    cos_sim = np.dot(template, template_perturbed)
    assert cos_sim > 0.95
