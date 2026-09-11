import React, { useState } from 'react';
import { AlertTriangle, Lock, X, Check, ShieldAlert, FileText, Ban } from 'lucide-react';

export default function FreezeAccountModal({ isOpen, onClose, isDark = true, onFreezeExecuted }) {
  const [enforceWiresOnly, setEnforceWiresOnly] = useState(true);
  const [killActiveSIP, setKillActiveSIP] = useState(true);
  const [notifyCompliance, setNotifyCompliance] = useState(true);
  const [justification, setJustification] = useState(
    'Voiceprint spectral discontinuity flagged by autonomous SOC agent.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [frozenSuccess, setFrozenSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExecuteFreeze = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setFrozenSuccess(true);
      if (onFreezeExecuted) {
        onFreezeExecuted({
          enforceWiresOnly,
          killActiveSIP,
          notifyCompliance,
          justification,
          timestamp: new Date().toISOString()
        });
      }
      setTimeout(() => {
        setFrozenSuccess(false);
        onClose();
      }, 1500);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all ${
        isDark ? 'bg-[#111827] border-[#1F2937] text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Modal Top Header */}
        <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-500">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded bg-red-500 text-white tracking-widest">
                  URGENT INTERVENTION
                </span>
              </div>
              <h3 className="text-sm font-bold mt-1 text-red-400">
                Security Classification: Synthetic Voice Cloned Ingress Suspected (Deepfake)
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
        <div className="p-6 flex flex-col gap-5">
          {frozenSuccess ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-vaani-emerald/20 border-2 border-vaani-emerald flex items-center justify-center text-vaani-emerald">
                <Check className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold">Account Quarantine Enacted</h4>
              <p className="text-xs text-slate-400 font-mono max-w-sm">
                Wires frozen, active SIP session terminated, and dispatch ticket dispatched to Tier-3 Fraud Operations.
              </p>
            </div>
          ) : (
            <>
              {/* Target Account Summary */}
              <div className={`p-3.5 rounded-xl border font-mono text-xs flex justify-between items-center ${
                isDark ? 'bg-[#0B0F17] border-[#1F2937]' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Target Caller</span>
                  <strong className="text-sm text-slate-200">Elena Rostova</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase">Account ID</span>
                  <span className="font-bold text-vaani-blue">CH-8829-019</span>
                </div>
              </div>

              {/* Enforcement Checkbox Options */}
              <div className="flex flex-col gap-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Enforcement Scope
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  enforceWiresOnly
                    ? isDark ? 'bg-red-500/10 border-red-500/40' : 'bg-red-50 border-red-200'
                    : isDark ? 'bg-[#0B0F17] border-[#1F2937]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <input
                    type="checkbox"
                    checked={enforceWiresOnly}
                    onChange={(e) => setEnforceWiresOnly(e.target.checked)}
                    className="mt-0.5 rounded text-red-600 focus:ring-red-500 h-4 w-4 accent-red-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold block text-red-400">
                      Freeze Enforcement Scope: Outbound Wires & ACH Clearances Only
                    </span>
                    <span className="text-slate-400 text-[11px] block mt-0.5">
                      Prevents immediate monetary flight while maintaining customer inbound support logging.
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  killActiveSIP
                    ? isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-100 border-slate-300'
                    : isDark ? 'bg-[#0B0F17] border-[#1F2937]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <input
                    type="checkbox"
                    checked={killActiveSIP}
                    onChange={(e) => setKillActiveSIP(e.target.checked)}
                    className="mt-0.5 rounded text-red-600 focus:ring-red-500 h-4 w-4 accent-red-500"
                  />
                  <div className="text-xs">
                    <span className="font-semibold block">Terminate Active SIP Trunk Connection</span>
                    <span className="text-slate-400 text-[11px] block mt-0.5">
                      Send SIP BYE packet with cause code 603 (Decline / Fraud Block).
                    </span>
                  </div>
                </label>
              </div>

              {/* Justification Textarea */}
              <div className="flex flex-col gap-1.5 font-mono">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>SOC Operator Justification Log</span>
                  <span className="text-[10px] text-slate-500">Immutable Audit Trail</span>
                </label>
                <textarea
                  rows={3}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className={`w-full p-3 rounded-xl text-xs outline-none border transition-colors ${
                    isDark
                      ? 'bg-[#0B0F17] border-[#1F2937] text-slate-200 focus:border-red-500'
                      : 'bg-white border-slate-200 text-slate-900 focus:border-red-500'
                  }`}
                  placeholder="Enter operator incident notes and biometric justification..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
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
                  onClick={handleExecuteFreeze}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-vaani-coral hover:bg-red-600 text-white font-bold shadow-lg shadow-red-900/40 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isSubmitting ? 'Executing Lockdown...' : 'Execute Account Freeze'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
