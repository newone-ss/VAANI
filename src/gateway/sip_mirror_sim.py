import math
import numpy as np
from typing import Generator, Tuple

class SIPMirrorSimulator:
    """
    PBX / SBC SIP Trunk Mirroring Simulator.
    Simulates mirrored RTP voice streams from enterprise PBX switches (e.g. Asterisk, FreeSWITCH, Cisco CUCM).
    Generates synthetic PCM streams representing:
    - Legitimate executive human voice (natural pitch jitter, formant resonance, organic dynamics)
    - AI-generated synthetic voice (HiFi-GAN/WaveGlow vocoder artifacts, rigid harmonics, high-frequency phase anomaly)
    - Replay attack audio (room impulse response coloration, acoustic double-path, DAC noise floor)
    - Ambient room noise / silence
    """

    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate

    def generate_human_voice(self, duration_sec: float = 2.0, base_f0: float = 125.0) -> np.ndarray:
        """
        Simulates authentic human executive speech with natural vocal cord vibrato,
        formant resonances (F1, F2, F3), and micro-jitter.
        """
        total_samples = int(self.sample_rate * duration_sec)
        t = np.linspace(0, duration_sec, total_samples, endpoint=False)

        # Micro-jitter & vocal vibrato (natural 5Hz modulation)
        jitter = 0.025 * np.sin(2 * np.pi * 5.2 * t) + 0.01 * np.random.randn(total_samples)
        f0_instant = base_f0 * (1.0 + jitter)
        phase = np.cumsum(2 * np.pi * f0_instant / self.sample_rate)

        # Vocal tract source signal (pulse train / glottal wave)
        glottal = np.sin(phase) + 0.5 * np.sin(2 * phase) + 0.25 * np.sin(3 * phase)

        # Formant filters (F1 ~ 500 Hz, F2 ~ 1500 Hz, F3 ~ 2500 Hz typical for male executive)
        f1_res = np.sin(2 * np.pi * 520 * t) * np.exp(-t % (1.0 / base_f0) * 400)
        f2_res = 0.6 * np.sin(2 * np.pi * 1550 * t) * np.exp(-t % (1.0 / base_f0) * 600)
        f3_res = 0.3 * np.sin(2 * np.pi * 2500 * t) * np.exp(-t % (1.0 / base_f0) * 800)

        raw = glottal * (1.0 + 0.7 * f1_res + 0.4 * f2_res + 0.2 * f3_res)
        # Organic speech envelope modulation (speaking cadence)
        cadence = 0.5 * (1.0 + np.sin(2 * np.pi * 2.5 * t))
        audio = raw * cadence * 0.7 + 0.015 * np.random.randn(total_samples)

        # Normalize to [-0.85, 0.85]
        audio = np.clip(audio, -1.0, 1.0) * 0.85
        return audio.astype(np.float32)

    def generate_deepfake_voice(self, duration_sec: float = 2.0, base_f0: float = 125.0) -> np.ndarray:
        """
        Simulates AI-synthesized deepfake voice (neural vocoder output e.g. HiFi-GAN, WaveGlow, Diffusion TTS).
        Key synthetic indicators:
        - Rigid fundamental pitch (near-zero organic jitter)
        - Sub-band aliasing and vocoder metallic phase discontinuities in 4 kHz - 8 kHz
        - Unnatural spectral flatness in high frequencies
        - Over-regular harmonic phase relationships
        """
        total_samples = int(self.sample_rate * duration_sec)
        t = np.linspace(0, duration_sec, total_samples, endpoint=False)

        # Unnatural, highly static f0 (TTS artifact)
        f0 = base_f0
        phase = 2 * np.pi * f0 * t

        # Add pure integer harmonics with rigid phase (common in pitch-synchronous overlap-add / neural vocoders)
        harmonics = np.zeros(total_samples, dtype=np.float32)
        for h in range(1, 16):
            harmonics += (1.0 / h) * np.sin(h * phase)

        # High-frequency vocoder artifacts: phase smearing and 6-7 kHz harmonic buzz
        vocoder_buzz = 0.22 * np.sin(2 * np.pi * 6400 * t) + 0.18 * np.cos(2 * np.pi * 7100 * t)
        vocoder_phase_glitch = 0.15 * np.sin(2 * np.pi * 4800 * t + np.sin(2 * np.pi * 80 * t))

        raw = (harmonics * 0.6 + vocoder_buzz + vocoder_phase_glitch)
        envelope = 0.5 * (1.0 + np.sin(2 * np.pi * 2.5 * t))
        audio = raw * envelope * 0.8

        return np.clip(audio, -1.0, 1.0).astype(np.float32)

    def generate_replay_attack(self, duration_sec: float = 2.0) -> np.ndarray:
        """
        Simulates replayed executive audio recorded from a loudspeaker/zoom recording and played into the mic.
        Characteristics:
        - Secondary acoustic room resonance (double reverberation)
        - High-frequency speaker roll-off (< 4 kHz band limit)
        - Electronic noise floor / microphone pre-amp hiss
        """
        human = self.generate_human_voice(duration_sec=duration_sec)
        total_samples = len(human)

        # Room impulse simulation (early reflections at 18ms and 42ms)
        delay1 = int(self.sample_rate * 0.018)
        delay2 = int(self.sample_rate * 0.042)
        replayed = human.copy()
        if total_samples > delay1:
            replayed[delay1:] += 0.35 * human[:-delay1]
        if total_samples > delay2:
            replayed[delay2:] += 0.20 * human[:-delay2]

        # Speaker roll-off and microphone self-noise
        noise = 0.035 * np.random.randn(total_samples)
        replayed = replayed * 0.75 + noise
        return np.clip(replayed, -1.0, 1.0).astype(np.float32)

    def generate_silence(self, duration_sec: float = 1.0) -> np.ndarray:
        """Generates low-level comfort noise / background silence to test DSP VAD gating."""
        total_samples = int(self.sample_rate * duration_sec)
        noise = 0.002 * np.random.randn(total_samples)
        return noise.astype(np.float32)

    def frame_generator(
        self, 
        audio: np.ndarray, 
        frame_duration_ms: int = 50
    ) -> Generator[Tuple[bytes, np.ndarray], None, None]:
        """
        Slices audio into real-time streaming chunks.
        Yields (pcm16_bytes, float32_samples).
        """
        frame_samples = int((self.sample_rate * frame_duration_ms) / 1000)
        num_frames = len(audio) // frame_samples

        for i in range(num_frames):
            frame_slice = audio[i * frame_samples : (i + 1) * frame_samples]
            # Convert float32 to int16 PCM
            pcm16 = (frame_slice * 32767.0).astype(np.int16).tobytes()
            yield pcm16, frame_slice
