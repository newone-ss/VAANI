import React, { useRef, useEffect } from 'react';

export default function SpectrogramCanvas({ isDeepfake = false, triggerShift = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Shift previous column left by 8px
    const step = 8;
    try {
      const imgData = ctx.getImageData(step, 0, width - step, height);
      ctx.putImageData(imgData, 0, 0);
    } catch (e) {
      // Fallback on initial draw
    }

    // Draw new frequency strip at right edge
    for (let y = 0; y < height; y++) {
      const freqRatio = 1.0 - y / height;
      let intensity = Math.random() * 0.35;

      if (isDeepfake && freqRatio > 0.5) {
        // High frequency vocoder phase buzz (6.4 - 7.2 kHz)
        intensity = 0.7 + Math.random() * 0.3;
        ctx.fillStyle = `rgb(${Math.floor(intensity * 255)}, 30, 90)`;
      } else if (freqRatio < 0.4) {
        // Formant resonance bands
        intensity = 0.4 + Math.random() * 0.4;
        ctx.fillStyle = `rgb(10, ${Math.floor(intensity * 180)}, ${Math.floor(intensity * 255)})`;
      } else {
        ctx.fillStyle = `rgb(6, ${Math.floor(intensity * 60)}, 35)`;
      }

      ctx.fillRect(width - step, y, step, 1);
    }
  }, [triggerShift, isDeepfake]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span>SPECTRAL VOCODER ANOMALY HEATMAP</span>
        <span className={isDeepfake ? 'text-cyber-rose font-bold animate-pulse' : 'text-slate-400'}>
          {isDeepfake ? 'ANOMALY DETECTED (>4kHz)' : 'Clean Spectral Tilt'}
        </span>
      </div>
      <div className="rounded-xl overflow-hidden border border-slate-700/60 bg-dark-900 shadow-inner">
        <canvas
          ref={canvasRef}
          width={600}
          height={65}
          className="w-full h-16 block"
        />
      </div>
    </div>
  );
}
