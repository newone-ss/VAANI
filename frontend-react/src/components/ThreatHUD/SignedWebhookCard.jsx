import React from 'react';
import { Send, KeyRound } from 'lucide-react';

export default function SignedWebhookCard({ webhookPayload = null, riskScore = 0 }) {
  const displayJson =
    webhookPayload ||
    (riskScore >= 60
      ? {
          event_type: 'EXECUTIVE_VOICE_THREAT_DETECTED',
          action: 'CHALLENGE_MFA',
          risk_score: riskScore,
          reasons: ['Synthetic vocoder artifacts detected (>0.80)'],
          header: 'X-Signature-SHA256: [HMAC_AUTHENTICATED]',
          raw_audio: '[EXCLUDED_FOR_PRIVACY]',
        }
      : {
          status: 'Awaiting graduated trigger (Risk >= 60)...',
          privacy: 'Zero raw audio transmitted',
        });

  return (
    <div className="glass-panel rounded-2xl p-4 border border-slate-700/50 flex flex-col gap-2.5 font-mono">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5">
          <Send className="w-3.5 h-3.5 text-cyber-purple" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Internal Signed n8n Webhook</h3>
        </div>
        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/40 font-bold">
          <KeyRound className="w-2.5 h-2.5" />
          HMAC-SHA256
        </span>
      </div>

      <div className="rounded-xl bg-dark-950 p-3 border border-slate-800 overflow-x-auto">
        <pre className="text-[11px] text-cyber-sky/90 leading-relaxed">
          {JSON.stringify(displayJson, null, 2)}
        </pre>
      </div>
    </div>
  );
}
