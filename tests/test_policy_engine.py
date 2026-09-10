import pytest
from backend.policy.policy_engine import PolicyEngine, PolicyState, PolicyAction

def test_policy_engine_escalation_tiers():
    engine = PolicyEngine(
        threshold_monitor=30.0,
        threshold_warn=60.0,
        threshold_mfa=75.0,
        threshold_hold=90.0,
        smoothing_window=3,
        ema_alpha=0.9,  # Fast tracking for testing
    )

    # 1. Clean frame
    d1 = engine.evaluate(spoof_probability=0.05, speaker_inconsistency_risk=0.05, dsp_anomaly=False, spectral_flatness=0.1)
    assert d1.state == PolicyState.NORMAL
    assert d1.action == PolicyAction.ALLOW

    # 2. Moderate threat (Monitor tier)
    d2 = engine.evaluate(spoof_probability=0.45, speaker_inconsistency_risk=0.3, dsp_anomaly=False, spectral_flatness=0.2)
    assert d2.smoothed_risk_score >= 30.0

    # 3. High threat (Step up MFA or Active Hold)
    # Consecutive heavy deepfake frames
    for _ in range(3):
        d_fake = engine.evaluate(spoof_probability=0.95, speaker_inconsistency_risk=0.90, dsp_anomaly=True, spectral_flatness=0.55)

    assert d_fake.state in (PolicyState.STEP_UP_MFA, PolicyState.ACTIVE_HOLD)
    assert d_fake.smoothed_risk_score >= 75.0

def test_decision_smoothing_prevents_single_glitch_escalation():
    # Use standard smoothing
    engine = PolicyEngine(smoothing_window=12, ema_alpha=0.25)

    # 5 frames of normal conversation
    for _ in range(5):
        engine.evaluate(spoof_probability=0.05, speaker_inconsistency_risk=0.05, dsp_anomaly=False, spectral_flatness=0.1)

    assert engine.current_state == PolicyState.NORMAL

    # One single network drop / glitch frame with high anomaly
    glitch_decision = engine.evaluate(
        spoof_probability=0.85, 
        speaker_inconsistency_risk=0.80, 
        dsp_anomaly=True, 
        spectral_flatness=0.5
    )

    # Thanks to rolling window smoothing, a single transient frame should NOT trigger ACTIVE_HOLD
    assert glitch_decision.state != PolicyState.ACTIVE_HOLD
    assert glitch_decision.smoothed_risk_score < 75.0
