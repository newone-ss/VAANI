import React from 'react';
import { Timer, CheckCircle2 } from 'lucide-react';

export default function LatencyBudget({ latencyBreakdown = {} }) {
  const dspMs = latencyBreakdown.dsp_ms || 0.76;
  const spoofMs = latencyBreakdown.spoof_inference_ms || 8.39;
  const speakerMs = latencyBreakdown.speaker_verify_ms || 2.86;
  const policyMs = latencyBreakdown.policy_ms || 0.12;
  const totalMs = latencyBreakdown.total_ms || (dspMs + spoofMs + speakerMs + policyMs);

  const budgetMaxMs = 300.0;
  const withinSla = totalMs <= budgetMaxMs;

  const metrics = [
    { label: 'DSP Gate & VAD', val: dspMs, max: 15, color: 'bg-cyber-cyan' },
    { label: 'ONNX Anti-Spoof Ensemble', val: spoofMs, max: 150, color: 'bg-cyber-purple' },
    { label: 'Non-Invertible Speaker Verify', val: speakerMs, max: 25, color: 'bg-cyber-blue' },
    { label: 'Policy & Decision Smoothing', val: policyMs, max: 10, color: 'bg-cyber-emerald' },
  ];

  return (
    <div className="glass-panel rounded-2xl p-4 border border-slate-700/50 flex flex-col gap-3 font-mono">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-cyber-cyan" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Decision Latency Budget</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Total:</span>
          <span className="text-sm font-bold text-cyber-cyan">{Number(totalMs).toFixed(2)} ms</span>
          <span className="text-[10px] text-slate-400">(Budget: 300 ms)</span>
          {withinSla && (
            <CheckCircle2 className="w-4 h-4 text-cyber-emerald" title="Within SLA Budget" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {metrics.map((m, idx) => {
          const pct = Math.min(100, Math.max(5, (m.val / m.max) * 100));
          return (
            <div key={idx} className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{m.label}</span>
                <span className="text-slate-200 font-bold">{Number(m.val).toFixed(2)} ms</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-dark-950 overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${m.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
