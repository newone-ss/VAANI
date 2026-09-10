import time
from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
import numpy as np

from .decision_smoothing import DecisionSmoother

class PolicyState(str, Enum):
    NORMAL = "NORMAL"                     # 0 - 29: Silent pass-through
    MONITOR = "MONITOR"                   # 30 - 59: High vigilance telemetry
    WARN_ANALYST = "WARN_ANALYST"         # 60 - 74: Analyst alert banner
    STEP_UP_MFA = "STEP_UP_MFA"           # 75 - 89: Intercept action, step-up MFA
    ACTIVE_HOLD = "ACTIVE_HOLD"           # 90 - 100: SIP Call Hold / PBX Block

class PolicyAction(str, Enum):
    ALLOW = "ALLOW"
    LOG_METADATA = "LOG_METADATA"
    DISPATCH_ALERT = "DISPATCH_ALERT"
    CHALLENGE_MFA = "CHALLENGE_MFA"
    TERMINATE_OR_HOLD = "TERMINATE_OR_HOLD"

@dataclass(frozen=True)
class PolicyDecision:
    state: PolicyState
    action: PolicyAction
    raw_risk_score: float
    smoothed_risk_score: float
    state_changed: bool
    reasons: List[str]
    latency_ms: float

class PolicyEngine:
    """
    Tiered Risk Policy State Machine with Hysteresis.
    Calibrates multi-modal inference inputs into an actionable security decision.
    Prevents flapping across tier boundaries using hysteresis offsets.
    """

    def __init__(
        self,
        threshold_monitor: float = 30.0,
        threshold_warn: float = 60.0,
        threshold_mfa: float = 75.0,
        threshold_hold: float = 90.0,
        hysteresis_margin: float = 4.0,
        smoothing_window: int = 12,
        ema_alpha: float = 0.28,
    ):
        self.threshold_monitor = threshold_monitor
        self.threshold_warn = threshold_warn
        self.threshold_mfa = threshold_mfa
        self.threshold_hold = threshold_hold
        self.hysteresis_margin = hysteresis_margin

        self.smoother = DecisionSmoother(window_size=smoothing_window, ema_alpha=ema_alpha)
        self.current_state = PolicyState.NORMAL

    def compute_frame_risk(
        self,
        spoof_probability: float,
        speaker_inconsistency_risk: float,
        dsp_anomaly: bool,
        spectral_flatness: float,
    ) -> Tuple[float, List[str]]:
        """
        Combines multi-modal signals into a calibrated raw risk score (0.0 to 100.0).
        Weights:
        - 50% Deep Neural Vocoder / Anti-spoofing Artifacts
        - 35% Non-invertible Speaker Verification Consistency
        - 15% DSP Spectral Anomaly / Energy Irregularities
        """
        reasons = []

        # 1. Anti-spoof component (50 pts max)
        spoof_component = spoof_probability * 50.0
        if spoof_probability > 0.60:
            reasons.append(f"Synthetic vocoder artifacts detected ({spoof_probability:.2f})")

        # 2. Speaker verification component (35 pts max)
        speaker_component = speaker_inconsistency_risk * 35.0
        if speaker_inconsistency_risk > 0.40:
            reasons.append(f"Speaker biometric template mismatch (Risk: {speaker_inconsistency_risk:.2f})")

        # 3. DSP anomaly component (15 pts max)
        dsp_score = 0.0
        if dsp_anomaly:
            dsp_score += 10.0
            reasons.append("Acoustic DSP anomaly flagged (high-frequency spectral tilt)")
        if spectral_flatness > 0.45:
            dsp_score += 5.0
            reasons.append("Abnormal spectral flatness / noise dispersion")

        raw_score = float(np.clip(spoof_component + speaker_component + dsp_score, 0.0, 100.0))
        return raw_score, reasons

    def evaluate(
        self,
        spoof_probability: float,
        speaker_inconsistency_risk: float,
        dsp_anomaly: bool,
        spectral_flatness: float,
    ) -> PolicyDecision:
        """
        Evaluates current audio frame through smoothing and the tiered state machine.
        Executes in under 2 ms.
        """
        t_start = time.perf_counter()

        raw_risk, reasons = self.compute_frame_risk(
            spoof_probability=spoof_probability,
            speaker_inconsistency_risk=speaker_inconsistency_risk,
            dsp_anomaly=dsp_anomaly,
            spectral_flatness=spectral_flatness,
        )

        smoothed_risk = self.smoother.smooth(raw_risk)

        # State transition evaluation with hysteresis
        previous_state = self.current_state
        new_state = self._determine_state_with_hysteresis(smoothed_risk, previous_state)
        self.current_state = new_state

        action = self._state_to_action(new_state)
        state_changed = (new_state != previous_state)

        latency_ms = (time.perf_counter() - t_start) * 1000.0

        return PolicyDecision(
            state=new_state,
            action=action,
            raw_risk_score=raw_risk,
            smoothed_risk_score=smoothed_risk,
            state_changed=state_changed,
            reasons=reasons,
            latency_ms=latency_ms,
        )

    def _determine_state_with_hysteresis(self, score: float, current: PolicyState) -> PolicyState:
        """
        Evaluates state transition with hysteresis to eliminate fluttering near thresholds.
        Escalation occurs immediately when crossing a boundary.
        De-escalation requires score to drop below (threshold - hysteresis_margin).
        """
        # 1. Escalation check
        if score >= self.threshold_hold:
            return PolicyState.ACTIVE_HOLD
        elif score >= self.threshold_mfa:
            if current == PolicyState.ACTIVE_HOLD and score >= (self.threshold_hold - self.hysteresis_margin):
                return PolicyState.ACTIVE_HOLD
            return PolicyState.STEP_UP_MFA
        elif score >= self.threshold_warn:
            if current == PolicyState.STEP_UP_MFA and score >= (self.threshold_mfa - self.hysteresis_margin):
                return PolicyState.STEP_UP_MFA
            return PolicyState.WARN_ANALYST
        elif score >= self.threshold_monitor:
            if current == PolicyState.WARN_ANALYST and score >= (self.threshold_warn - self.hysteresis_margin):
                return PolicyState.WARN_ANALYST
            return PolicyState.MONITOR
        else:
            # Below monitor threshold
            if current == PolicyState.MONITOR and score >= (self.threshold_monitor - self.hysteresis_margin):
                return PolicyState.MONITOR
            return PolicyState.NORMAL

    def _state_to_action(self, state: PolicyState) -> PolicyAction:
        if state == PolicyState.NORMAL:
            return PolicyAction.ALLOW
        elif state == PolicyState.MONITOR:
            return PolicyAction.LOG_METADATA
        elif state == PolicyState.WARN_ANALYST:
            return PolicyAction.DISPATCH_ALERT
        elif state == PolicyState.STEP_UP_MFA:
            return PolicyAction.CHALLENGE_MFA
        elif state == PolicyState.ACTIVE_HOLD:
            return PolicyAction.TERMINATE_OR_HOLD
        return PolicyAction.ALLOW

    def reset(self) -> None:
        self.smoother.reset()
        self.current_state = PolicyState.NORMAL
