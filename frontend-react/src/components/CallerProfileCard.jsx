import React from 'react';
import { CheckCircle, ArrowDownRight, ShieldCheck, Radio, AlertOctagon, Hash, Globe, Fingerprint } from 'lucide-react';

export default function CallerProfileCard({ isDark = true }) {
  return (
    <div className={`w-full rounded-2xl border p-6 flex flex-col lg:flex-row items-stretch justify-between gap-6 transition-colors duration-200 ${
      isDark ? 'bg-[#111827] border-[#1F2937] shadow-card-dark' : 'bg-white border-slate-200 shadow-card-light'
    }`}>
      {/* Left Column: Caller Identity Profile */}
      <div className="flex items-start gap-5 flex-1">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-900 border-2 border-vaani-emerald/60 flex items-center justify-center font-bold text-white text-xl shadow-md overflow-hidden">
            <span className="font-mono tracking-tighter">ER</span>
          </div>
          <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-vaani-emerald text-white border-2 border-dark-900 shadow">
            <CheckCircle className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Identity Details */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className={`text-xl font-extrabold tracking-tight font-sans ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Elena Rostova
            </h2>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              CH-8829-019
            </span>
            <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-vaani-emerald/15 border border-vaani-emerald/30 text-vaani-emerald font-semibold font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-vaani-emerald" />
              Verified
            </span>
          </div>

          <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'} leading-relaxed`}>
            Managing Director, Private Wealth • Banque Cantonale de Genève (Zürich, Switzerland)
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-vaani-blue" />
              <span>IP: <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>194.209.16.88</strong></span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5 text-vaani-purple" />
              <span>Voiceprint: <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>0x3f7bd26b...</strong></span>
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: 4 KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:w-7/12 font-mono">
        {/* Card 1: Total Events */}
        <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors ${
          isDark ? 'bg-[#0B0F17]/70 border-[#1F2937]' : 'bg-slate-50 border-slate-200'
        }`}>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1">
            <Radio className="w-3 h-3 text-vaani-blue" />
            TOTAL EVENTS
          </span>
          <div className="mt-2">
            <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'} tabular-nums`}>3</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Inbound Stream</span>
          </div>
        </div>

        {/* Card 2: Peak Threat CI */}
        <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors ${
          isDark ? 'bg-[#0B0F17]/70 border-[#1F2937]' : 'bg-slate-50 border-slate-200'
        }`}>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1">
            <ArrowDownRight className="w-3 h-3 text-vaani-emerald" />
            PEAK THREAT CI
          </span>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-vaani-emerald tabular-nums">18.2%</span>
              <span className="text-xs text-vaani-emerald font-bold">↓</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5 truncate">bounds [14.7% - 21.7%]</span>
          </div>
        </div>

        {/* Card 3: Critical / High */}
        <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors ${
          isDark ? 'bg-[#0B0F17]/70 border-[#1F2937]' : 'bg-slate-50 border-slate-200'
        }`}>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1">
            <AlertOctagon className="w-3 h-3 text-slate-500" />
            CRITICAL / HIGH
          </span>
          <div className="mt-2">
            <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'} tabular-nums`}>0</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">0 Critical, 0 High</span>
          </div>
        </div>

        {/* Card 4: Active Liveness */}
        <div className={`p-3.5 rounded-xl border flex flex-col justify-between transition-colors ${
          isDark ? 'bg-[#0B0F17]/70 border-[#1F2937]' : 'bg-slate-50 border-slate-200'
        }`}>
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-vaani-emerald" />
            ACTIVE LIVENESS
          </span>
          <div className="mt-2">
            <span className="text-sm font-black text-vaani-emerald tracking-wide">VERIFIED</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">0.1% Deepfake Prob</span>
          </div>
        </div>
      </div>
    </div>
  );
}
