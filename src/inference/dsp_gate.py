import time
from dataclasses import dataclass
from typing import Tuple
import numpy as np

@dataclass(frozen=True)
class DSPResult:
    is_speech: bool
    rms_energy: float
    zero_crossing_rate: float
    spectral_centroid: float
    spectral_flatness: float
    high_freq_ratio: float
    estimated_snr_db: float
    dsp_anomaly_flag: bool
    latency_ms: float

class DSPGate:
    """
    Sub-5ms Digital Signal Processing Gate.
    Functions:
    1. VAD (Voice Activity Detection) to drop silence instantly, preserving expensive GPU/CPU neural compute.
    2. Real-time extraction of spectral statistics (energy, ZCR, centroid, flatness, SNR).
    3. Fast vocoder anomaly heuristic to conditionally trigger the heavy anti-spoofing DNN.
    """

    def __init__(
        self,
        sample_rate: int = 16000,
        energy_threshold: float = 0.012,
        zcr_min: float = 0.008,
        zcr_max: float = 0.60,
        spectral_flatness_threshold: float = 0.45,
        snr_floor_db: float = 6.0,
    ):
        self.sample_rate = sample_rate
        self.energy_threshold = energy_threshold
        self.zcr_min = zcr_min
        self.zcr_max = zcr_max
        self.spectral_flatness_threshold = spectral_flatness_threshold
        self.snr_floor_db = snr_floor_db
        self.noise_floor_estimate = 0.005

    def evaluate(self, audio_frame: np.ndarray) -> DSPResult:
        """
        Evaluates an audio frame (20-100 ms) in under 3 ms.
        """
        t_start = time.perf_counter()

        n_samples = len(audio_frame)
        if n_samples == 0:
            return DSPResult(
                is_speech=False,
                rms_energy=0.0,
                zero_crossing_rate=0.0,
                spectral_centroid=0.0,
                spectral_flatness=0.0,
                high_freq_ratio=0.0,
                estimated_snr_db=0.0,
                dsp_anomaly_flag=False,
                latency_ms=(time.perf_counter() - t_start) * 1000.0,
            )

        # 1. RMS Energy
        rms = float(np.sqrt(np.mean(np.square(audio_frame)) + 1e-12))

        # Update running noise floor on very quiet frames
        if rms < self.energy_threshold * 0.5:
            self.noise_floor_estimate = 0.95 * self.noise_floor_estimate + 0.05 * rms

        snr_db = float(20.0 * np.log10((rms + 1e-6) / (self.noise_floor_estimate + 1e-6)))

        # 2. Zero Crossing Rate
        zero_crossings = np.sum(np.abs(np.diff(np.signbit(audio_frame))))
        zcr = float(zero_crossings / (n_samples - 1))

        # 3. FFT & Spectral Statistics
        # Use fast real FFT
        fft_complex = np.fft.rfft(audio_frame)
        power_spectrum = np.abs(fft_complex) ** 2
        total_power = np.sum(power_spectrum) + 1e-12
        freq_bins = np.fft.rfftfreq(n_samples, d=1.0 / self.sample_rate)

        # Spectral Centroid (mean frequency weighted by power)
        spectral_centroid = float(np.sum(freq_bins * power_spectrum) / total_power)

        # Spectral Flatness (Wiener entropy = geometric mean / arithmetic mean)
        # Higher values near 1.0 indicate white noise or vocoder phase dispersion
        log_power = np.log(power_spectrum + 1e-12)
        geom_mean = np.exp(np.mean(log_power))
        arith_mean = np.mean(power_spectrum) + 1e-12
        spectral_flatness = float(np.clip(geom_mean / arith_mean, 0.0, 1.0))

        # High-frequency band power ratio (> 4000 Hz)
        high_freq_mask = freq_bins >= 4000.0
        high_freq_power = np.sum(power_spectrum[high_freq_mask])
        high_freq_ratio = float(high_freq_power / total_power)

        # Voice Activity Decision (VAD)
        is_speech = (rms >= self.energy_threshold) and (zcr >= self.zcr_min) and (zcr <= self.zcr_max)

        # Fast anomaly heuristic: Unnatural vocoder energy or phase smearing
        # Vocoders often inject unnatural energy > 4kHz or display elevated spectral flatness during voiced segments
        dsp_anomaly = False
        if is_speech:
            if high_freq_ratio > 0.28:
                dsp_anomaly = True
            elif spectral_flatness > self.spectral_flatness_threshold and rms > 0.05:
                dsp_anomaly = True
            elif spectral_centroid > 3200.0:
                dsp_anomaly = True

        latency_ms = (time.perf_counter() - t_start) * 1000.0

        return DSPResult(
            is_speech=is_speech,
            rms_energy=rms,
            zero_crossing_rate=zcr,
            spectral_centroid=spectral_centroid,
            spectral_flatness=spectral_flatness,
            high_freq_ratio=high_freq_ratio,
            estimated_snr_db=snr_db,
            dsp_anomaly_flag=dsp_anomaly,
            latency_ms=latency_ms,
        )
