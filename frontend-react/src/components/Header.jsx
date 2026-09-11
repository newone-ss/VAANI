import React from 'react';
import { Shield, Radio, Activity, Lock, Cpu, PhoneCall, LayoutDashboard } from 'lucide-react';

export default function Header({ currentView, setCurrentView, isConnected, latencySla = '< 300 ms' }) {
  return (
    <header className="glass-panel sticky top-0 z-50 border-b border-slate-700/60 bg-dark-950/80 backdrop-blur-md px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & Subtitle */}
      <div className="flex items-center gap-3.5">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyber-cyan/20 to-cyber-blue/10 border border-cyber-cyan/40 shadow-lg shadow-cyber-cyan/10">
          <Shield className="w-5 h-5 text-cyber-cyan" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyber-cyan animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyber-cyan" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-white font-sans flex items-center">
              BiTe<span className="text-cyber-cyan">_me</span>
            </h1>
            <span className="text-[10px] uppercase tracking-wider font-mono font-bold px-2 py-0.5 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan">
              SEC-OPS
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            AI-Powered Real-Time Voice Impersonation & Executive Deepfake Defense
          </p>
        </div>
      </div>

      {/* Security & SLA Compliance Pills */}
      <div className="hidden xl:flex items-center gap-2.5 text-xs font-mono">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/50 text-slate-300">
          <Activity className="w-3.5 h-3.5 text-cyber-cyan" />
          <span className="text-slate-400">DECISION SLA:</span>
          <span className="font-bold text-cyber-cyan">{latencySla}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/50 text-slate-300">
          <Lock className="w-3.5 h-3.5 text-cyber-emerald" />
          <span className="text-slate-400">PRIVACY:</span>
          <span className="font-bold text-cyber-emerald">ZERO-DISK RAM</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/50 text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-cyber-purple" />
          <span className="text-slate-400">BIOMETRICS:</span>
          <span className="font-bold text-cyber-purple">NON-INVERTIBLE</span>
        </div>
      </div>

      {/* View Switcher & Gateway Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700/60 shadow-inner">
          <button
            onClick={() => setCurrentView('hud')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'hud'
                ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Threat HUD</span>
          </button>
          <button
            onClick={() => setCurrentView('softphone')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentView === 'softphone'
                ? 'bg-cyber-emerald/20 text-cyber-emerald border border-cyber-emerald/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>VoIP Softphone</span>
          </button>
        </div>

        {/* Live Gateway Connection Indicator */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-medium ${
            isConnected
              ? 'bg-cyber-emerald/10 border-cyber-emerald/30 text-cyber-emerald'
              : 'bg-cyber-rose/10 border-cyber-rose/30 text-cyber-rose animate-pulse'
          }`}
          title={isConnected ? 'Connected to Media Gateway on :8000' : 'Connecting to Media Gateway...'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-cyber-emerald' : 'bg-cyber-rose'
            }`}
          />
          <span className="hidden md:inline">{isConnected ? 'GATEWAY LIVE' : 'DISCONNECTED'}</span>
        </div>
      </div>
    </header>
  );
}
