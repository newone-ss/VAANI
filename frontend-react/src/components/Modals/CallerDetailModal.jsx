import React from 'react';
import {
  X,
  User,
  ShieldCheck,
  Fingerprint,
  Globe,
  Radio,
  Clock,
  Activity,
  Award,
  Key,
  Download,
  CheckCircle2
} from 'lucide-react';

export default function CallerDetailModal({ isOpen, onClose, isDark = true }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden transition-all ${
        isDark ? 'bg-[#111827] border-[#1F2937] text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Modal Header */}
        <div className={`p-6 border-b flex items-center justify-between ${
          isDark ? 'bg-[#0B0F17]/80 border-[#1F2937]' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-900 border-2 border-vaani-emerald flex items-center justify-center font-bold text-white text-xl font-mono shadow-md">
              ER
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Elena Rostova</h3>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  CH-8829-019
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-vaani-emerald/15 text-vaani-emerald border border-vaani-emerald/30">
                  VERIFIED BIOMETRIC
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Managing Director, Private Wealth • Banque Cantonale de Genève (Zürich, Switzerland)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 flex flex-col gap-6 max-h-[75vh] overflow-y-auto font-sans text-xs">
          {/* Identity & Telecom Coordinates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-[#0B0F17] border-[#1F2937]' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] uppercase text-slate-400 block font-semibold">IP Telephony Route</span>
              <span className="text-xs font-bold text-vaani-blue mt-1 block">194.209.16.88</span>
              <span className="text-[10px] text-slate-500">Swisscom Zurich Backbone</span>
            </div>
            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-[#0B0F17] border-[#1F2937]' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] uppercase text-slate-400 block font-semibold">Enrollment Timestamp</span>
              <span className="text-xs font-bold text-slate-200 mt-1 block">2024-11-14 UTC</span>
              <span className="text-[10px] text-slate-500">Tier-4 Clean Room Master</span>
            </div>
            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-[#0B0F17] border-[#1F2937]' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] uppercase text-slate-400 block font-semibold">Historic Pass Rate</span>
              <span className="text-xs font-bold text-vaani-emerald mt-1 block">99.8% (42/42)</span>
              <span className="text-[10px] text-slate-500">0 Fraud False Alarms</span>
            </div>
          </div>

          {/* Cryptographic Hash & Non-Invertible Vault */}
          <div className={`p-4 rounded-xl border flex flex-col gap-2 font-mono ${
            isDark ? 'bg-[#0B0F17] border-[#1F2937]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-vaani-purple" />
                Non-Invertible Biometric Vault Signature
              </span>
              <span className="text-[10px] text-vaani-emerald font-semibold">SHA-512 / Dilithium-3</span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-slate-300 break-all select-all font-mono">
              0x3f7bd26b89c4a012e4f01489e8f192b0c34e7a8f10b2e98711dc490184b91ce3
            </div>
            <p className="text-[10px] text-slate-400">
              * Protected under irreversible projection matrix. Raw speech cannot be reconstructed from this representation.
            </p>
          </div>

          {/* Acoustic Anatomy Parameters */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
              Enrolled Biometric Acoustic Formants
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono text-[11px]">
              <div className={`p-3 rounded-lg border ${isDark ? 'bg-[#0B0F17] border-[#1F2937]' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-500 block text-[10px]">Fundamental F0</span>
                <span className="font-bold text-slate-200">198.4 Hz</span>
                <span className="text-[10px] text-vaani-emerald block">±12 Hz nominal</span>
              </div>
              <div className={`p-3 rounded-lg border ${isDark ? 'bg-[#0B0F17] border-[#1F2937]' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-500 block text-[10px]">Formant Ratio F1/F2</span>
                <span className="font-bold text-slate-200">1.842</span>
                <span className="text-[10px] text-vaani-emerald block">Vocal tract exact</span>
              </div>
              <div className={`p-3 rounded-lg border ${isDark ? 'bg-[#0B0F17] border-[#1F2937]' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-500 block text-[10px]">Jitter / Shimmer</span>
                <span className="font-bold text-slate-200">0.28% / 1.4%</span>
                <span className="text-[10px] text-vaani-emerald block">Natural micro-tremor</span>
              </div>
              <div className={`p-3 rounded-lg border ${isDark ? 'bg-[#0B0F17] border-[#1F2937]' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-500 block text-[10px]">Harmonic / Noise</span>
                <span className="font-bold text-slate-200">24.2 dB</span>
                <span className="text-[10px] text-vaani-emerald block">Studio signal clarity</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex items-center justify-between font-mono text-xs ${
          isDark ? 'bg-[#0B0F17]/80 border-[#1F2937]' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-vaani-emerald" />
            <span>Biometric Signature Validated against Swiss Federal ID standard</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
