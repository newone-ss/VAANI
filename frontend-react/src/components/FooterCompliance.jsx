import React from 'react';
import { ShieldCheck, Award, CheckCircle2, Cpu, Lock, Radio } from 'lucide-react';

export default function FooterCompliance({ isDark = true }) {
  return (
    <footer className={`w-full border-t py-4 px-6 mt-auto transition-colors duration-200 ${
      isDark ? 'bg-[#0B0F17] border-[#1F2937]' : 'bg-slate-50 border-slate-200'
    }`}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs">
        {/* Compliance Badges */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
          {/* Badge 1: FIDO2 */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] transition-colors ${
            isDark
              ? 'bg-[#111827] border-[#1F2937] text-slate-300'
              : 'bg-white border-slate-200 text-slate-700 shadow-sm'
          }`}>
            <Lock className="w-3 h-3 text-vaani-blue" />
            <span className="font-semibold">FIDO2 WebAuthn Level 3</span>
          </div>

          {/* Badge 2: SOC 2 */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] transition-colors ${
            isDark
              ? 'bg-[#111827] border-[#1F2937] text-slate-300'
              : 'bg-white border-slate-200 text-slate-700 shadow-sm'
          }`}>
            <ShieldCheck className="w-3 h-3 text-vaani-emerald" />
            <span className="font-semibold">SOC 2 Type II Attested</span>
          </div>

          {/* Badge 3: ISO/IEC 30107-3 */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] transition-colors ${
            isDark
              ? 'bg-[#111827] border-[#1F2937] text-slate-300'
              : 'bg-white border-slate-200 text-slate-700 shadow-sm'
          }`}>
            <Award className="w-3 h-3 text-vaani-purple" />
            <span className="font-semibold">ISO/IEC 30107-3 Biometric Presentation Attack Compliant</span>
          </div>
        </div>

        {/* Engine Specification Tag & Latency */}
        <div className="flex items-center gap-3 text-[11px]">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-md border ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 text-slate-300'
              : 'bg-white border-slate-200 text-slate-700 shadow-sm'
          }`}>
            <Cpu className="w-3.5 h-3.5 text-vaani-blue" />
            <span>
              Engine: <strong className={isDark ? 'text-white' : 'text-slate-900'}>VOCALIS ZERO-TRUST BIOMETRICS</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1 text-vaani-emerald font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-vaani-emerald animate-pulse" />
              Latency: 28ms
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
