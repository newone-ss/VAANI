import threading
from typing import Optional
import numpy as np

class AudioRingBuffer:
    """
    In-memory bounded circular ring buffer for 16 kHz PCM audio.
    
    Privacy Compliance Guarantee:
    - Zero persistent disk writes.
    - Fixed memory footprint (allocated once at initialization).
    - Data older than capacity is overwritten automatically in RAM.
    - Zeroizes buffer explicitly upon session termination.
    """

    def __init__(self, sample_rate: int = 16000, capacity_seconds: float = 3.0):
        self.sample_rate = sample_rate
        self.capacity_samples = int(sample_rate * capacity_seconds)
        
        # Pre-allocated circular array of float32 samples normalized in [-1.0, 1.0]
        self._buffer = np.zeros(self.capacity_samples, dtype=np.float32)
        self._write_pos = 0
        self._total_samples_written = 0
        self._lock = threading.Lock()

    def push_pcm16_bytes(self, pcm_data: bytes) -> int:
        """
        Accepts raw 16-bit signed PCM mono bytes (16 kHz).
        Converts to normalized float32 [-1.0, 1.0] and writes into circular memory.
        """
        if not pcm_data:
            return 0

        # Cast byte stream to int16, then normalize to float32
        int16_samples = np.frombuffer(pcm_data, dtype=np.int16)
        if len(int16_samples) == 0:
            return 0
            
        float_samples = (int16_samples.astype(np.float32)) / 32768.0
        return self.push_samples(float_samples)

    def push_samples(self, samples: np.ndarray) -> int:
        """Pushes float32 numpy samples into the bounded circular buffer."""
        n = len(samples)
        total_input = n
        with self._lock:
            if n >= self.capacity_samples:
                # If incoming chunk exceeds buffer capacity, keep only the latest slice in RAM
                samples = samples[-self.capacity_samples:]
                self._buffer[:] = samples
                self._write_pos = 0
            else:
                space_at_end = self.capacity_samples - self._write_pos
                if n <= space_at_end:
                    self._buffer[self._write_pos : self._write_pos + n] = samples
                    self._write_pos = (self._write_pos + n) % self.capacity_samples
                else:
                    self._buffer[self._write_pos :] = samples[:space_at_end]
                    overflow = n - space_at_end
                    self._buffer[0 : overflow] = samples[space_at_end:]
                    self._write_pos = overflow

            self._total_samples_written += total_input
            return total_input

    def get_latest_frame(self, num_samples: int) -> np.ndarray:
        """
        Extracts the most recent `num_samples` contiguous audio frames.
        Returns a zero-padded array if fewer samples have been written.
        """
        with self._lock:
            available = min(self._total_samples_written, self.capacity_samples)
            if available == 0:
                return np.zeros(num_samples, dtype=np.float32)

            take = min(num_samples, available)
            # Reconstruct unwrapped tail
            idx_start = (self._write_pos - take) % self.capacity_samples
            if idx_start + take <= self.capacity_samples:
                out = self._buffer[idx_start : idx_start + take].copy()
            else:
                first_part = self._buffer[idx_start:]
                second_part = self._buffer[: (idx_start + take) % self.capacity_samples]
                out = np.concatenate([first_part, second_part])

            if len(out) < num_samples:
                # Left-pad with zeros if buffer hasn't accumulated target frame length yet
                pad = np.zeros(num_samples - len(out), dtype=np.float32)
                out = np.concatenate([pad, out])

            return out

    def has_sufficient_samples(self, num_samples: int) -> bool:
        """Checks if the buffer has accumulated at least `num_samples`."""
        with self._lock:
            return self._total_samples_written >= num_samples

    def clear(self) -> None:
        """Zeroizes buffer memory securely to guarantee complete privacy upon session teardown."""
        with self._lock:
            self._buffer.fill(0.0)
            self._write_pos = 0
            self._total_samples_written = 0

    @property
    def total_samples_written(self) -> int:
        return self._total_samples_written

    @property
    def capacity(self) -> int:
        return self.capacity_samples
