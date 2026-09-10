import logging
import os
import time
from dataclasses import dataclass

import numpy as np

logger = logging.getLogger(__name__)

# Try importing onnxruntime if installed, else fallback to vectorized neural engine
try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False

# Try importing transformers and torch
try:
    import torch
    from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

@dataclass(frozen=True)
class SpoofInferenceResult:
    spoof_probability: float  # 0.0 (authentic) to 1.0 (deepfake)
    is_spoof: bool
    confidence: float
    detected_artifacts: list[str]
    latency_ms: float

class HuggingFaceSpoofDetector:
    """
    Pretrained Wav2Vec2-XLSR Deepfake Audio Classifier.
    Default model: Gustking/wav2vec2-large-xlsr-deepfake-audio-classification
    (Wav2Vec2-XLSR-53 base, fine-tuned for deepfake voice classification, 4.01% EER on ASVspoof2019 eval).
    """

    def __init__(
        self,
        model_name_or_path: str = "Gustking/wav2vec2-large-xlsr-deepfake-audio-classification",
        device: str | None = None,
    ):
        if not TRANSFORMERS_AVAILABLE:
            raise ImportError(
                "transformers and torch are required for HuggingFaceSpoofDetector. "
                "Install them via `pip install transformers torch torchaudio`."
            )

        self.model_name_or_path = model_name_or_path
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device

        logger.info(f"[HuggingFaceSpoofDetector] Initializing model from '{self.model_name_or_path}' on device '{self.device}'...")
        self.feature_extractor = AutoFeatureExtractor.from_pretrained(self.model_name_or_path)
        self.model = AutoModelForAudioClassification.from_pretrained(self.model_name_or_path)
        self.model.to(self.device)
        self.model.eval()

        # Explicitly read and log model.config.id2label on startup
        self.id2label: dict[int, str] = {}
        raw_id2label = getattr(self.model.config, "id2label", None)
        if raw_id2label:
            self.id2label = {int(k): str(v) for k, v in raw_id2label.items()}
        else:
            self.id2label = {0: "real", 1: "fake"}

        logger.info(f"[HuggingFaceSpoofDetector] Confirmed model.config.id2label: {self.id2label}")

        # Verify which class index corresponds to "fake" / "spoof" / "synthetic"
        self.fake_class_idx: int | None = None
        for idx, label in self.id2label.items():
            label_lower = label.lower()
            if any(term in label_lower for term in ["fake", "spoof", "synthetic", "clone"]):
                self.fake_class_idx = idx
                break

        if self.fake_class_idx is None:
            raw_label2id = getattr(self.model.config, "label2id", {})
            for lbl, idx in raw_label2id.items():
                if any(term in lbl.lower() for term in ["fake", "spoof", "synthetic", "clone"]):
                    self.fake_class_idx = int(idx)
                    break

        if self.fake_class_idx is None:
            logger.warning(
                f"[HuggingFaceSpoofDetector] Could not automatically identify fake/spoof class in id2label: {self.id2label}. "
                "Defaulting fake_class_idx to index 1."
            )
            self.fake_class_idx = 1
        else:
            logger.info(
                f"[HuggingFaceSpoofDetector] Verified fake/spoof class index: {self.fake_class_idx} "
                f"(label: '{self.id2label.get(self.fake_class_idx, 'unknown')}')"
            )

    def predict(self, pcm16_bytes: bytes | np.ndarray, sample_rate: int = 16000) -> float:
        """
        Inference method matching drop-in signature:
        predict(pcm16_bytes: bytes, sample_rate: int = 16000) -> float.

        Converts incoming PCM16 bytes to a normalized float32 waveform (int16 / 32768.0)
        before passing to the feature extractor.
        Returns the spoof-class probability (softmax output), not raw logits.
        """
        if isinstance(pcm16_bytes, bytes):
            waveform = np.frombuffer(pcm16_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        elif isinstance(pcm16_bytes, np.ndarray):
            if np.issubdtype(pcm16_bytes.dtype, np.integer):
                waveform = pcm16_bytes.astype(np.float32) / 32768.0
            else:
                waveform = pcm16_bytes.astype(np.float32)
        else:
            raise TypeError(f"Expected bytes or np.ndarray, got {type(pcm16_bytes)}")

        waveform = np.squeeze(waveform)
        if waveform.ndim == 0 or len(waveform) == 0:
            return 0.0

        inputs = self.feature_extractor(
            waveform,
            sampling_rate=sample_rate,
            return_tensors="pt"
        )
        input_values = inputs.input_values.to(self.device)

        with torch.no_grad():
            outputs = self.model(input_values)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1)
            spoof_prob = float(probs[0, self.fake_class_idx].item())

        return float(np.clip(spoof_prob, 0.0, 1.0))

