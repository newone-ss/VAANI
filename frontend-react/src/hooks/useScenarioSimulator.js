import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook to simulate scenarios (Legitimate CEO, AI Vocoder Clone, Replay Attack)
 * generating 16 kHz PCM16 frames in 50ms intervals.
 */
export function useScenarioSimulator() {
  const [activeScenario, setActiveScenario] = useState(null);
  const intervalRef = useRef(null);

  const stopScenario = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setActiveScenario(null);
  }, []);

  const startScenario = useCallback((type, wsInstance, onFrameCallback) => {
    stopScenario();
    if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) {
      alert("Media Gateway WebSocket not connected yet!");
      return;
    }

    setActiveScenario(type);
    const sampleRate = 16000;
    const frameMs = 50;
    const frameSamples = Math.floor((sampleRate * frameMs) / 1000); // 800 samples

    let step = 0;
    intervalRef.current = setInterval(() => {
      step++;
      const samples = new Float32Array(frameSamples);
      const pcm16 = new Int16Array(frameSamples);

      const baseF0 = 120.0;

      for (let i = 0; i < frameSamples; i++) {
        const t = (step * frameSamples + i) / sampleRate;
        let sample = 0;

        if (type === "ceo") {
          // Organic human speech with micro-jitter and vocal vibrato
          const jitter = 0.02 * Math.sin(2 * Math.PI * 5 * t);
          const f0 = baseF0 * (1.0 + jitter);
          sample = Math.sin(2 * Math.PI * f0 * t) * 0.6 +
                   Math.sin(2 * Math.PI * 500 * t) * 0.3 * Math.exp(-(t % (1 / baseF0)) * 300);
        } else if (type === "deepfake") {
          // AI Vocoder: Rigid F0 + high frequency phase buzz (6.4kHz & 7.2kHz)
          sample = Math.sin(2 * Math.PI * baseF0 * t) * 0.5 +
                   Math.sin(2 * Math.PI * 6400 * t) * 0.35 +
                   Math.sin(2 * Math.PI * 7200 * t) * 0.25;
        } else if (type === "replay") {
          // Replay attack: reverberation + speaker hiss
          const f0 = 135.0;
          sample = Math.sin(2 * Math.PI * f0 * t) * 0.5 + (Math.random() - 0.5) * 0.15;
        }

        // Speaking cadence modulation
        sample *= 0.5 * (1 + Math.sin(2 * Math.PI * 2 * t));
        sample = Math.max(-1, Math.min(1, sample));
        samples[i] = sample;
        pcm16[i] = Math.floor(sample * 32767);
      }

      // Send raw binary PCM16 frame over WebSocket
      if (wsInstance.readyState === WebSocket.OPEN) {
        wsInstance.send(pcm16.buffer);
      }

      if (onFrameCallback) {
        onFrameCallback(samples, type === "deepfake");
      }
    }, frameMs);
  }, [stopScenario]);

  return {
    activeScenario,
    startScenario,
    stopScenario,
  };
}
