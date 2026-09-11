import React from 'react';
import { Terminal, Trash2 } from 'lucide-react';

export default function CallLogTerminal({ logs = [], onClearLogs }) {
  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-700/50 flex flex-col gap-3 font-mono">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyber-cyan" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Real-Time Gateway Ingestion Logs
          </h3>
        </div>
        <button
          onClick={onClearLogs}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-dark-900 border border-slate-800 hover:border-slate-700 transition-all"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear</span>
        </button>
      </div>

      <div className="bg-dark-950 rounded-xl p-3 border border-slate-800 h-64 overflow-y-auto flex flex-col gap-1.5 text-xs">
        {logs && logs.length > 0 ? (
          logs.map((log, idx) => {
            let colorClass = 'text-slate-400';
            if (log.state === 'NORMAL') colorClass = 'text-cyber-emerald';
            else if (log.state === 'MONITOR') colorClass = 'text-cyber-cyan';
            else if (log.state === 'WARN_ANALYST') colorClass = 'text-cyber-amber';
            else if (log.state === 'STEP_UP_MFA') colorClass = 'text-cyber-orange font-bold';
            else if (log.state === 'ACTIVE_HOLD') colorClass = 'text-cyber-red font-bold';

            return (
              <div key={idx} className="flex items-start gap-2 leading-relaxed">
                <span className="text-slate-400 shrink-0 text-[10px]">{log.time}</span>
                <span className={`break-words ${colorClass}`}>{log.msg}</span>
              </div>
            );
          })
        ) : (
          <div className="text-slate-400 italic text-center py-12">
            No live logs yet. Connect to a call session or start scenario streaming.
          </div>
        )}
      </div>
    </div>
  );
}