class AntiSpoofingEnsemble:
    """
    Anti-Spoofing Detection Engine.
    Supports two backends configurable via feature flag:
      - 'huggingface': Gustking Wav2Vec2-XLSR deepfake audio classification
      - 'legacy': Heuristic & ONNX vocoder acoustic ensemble
    """

    def __init__(
        self,
        sample_rate: int = 16000,
        model_path: str | None = None,
        spoof_threshold: float = 0.50,
        backend: str | None = None,
        hf_model_name: str | None = None,
    ):
        self.sample_rate = sample_rate
        self.spoof_threshold = spoof_threshold

        # Feature flag resolution
        if backend is not None:
            self.backend = backend.lower()
        else:
            try:
                from config import config
                self.backend = getattr(config, "anti_spoof_backend", os.getenv("ANTI_SPOOF_BACKEND", "huggingface")).lower()
            except (ImportError, AttributeError):
                self.backend = os.getenv("ANTI_SPOOF_BACKEND", "huggingface").lower()

        self.hf_detector: HuggingFaceSpoofDetector | None = None
        self.session: ort.InferenceSession | None = None

        if self.backend == "huggingface":
            if TRANSFORMERS_AVAILABLE:
                try:
                    model_target = hf_model_name or os.getenv(
                        "ANTI_SPOOF_MODEL_NAME",
                        "Gustking/wav2vec2-large-xlsr-deepfake-audio-classification"
                    )
                    self.hf_detector = HuggingFaceSpoofDetector(model_name_or_path=model_target)
                except (RuntimeError, ValueError, OSError) as e:
                    logger.warning(f"Failed initializing HuggingFaceSpoofDetector ({e}). Falling back to legacy backend.")
                    self.backend = "legacy"
            else:
                logger.warning("transformers/torch not available. Falling back to legacy backend.")
                self.backend = "legacy"

        if self.backend == "legacy":
            # Load or initialize ONNX model if available
            if ONNX_AVAILABLE and model_path and os.path.exists(model_path):
                try:
                    opts = ort.SessionOptions()
                    opts.intra_op_num_threads = 2
                    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                    self.session = ort.InferenceSession(model_path, sess_options=opts, providers=["CPUExecutionProvider"])
                except (RuntimeError, ValueError, OSError):
                    self.session = None

            # Fixed Mel-scale filterbank weights (64 filters for 16kHz audio)
            self._mel_filters = self._build_mel_filters(n_fft=512, n_mels=64)

    def _build_mel_filters(self, n_fft: int = 512, n_mels: int = 64) -> np.ndarray:
        """Precomputes triangular Mel filterbank matrix."""
        low_freq = 80.0
        high_freq = self.sample_rate / 2.0
        
        def hz_to_mel(f):
            return 2595.0 * np.log10(1.0 + f / 700.0)
        def mel_to_hz(m):
            return 700.0 * (10.0 ** (m / 2595.0) - 1.0)

        mel_points = np.linspace(hz_to_mel(low_freq), hz_to_mel(high_freq), n_mels + 2)
        hz_points = mel_to_hz(mel_points)
        bin_points = np.floor((n_fft + 1) * hz_points / self.sample_rate).astype(int)

        n_bins = n_fft // 2 + 1
        filters = np.zeros((n_mels, n_bins), dtype=np.float32)
        for m in range(1, n_mels + 1):
            f_m_minus = bin_points[m - 1]
            f_m = bin_points[m]
            f_m_plus = bin_points[m + 1]

            for k in range(f_m_minus, f_m):
                if f_m != f_m_minus and k < n_bins:
                    filters[m - 1, k] = (k - f_m_minus) / (f_m - f_m_minus)
            for k in range(f_m, f_m_plus):
                if f_m_plus != f_m and k < n_bins:
                    filters[m - 1, k] = (f_m_plus - k) / (f_m_plus - f_m)

        return filters

    def extract_features(self, audio: np.ndarray) -> tuple[np.ndarray, np.ndarray, float]:
        """
        Extracts log Mel spectrogram and Phase Derivative (instantaneous frequency deviation).
        """
        # Ensure minimum length of 512 samples
        if len(audio) < 512:
            audio = np.pad(audio, (0, 512 - len(audio)))

        # Frame windowing
        window = np.hanning(512)
        stride = 256
        n_frames = max(1, (len(audio) - 512) // stride + 1)

        mel_energies = []
        phase_deviations = []

        prev_phase = None
        for i in range(n_frames):
            frame = audio[i * stride : i * stride + 512] * window
            fft_res = np.fft.rfft(frame)
            mag = np.abs(fft_res)
            phase = np.angle(fft_res)

            # Mel filter projection
            mel_frame = np.dot(self._mel_filters, mag)
            log_mel = np.log(np.maximum(mel_frame, 1e-6))
            mel_energies.append(log_mel)

            # Phase derivative / group delay across frames
            if prev_phase is not None:
                d_phase = np.unwrap(phase - prev_phase)
                phase_deviations.append(np.std(d_phase))
            prev_phase = phase

        mel_matrix = np.array(mel_energies)  # Shape: (frames, 64)
        mean_phase_jitter = float(np.mean(phase_deviations)) if phase_deviations else 0.5
        return mel_matrix, mag, mean_phase_jitter

    def predict(self, audio_frame: np.ndarray | bytes) -> SpoofInferenceResult:
        """
        Executes anti-spoofing inference.
        """
        t_start = time.perf_counter()
        artifacts: list[str] = []

        if self.backend == "huggingface" and self.hf_detector is not None:
            spoof_prob = self.hf_detector.predict(audio_frame, sample_rate=self.sample_rate)
            if spoof_prob >= self.spoof_threshold:
                artifacts.append("WAV2VEC2_XLSR_DEEPFAKE_DETECTED")
        else:
            # Prepare float32 numpy array
            if isinstance(audio_frame, bytes):
                audio_np = np.frombuffer(audio_frame, dtype=np.int16).astype(np.float32) / 32768.0
            elif isinstance(audio_frame, np.ndarray) and np.issubdtype(audio_frame.dtype, np.integer):
                audio_np = audio_frame.astype(np.float32) / 32768.0
            else:
                audio_np = audio_frame

            mel_features, last_mag, phase_jitter = self.extract_features(audio_np)

            if self.session is not None:
                try:
                    input_tensor = mel_features[np.newaxis, np.newaxis, :, :].astype(np.float32)
                    input_name = self.session.get_inputs()[0].name
                    raw_out = self.session.run(None, {input_name: input_tensor})[0]
                    spoof_prob = float(raw_out[0][1])  # Class 1: spoof
                except (RuntimeError, ValueError, IndexError):
                    spoof_prob = self._heuristic_ensemble_scorer(mel_features, last_mag, phase_jitter, artifacts)
            else:
                spoof_prob = self._heuristic_ensemble_scorer(mel_features, last_mag, phase_jitter, artifacts)

        spoof_prob = float(np.clip(spoof_prob, 0.0, 1.0))
        is_spoof = spoof_prob >= self.spoof_threshold
        confidence = abs(spoof_prob - 0.5) * 2.0

        latency_ms = (time.perf_counter() - t_start) * 1000.0

        return SpoofInferenceResult(
            spoof_probability=spoof_prob,
            is_spoof=is_spoof,
            confidence=confidence,
            detected_artifacts=artifacts,
            latency_ms=latency_ms,
        )

    def _heuristic_ensemble_scorer(
        self, 
        mel: np.ndarray, 
        mag: np.ndarray, 
        phase_jitter: float, 
        artifacts: list[str]
    ) -> float:
        """
        Acoustic heuristic ensemble calibrated to detect neural vocoder signatures:
        1. High-frequency phase rigidity vs organic speech micro-jitter
        2. High-band energy ratio (4 kHz - 8 kHz)
        3. Formant variance across frames
        """
        score = 0.08  # Baseline natural prior

        # 1. Check phase jitter: Vocoders often exhibit rigid or unnatural phase structures
        if phase_jitter < 0.25:
            score += 0.35
            artifacts.append("UNNATURAL_PHASE_RIGIDITY")
        elif phase_jitter > 2.8:
            score += 0.30
            artifacts.append("HIGH_FREQ_PHASE_SMEARING")

        # 2. Check high-frequency harmonic energy (vocoder buzz in bins 128+)
        if len(mag) > 128:
            high_band = mag[128:]
            low_band = mag[:128]
            high_ratio = np.sum(high_band) / (np.sum(low_band) + 1e-8)
            if high_ratio > 0.20:
                score += 0.45
                artifacts.append("VOCODER_HIGH_BAND_BUZZ")

        # 3. Spectral contrast between adjacent Mel channels
        if len(mel) > 0:
            mel_diff = np.abs(np.diff(mel, axis=-1))
            if np.mean(mel_diff) < 0.15:
                score += 0.20
                artifacts.append("MEL_SMOOTHING_ARTIFACT")

        return float(np.clip(score, 0.0, 0.99))
