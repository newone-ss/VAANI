import React from 'react';
import { ShieldCheck, Eye, AlertTriangle, Smartphone, Ban } from 'lucide-react';

export default function GraduatedTierLadder({ policyState = 'NORMAL' }) {
  const tiers = [
    { id: 'NORMAL', label: 'Pass', num: '1', icon: ShieldCheck, activeClass: 'border-cyber-emerald bg-cyber-emerald/20 text-cyber-emerald shadow-lg shadow-cyber-emerald/20' },
    { id: 'MONITOR', label: 'Monitor', num: '2', icon: Eye, activeClass: 'border-cyber-cyan bg-cyber-cyan/20 text-cyber-cyan shadow-lg shadow-cyber-cyan/20' },
    { id: 'WARN_ANALYST', label: 'Warn', num: '3', icon: AlertTriangle, activeClass: 'border-cyber-amber bg-cyber-amber/20 text-cyber-amber shadow-lg shadow-cyber-amber/20' },
    { id: 'STEP_UP_MFA', label: 'Step-up MFA', num: '4', icon: Smartphone, activeClass: 'border-cyber-orange bg-cyber-orange/20 text-cyber-orange shadow-lg shadow-cyber-orange/20 animate-pulse' },
    { id: 'ACTIVE_HOLD', label: 'SIP Hold', num: '5', icon: Ban, activeClass: 'border-cyber-red bg-cyber-red/30 text-cyber-red shadow-lg shadow-cyber-red/30 animate-pulse' },
  ];

  return (
    <div className="glass-panel rounded-2xl p-4 border border-slate-700/50 flex flex-col gap-2.5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Graduated Defense Tier</h3>
      <div className="grid grid-cols-5 gap-2 font-mono">
        {tiers.map((tier) => {
          const isActive = policyState === tier.id;
          const TierIcon = tier.icon;
          return (
            <div
              key={tier.id}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                isActive
                  ? tier.activeClass
                  : 'border-slate-800 bg-dark-900/60 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px] opacity-60">#{tier.num}</span>
                <TierIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold tracking-tight">{tier.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
