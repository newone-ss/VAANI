import React from 'react';
import { Gauge, Radio, Fingerprint, Waves } from 'lucide-react';

export default function MultiModalTelemetry({
  spoofProbability = 0.0,
  speakerMatch = true,
  speakerSimilarity = 0.95,
  spectralFlatness = 0.01,
  highFreqRatio = 0.01,
}) {
  const spoofPct = Math.min(100, Math.round(spoofProbability * 100));
  const speakerPct = Math.min(100, Math.round(speakerSimilarity * 100));
  const flatnessPct = Math.min(100, Math.round(spectralFlatness * 100));
  const highFreqPct = Math.min(100, Math.round(highFreqRatio * 150));

  return (
    <div className="glass-panel rounded-2xl p-4 border border-slate-700/50 flex flex-col gap-3 font-mono">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Multi-Modal Telemetry</h3>
        <span className="text-[10px] text-cyber-cyan font-semibold">Dual Hot Path</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Spoof Probability */}
        <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-dark-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-cyber-rose" />
              <span>AASIST Spoof</span>
            </span>
            <span className={`font-bold ${spoofProbability >= 0.5 ? 'text-cyber-rose' : 'text-slate-300'}`}>
              {Number(spoofProbability).toFixed(3)}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-dark-950 overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                spoofProbability >= 0.5 ? 'bg-cyber-rose' : 'bg-cyber-cyan'
              }`}
              style={{ width: `${spoofPct}%` }}
            />
          </div>
        </div>

        {/* Speaker Non-Invertible Match */}
        <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-dark-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Fingerprint className="w-3 h-3 text-cyber-purple" />
              <span>Biometric Match</span>
            </span>
            <span className={`font-bold ${speakerMatch ? 'text-cyber-emerald' : 'text-cyber-amber'}`}>
              {speakerPct}%
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-dark-950 overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                speakerMatch ? 'bg-cyber-emerald' : 'bg-cyber-amber'
              }`}
              style={{ width: `${speakerPct}%` }}
            />
          </div>
        </div>

        {/* DSP Spectral Flatness */}
        <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-dark-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Waves className="w-3 h-3 text-cyber-cyan" />
              <span>Spectral Flatness</span>
            </span>
            <span className="font-bold text-slate-300">
              {Number(spectralFlatness).toFixed(2)}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-dark-950 overflow-hidden border border-slate-800">
            <div
              className="h-full rounded-full bg-cyber-cyan transition-all duration-300"
              style={{ width: `${flatnessPct}%` }}
            />
          </div>
        </div>

        {/* High-Freq Power Ratio */}
        <div className="flex flex-col gap-1 p-2.5 rounded-xl bg-dark-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Gauge className="w-3 h-3 text-cyber-blue" />
              <span>High-Freq (&gt;4kHz)</span>
            </span>
            <span className="font-bold text-slate-300">
              {Number(highFreqRatio).toFixed(2)}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-dark-950 overflow-hidden border border-slate-800">
            <div
              className="h-full rounded-full bg-cyber-blue transition-all duration-300"
              style={{ width: `${highFreqPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
