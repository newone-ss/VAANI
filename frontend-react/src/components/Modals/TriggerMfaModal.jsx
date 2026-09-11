import React, { useState } from 'react';
import {
  Zap,
  X,
  Mic,
  Smartphone,
  MessageSquare,
  CheckCircle2,
  ShieldCheck,
  Radio,
  ArrowRight,
  Clock
} from 'lucide-react';

export default function TriggerMfaModal({ isOpen, onClose, isDark = true, onChallengeDispatched }) {
  const [selectedMethod, setSelectedMethod] = useState('phonetic');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchedSuccess, setDispatchedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDispatch = () => {
    setIsDispatching(true);
    setTimeout(() => {
      setIsDispatching(false);
      setDispatchedSuccess(true);
      if (onChallengeDispatched) {
        onChallengeDispatched({
          method: selectedMethod,
          timestamp: new Date().toISOString(),
          targetUser: 'Elena Rostova (CH-8829-019)'
        });
      }
      setTimeout(() => {
        setDispatchedSuccess(false);
        onClose();
      }, 1600);
    }, 700);
  };

  const challengeOptions = [
    {
      id: 'phonetic',
      title: 'Dynamic Phonetic Nonce Passphrase',
      badge: 'Zero-Latency Acoustic Liveness',
      icon: Mic,
      description: "Prompt caller to read aloud randomized phonetic phrase:",
      phrase: 'Emerald Falcon 82',
      details: 'Tests un-cached vocal tract biomechanics against synthetic pre-rendered audio models.'
    },
    {
      id: 'fido2',
      title: 'FIDO2 Hardware Secure Enclave Push',
      badge: 'Hardware Attested (Level 3)',
      icon: Smartphone,
      description: 'Push biometric challenge to registered mobile hardware:',
      phrase: 'iPhone 16 Pro (Secure Enclave ID: se_0x99f4)',
      details: 'Triggers FaceID / TouchID attestation cryptographic signature over TLS.'
    },
    {
      id: 'otp',
      title: 'Out-of-Band Hardware OTP',
      badge: 'Telecom Fallback',
      icon: MessageSquare,
      description: 'Carrier Encrypted SMS dispatched to authorized SIM IMSI:',
      phrase: '+41 79 *** ** 19 (Swisscom AG)',
      details: 'Requires 6-digit cryptographic verification code entry via telephone keypad (DTMF).'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all ${
        isDark ? 'bg-[#111827] border-[#1F2937] text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Modal Header */}
        <div className="bg-sky-500/10 border-b border-sky-500/20 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  STEP-UP AUTHENTICATION
                </span>
              </div>
              <h3 className="text-sm font-bold mt-1 text-sky-300">
                Trigger MFA / Active Challenge Protocol
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-4">
          {dispatchedSuccess ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-vaani-emerald/20 border-2 border-vaani-emerald flex items-center justify-center text-vaani-emerald">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold">Active Challenge Dispatched</h4>
              <p className="text-xs text-slate-400 font-mono max-w-sm">
                Acoustic challenge transmitted to caller channel. Awaiting telemetry response verification...
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Select an active cryptographic or biometric challenge to verify caller liveness and neutralize synthetic impersonation:
              </p>

              {/* 3 Radio Options */}
              <div className="flex flex-col gap-3 font-sans">
                {challengeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedMethod === opt.id;
                  return (
                    <label
                      key={opt.id}
                      onClick={() => setSelectedMethod(opt.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                        isSelected
                          ? isDark
                            ? 'bg-sky-500/10 border-sky-500/60 ring-1 ring-sky-500/40'
                            : 'bg-sky-50 border-sky-400 ring-1 ring-sky-300'
                          : isDark
                          ? 'bg-[#0B0F17] border-[#1F2937] hover:border-slate-700'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="mfaOption"
                        value={opt.id}
                        checked={isSelected}
                        onChange={() => setSelectedMethod(opt.id)}
                        className="mt-1 h-4 w-4 text-sky-600 focus:ring-sky-500 accent-sky-500"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className={`text-xs font-bold ${
                            isSelected
                              ? isDark ? 'text-sky-300' : 'text-sky-900'
                              : isDark ? 'text-slate-200' : 'text-slate-800'
                          }`}>
                            {opt.title}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700">
                            {opt.badge}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 mt-1">
                          {opt.description}{' '}
                          <strong className="text-white font-mono font-bold bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700 inline-block mt-0.5">
                            '{opt.phrase}'
                          </strong>
                        </p>

                        <span className="text-[11px] text-slate-500 block mt-1">
                          {opt.details}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 font-mono text-xs border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isDispatching}
                  className={`px-4 py-2.5 rounded-xl border font-semibold transition-colors ${
                    isDark
                      ? 'border-[#1F2937] hover:bg-slate-800 text-slate-300'
                      : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDispatch}
                  disabled={isDispatching}
                  className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold shadow-lg shadow-sky-900/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  <span>{isDispatching ? 'Transmitting Challenge...' : 'Dispatch Challenge'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
