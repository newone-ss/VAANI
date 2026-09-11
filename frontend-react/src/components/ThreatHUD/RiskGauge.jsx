import React from 'react';
import { ShieldCheck, Eye, AlertTriangle, Smartphone, ShieldAlert } from 'lucide-react';

export default function RiskGauge({
  riskScore = 0,
  policyState = 'NORMAL',
  reasons = [],
  callId = 'CALL-LIVE-0000',
}) {
  const normalizedRisk = Math.min(100, Math.max(0, Math.round(riskScore)));

  // SVG Gauge calculation: 251.2 total stroke-dasharray (semicircle arc)
  const arcLength = 251.2;
  const strokeDashoffset = arcLength - (normalizedRisk / 100) * arcLength;

  let strokeColor = '#10b981'; // green
  let glowColor = 'rgba(16, 185, 129, 0.4)';
  if (normalizedRisk >= 90) {
    strokeColor = '#ef4444';
    glowColor = 'rgba(239, 68, 68, 0.6)';
  } else if (normalizedRisk >= 75) {
    strokeColor = '#f97316';
    glowColor = 'rgba(249, 115, 22, 0.5)';
  } else if (normalizedRisk >= 60) {
    strokeColor = '#f59e0b';
    glowColor = 'rgba(245, 158, 11, 0.4)';
  } else if (normalizedRisk >= 30) {
    strokeColor = '#06b6d4';
    glowColor = 'rgba(6, 182, 212, 0.4)';
  }

  const getStateConfig = () => {
    switch (policyState) {
      case 'MONITOR':
        return {
          icon: Eye,
          title: 'MONITOR',
          colorClass: 'text-cyber-cyan border-cyber-cyan/30 bg-cyber-cyan/10',
          desc: 'Slight acoustic anomaly detected. Heightened telemetry logging.',
        };
      case 'WARN_ANALYST':
        return {
          icon: AlertTriangle,
          title: 'WARN ANALYST',
          colorClass: 'text-cyber-amber border-cyber-amber/30 bg-cyber-amber/10',
          desc: 'Probable voice anomaly. Real-time alert dispatched to analyst console.',
        };
      case 'STEP_UP_MFA':
        return {
          icon: Smartphone,
          title: 'STEP-UP MFA',
          colorClass: 'text-cyber-orange border-cyber-orange/40 bg-cyber-orange/10 animate-pulse',
          desc: 'Critical impersonation risk! Privileged wire held. Out-of-band MFA sent to executive phone.',
        };
      case 'ACTIVE_HOLD':
        return {
          icon: ShieldAlert,
          title: 'ACTIVE HOLD / BLOCK',
          colorClass: 'text-cyber-red border-cyber-red/50 bg-cyber-red/15 animate-pulse',
          desc: 'AI VOICE CLONE CONFIRMED! PBX SIP call held / disconnected. Assets frozen.',
        };
      case 'NORMAL':
      default:
        return {
          icon: ShieldCheck,
          title: 'PASS (NORMAL)',
          colorClass: 'text-cyber-emerald border-cyber-emerald/30 bg-cyber-emerald/10',
          desc: 'Pass-through authorized. Continuous acoustic monitoring active.',
        };
    }
  };

  const stateConfig = getStateConfig();
  const StateIcon = stateConfig.icon;

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col gap-5 border border-slate-700/50">
      {/* Call Header */}
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Live Call Policy State</h2>
          <p className="text-[11px] text-slate-400">Zero-Trust Telephony Session</p>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs text-cyber-cyan font-bold bg-dark-900 px-2.5 py-1 rounded-md border border-slate-700/80">
            {callId}
          </span>
        </div>
      </div>

      {/* State Banner */}
      <div className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${stateConfig.colorClass}`}>
        <StateIcon className="w-6 h-6 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-extrabold font-mono tracking-wide">{stateConfig.title}</h3>
          <p className="text-xs text-slate-300 mt-0.5 leading-snug">{stateConfig.desc}</p>
        </div>
      </div>

      {/* Semicircle Radial Gauge */}
      <div className="relative flex flex-col items-center justify-center pt-2">
        <svg className="w-56 h-32 overflow-visible" viewBox="0 0 200 110">
          {/* Background Arc */}
          <path
            d="M 20,100 A 80,80 0 0,1 180,100"
            fill="none"
            stroke="#1e293b"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Progress Colored Arc */}
          <path
            d="M 20,100 A 80,80 0 0,1 180,100"
            fill="none"
            stroke={strokeColor}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray="251.2"
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 0.35s ease, stroke 0.35s ease',
              filter: `drop-shadow(0 0 10px ${glowColor})`,
            }}
          />
        </svg>

        {/* Center Numbers */}
        <div className="absolute bottom-3 flex flex-col items-center">
          <span className="text-4xl font-black font-mono text-white tracking-tight">{normalizedRisk}</span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Dynamic Risk</span>
        </div>
      </div>

      {/* Scale Indicator */}
      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 px-3 border-t border-slate-800/80 pt-2">
        <span>0 (PASS)</span>
        <span>30 (MON)</span>
        <span>60 (WARN)</span>
        <span>75 (MFA)</span>
        <span>100 (HOLD)</span>
      </div>

      {/* Active Detection Flags */}
      <div className="flex flex-col gap-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Detection Flags</h4>
        <div className="flex flex-col gap-1.5 min-h-[48px]">
          {reasons && reasons.length > 0 ? (
            reasons.map((r, idx) => (
              <div
                key={idx}
                className="text-xs px-2.5 py-1.5 rounded-md bg-dark-900/90 border border-cyber-rose/30 text-rose-300 font-mono flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyber-rose animate-ping" />
                <span>{r}</span>
              </div>
            ))
          ) : (
            <div className="text-xs px-2.5 py-2 rounded-md bg-dark-900/50 border border-slate-800 text-slate-400 italic">
              No acoustic or biometric anomalies detected.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
