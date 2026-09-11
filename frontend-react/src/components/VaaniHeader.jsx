import React from 'react';
import { Shield, Zap, Lock, Moon, Sun, ShieldAlert, CheckCircle2, ChevronRight, Activity } from 'lucide-react';

export default function VaaniHeader({
  theme,
  setTheme,
  onOpenMfaModal,
  onOpenFreezeModal,
  onOpenCallerModal,
  activeTab,
  setActiveTab,
}) {
  const isDark = theme === 'dark';

  return (
    <div className="w-full flex flex-col">
      {/* Top Bar */}
      <div className={`w-full px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 border-b transition-colors duration-200 ${
        isDark ? 'bg-[#0B0F17] border-[#1F2937]' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {/* Left: Brand & Spec Badges */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-vaani-blue/20 to-blue-600/20 border border-vaani-blue/40 flex items-center justify-center text-vaani-blue shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-xl font-bold tracking-tight font-sans ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  VAANI
                </h1>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-vaani-blue/15 text-vaani-blue border border-vaani-blue/30">
                  DEFENSE TERMINAL
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Voice Authentication & Anti-spoofing Network Intelligence
              </p>
            </div>
          </div>

          {/* Spec Badges */}
          <div className="hidden lg:flex items-center gap-2 font-mono text-[11px]">
            <span className={`px-2.5 py-1 rounded-md border ${
              isDark ? 'bg-[#111827] border-[#1F2937] text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              AES-256 GCM
            </span>
            <span className={`px-2.5 py-1 rounded-md border ${
              isDark ? 'bg-[#111827] border-[#1F2937] text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              48kHz / 24-bit
            </span>
            <span className="px-2.5 py-1 rounded-md bg-vaani-emerald/15 border border-vaani-emerald/30 text-vaani-emerald font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-vaani-emerald animate-pulse" />
              Zero-Loss
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Trigger MFA Button */}
          <button
            onClick={onOpenMfaModal}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold font-mono border transition-all active:scale-95 ${
              isDark
                ? 'border-vaani-blue/40 text-vaani-blue hover:bg-vaani-blue/10 bg-vaani-blue/5'
                : 'border-sky-500 text-sky-700 hover:bg-sky-50 bg-sky-50/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-vaani-blue" />
            <span>⚡ Trigger MFA / Active Challenge</span>
          </button>

          {/* Freeze Account Button */}
          <button
            onClick={onOpenFreezeModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold font-mono bg-vaani-coral hover:bg-red-600 text-white shadow-md shadow-red-900/30 transition-all active:scale-95"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>🔒 Freeze Account</span>
          </button>

          {/* Theme Toggle Switch */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`p-2 rounded-lg border transition-colors ${
              isDark
                ? 'bg-[#111827] border-[#1F2937] text-slate-300 hover:text-white hover:border-slate-600'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-black hover:border-slate-300'
            }`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </div>

      {/* Banner Strip */}
      <div className={`w-full px-6 py-2.5 flex items-center justify-between text-xs font-mono border-b transition-colors duration-200 ${
        isDark ? 'bg-[#0E1522] border-[#1F2937]/70 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
      }`}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-vaani-emerald animate-ping" />
            <span className="w-2 h-2 -ml-4 rounded-full bg-vaani-emerald" />
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Current Caller:</span>
            <strong className={isDark ? 'text-white' : 'text-slate-900'}>Elena Rostova</strong>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>CI Confidence:</span>
            <span className="text-vaani-emerald font-bold px-2 py-0.5 rounded bg-vaani-emerald/10 border border-vaani-emerald/20">
              95%
            </span>
          </div>
        </div>

        <button
          onClick={onOpenCallerModal}
          className="flex items-center gap-1.5 text-vaani-blue hover:underline font-semibold text-xs"
        >
          <span>Launch Modal View</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Secondary Tabs */}
      <div className={`w-full px-6 flex items-center gap-6 border-b text-xs font-mono transition-colors duration-200 ${
        isDark ? 'bg-[#0B0F17] border-[#1F2937]' : 'bg-white border-slate-200'
      }`}>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`py-3 font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'telemetry'
              ? 'border-vaani-blue text-vaani-blue'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Live Threat Telemetry</span>
        </button>

        <button
          onClick={() => setActiveTab('forensics')}
          className={`py-3 font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'forensics'
              ? 'border-vaani-emerald text-vaani-emerald'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Biometric Anomaly Forensics (3)</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-vaani-emerald/20 text-vaani-emerald border border-vaani-emerald/30">
            Active
          </span>
        </button>
      </div>
    </div>
  );
}
