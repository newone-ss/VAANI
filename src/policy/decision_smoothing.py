from collections import deque
from typing import List
import numpy as np

class DecisionSmoother:
    """
    Rolling Window Decision Smoothing Engine.
    Prevents single degraded frames (packet jitter, transient VoIP codec loss, cough)
    from triggering false-positive security escalations or abruptly dropping calls.
    
    Uses:
    1. Exponential Moving Average (EMA) with configurable adaptation rate (alpha).
    2. Sliding window anomaly density clustering.
    3. Transient spike dampener (requires multi-frame corroboration).
    """

    def __init__(self, window_size: int = 12, ema_alpha: float = 0.28):
        self.window_size = window_size
        self.ema_alpha = ema_alpha
        
        self._history: deque = deque(maxlen=window_size)
        self._current_ema: float = 0.0
        self._initialized: bool = False

    def smooth(self, raw_frame_risk: float) -> float:
        """
        Updates internal rolling window and returns smoothed risk score [0.0 - 100.0].
        """
        raw_frame_risk = float(np.clip(raw_frame_risk, 0.0, 100.0))

        if not self._initialized:
            self._current_ema = raw_frame_risk
            self._initialized = True
        else:
            # Exponential Moving Average update
            self._current_ema = (self.ema_alpha * raw_frame_risk) + ((1.0 - self.ema_alpha) * self._current_ema)

        self._history.append(raw_frame_risk)

        # Anomaly density: fraction of frames in sliding window > 50.0
        elevated_frames = sum(1 for r in self._history if r >= 50.0)
        density = elevated_frames / len(self._history)

        # If it's an isolated spike with zero history corroboration, dampen the impact
        if density <= 0.15 and raw_frame_risk > 65.0:
            smoothed_score = 0.7 * self._current_ema + 0.3 * np.median(list(self._history))
        else:
            # Multi-frame cluster corroborates threat: track EMA closely
            smoothed_score = self._current_ema

        return float(np.clip(smoothed_score, 0.0, 100.0))

    def reset(self) -> None:
        """Resets smoother state between calls."""
        self._history.clear()
        self._current_ema = 0.0
        self._initialized = False

    @property
    def history_count(self) -> int:
        return len(self._history)
