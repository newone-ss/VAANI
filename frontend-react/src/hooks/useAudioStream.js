import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook for live microphone ingestion and 16 kHz PCM16 streaming.
 */
export function useAudioStream() {
  const [isMicActive, setIsMicActive] = useState(false);
  const [audioDb, setAudioDb] = useState(-60);
  const [framesEmitted, setFramesEmitted] = useState(0);

  const audioCtxRef = useRef(null);
  const micStreamRef = useRef(null);
  const scriptProcessorRef = useRef(null);
  const accumulationBufferRef = useRef([]);

  const resampleTo16k = (audioBuffer, inputSampleRate) => {
    if (inputSampleRate === 16000) return audioBuffer;
    const ratio = inputSampleRate / 16000;
    const newLength = Math.round(audioBuffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const origIndex = i * ratio;
      const indexFloor = Math.floor(origIndex);
      const frac = origIndex - indexFloor;
      const s1 = audioBuffer[indexFloor] || 0.0;
      const s2 = audioBuffer[indexFloor + 1] || s1;
      result[i] = s1 + frac * (s2 - s1);
    }
    return result;
  };

  const startMic = useCallback(async (wsInstance, onFrameCallback) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
        }
      });
      micStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      const micSource = audioCtx.createMediaStreamSource(stream);
      // 2048 buffer size
      const scriptProcessor = audioCtx.createScriptProcessor(2048, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      // Silent gain to prevent local loopback howl
      const silentGain = audioCtx.createGain();
      silentGain.gain.value = 0.0;

      micSource.connect(scriptProcessor);
      scriptProcessor.connect(silentGain);
      silentGain.connect(audioCtx.destination);

      accumulationBufferRef.current = [];
      const TARGET_FRAME_SAMPLES = 800; // 50 ms @ 16 kHz

      scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Calculate RMS / dB for VU meter
        let sumSq = 0;
        for (let i = 0; i < inputData.length; i++) {
          sumSq += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sumSq / inputData.length);
        const db = rms > 0.0001 ? 20 * Math.log10(rms) : -60;
        setAudioDb(Math.round(db));

        // Resample to 16 kHz
        const resampled = resampleTo16k(inputData, audioCtx.sampleRate);
        for (let i = 0; i < resampled.length; i++) {
          accumulationBufferRef.current.push(resampled[i]);
        }

        // Slice into 800-sample chunks
        while (accumulationBufferRef.current.length >= TARGET_FRAME_SAMPLES) {
          const frameSlice = accumulationBufferRef.current.splice(0, TARGET_FRAME_SAMPLES);
          const pcm16 = new Int16Array(TARGET_FRAME_SAMPLES);
          for (let i = 0; i < TARGET_FRAME_SAMPLES; i++) {
            const s = Math.max(-1.0, Math.min(1.0, frameSlice[i]));
            pcm16[i] = Math.floor(s < 0 ? s * 32768 : s * 32767);
          }

          // Send over WebSocket if connected
          if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
            wsInstance.send(pcm16.buffer);
            setFramesEmitted((prev) => prev + 1);
          }

          if (onFrameCallback) {
            onFrameCallback(frameSlice);
          }
        }
      };

      setIsMicActive(true);
      return true;
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Microphone permission denied or unavailable: " + err.message);
      return false;
    }
  }, []);

  const stopMic = useCallback(() => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    accumulationBufferRef.current = [];
    setIsMicActive(false);
    setAudioDb(-60);
  }, []);

  return {
    isMicActive,
    audioDb,
    framesEmitted,
    startMic,
    stopMic,
  };
}
