import React, { useRef, useEffect } from 'react';

export default function WaveformCanvas({ audioSamples = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#060a14';
    ctx.fillRect(0, 0, width, height);

    // Draw center guideline
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    if (!audioSamples || audioSamples.length === 0) {
      return;
    }

    // Draw waveform
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
    ctx.beginPath();

    const sliceWidth = width / audioSamples.length;
    let x = 0;

    for (let i = 0; i < audioSamples.length; i++) {
      const v = audioSamples[i];
      const y = ((v + 1) / 2) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [audioSamples]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span>PCM AUDIO WAVEFORM (IN-MEMORY RING BUFFER)</span>
        <span className="text-cyber-cyan">16 kHz Linear</span>
      </div>
      <div className="rounded-xl overflow-hidden border border-slate-700/60 bg-dark-900 shadow-inner">
        <canvas
          ref={canvasRef}
          width={600}
          height={80}
          className="w-full h-20 block"
        />
      </div>
    </div>
  );
}
