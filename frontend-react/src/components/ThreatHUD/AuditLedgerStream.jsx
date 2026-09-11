import React, { useState, useEffect, useCallback } from 'react';
import { Database, ShieldCheck, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';

export default function AuditLedgerStream() {
  const [blocks, setBlocks] = useState([]);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const [verifyStatus, setVerifyStatus] = useState({ state: 'idle', msg: null });
  const [isLoading, setIsLoading] = useState(false);

  const fetchBlocks = useCallback(async () => {
    try {
      const res = await fetch('/api/audit/blocks?limit=6');
      if (res.ok) {
        const data = await res.json();
        setTotalBlocks(data.total_blocks || 0);
        setBlocks(data.blocks ? [...data.blocks].reverse() : []);
      }
    } catch (e) {
      // Backend polling error
    }
  }, []);

  useEffect(() => {
    fetchBlocks();
    const interval = setInterval(fetchBlocks, 3000);
    return () => clearInterval(interval);
  }, [fetchBlocks]);

  const handleVerifyLedger = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/audit/verify');
      const data = await res.json();
      if (data.valid) {
        setVerifyStatus({ state: 'valid', msg: `100% Tamper-Free (${data.total_blocks} blocks verified)` });
        alert(`✅ Cryptographic Audit Ledger Verified!\nTotal Blocks: ${data.total_blocks}\nStatus: TAMPER_FREE_VERIFIED\nIntegrity: 100% Valid SHA-256 Hash Chain from Genesis.`);
      } else {
        setVerifyStatus({ state: 'invalid', msg: `Tamper Detected: ${data.error}` });
        alert(`🚨 Tamper Detected!\nError: ${data.error}\nStatus: CORRUPTED_TAMPER_DETECTED`);
      }
    } catch (e) {
      alert('Failed to connect to audit verification API.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTamperTest = async () => {
    try {
      const res = await fetch('/api/audit/tamper-test', { method: 'POST' });
      const data = await res.json();
      if (data.tamper_detected) {
        setVerifyStatus({ state: 'invalid', msg: 'Tamper Detected (Simulated)' });
        alert(`🚨 Cryptographic Tamper Test Succeeded!\nAltered block was detected by hash verification: ${data.error_message}`);
      } else {
        alert(data.message || 'Tamper test executed.');
      }
      fetchBlocks();
    } catch (e) {
      alert('Failed to trigger tamper test.');
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 border border-slate-700/50 flex flex-col gap-3 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-cyber-cyan" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            SHA-256 Audit Ledger
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Blocks: {totalBlocks}</span>
          <button
            onClick={handleVerifyLedger}
            disabled={isLoading}
            className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-md bg-cyber-emerald/20 text-cyber-emerald hover:bg-cyber-emerald/30 border border-cyber-emerald/40 font-bold transition-all"
          >
            <ShieldCheck className="w-3 h-3" />
            <span>{isLoading ? 'Verifying...' : 'Verify SHA-256'}</span>
          </button>
        </div>
      </div>

      {/* Verification Status Banner if checked */}
      {verifyStatus.state !== 'idle' && (
        <div
          className={`flex items-center gap-2 text-xs p-2 rounded-lg border ${
            verifyStatus.state === 'valid'
              ? 'bg-cyber-emerald/10 border-cyber-emerald/30 text-cyber-emerald'
              : 'bg-cyber-rose/10 border-cyber-rose/30 text-cyber-rose'
          }`}
        >
          {verifyStatus.state === 'valid' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 shrink-0" />
          )}
          <span className="truncate">{verifyStatus.msg}</span>
        </div>
      )}

      {/* Blocks Stream */}
      <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
        {blocks && blocks.length > 0 ? (
          blocks.map((b) => {
            const isAlert = b.risk_score >= 60;
            return (
              <div
                key={b.index}
                className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  isAlert
                    ? 'bg-cyber-rose/10 border-cyber-rose/30 text-rose-300'
                    : 'bg-dark-950/70 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-bold text-cyber-cyan">#{b.index}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {b.policy_state}
                  </span>
                  <span className="text-slate-400">Risk: {b.risk_score}</span>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                  {b.block_hash ? b.block_hash.substring(0, 10) + '...' : ''}
                </span>
              </div>
            );
          })
        ) : (
          <div className="text-xs text-slate-400 italic text-center py-3">
            Loading genesis and audit blocks...
          </div>
        )}
      </div>

      {/* Tamper Test Trigger Link */}
      <div className="flex justify-end pt-1 border-t border-slate-800/80">
        <button
          onClick={handleTamperTest}
          className="text-[10px] text-slate-400 hover:text-cyber-rose transition-colors"
          title="Simulate an adversary altering a block's risk score in RAM to test cryptographic detection"
        >
          [Simulate Block Tamper Test]
        </button>
      </div>
    </div>
  );
}
