import React from 'react';
import { Mic, User, Bot, RefreshCw, Square, Radio } from 'lucide-react';
import WaveformCanvas from './WaveformCanvas';
import SpectrogramCanvas from './SpectrogramCanvas';

export default function MediaGatewayConsole({
  onStartMic,
  isMicActive,
  onStartScenario,
  activeScenario,
  onStopAll,
  audioSamples,
  isDeepfake,
  triggerShift,
}) {
  const isStreaming = isMicActive || !!activeScenario;

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-700/50 flex flex-col gap-4">
      {/* Console Header & Control Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-3.5">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isStreaming ? 'bg-cyber-emerald animate-ping' : 'bg-slate-600'}`} />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Streaming Media Gateway (16 kHz PCM)
          </h2>
        </div>

        {/* Buttons Bar */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Live Mic Button */}
          <button
            onClick={onStartMic}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all ${
              isMicActive
                ? 'bg-cyber-emerald text-white border border-cyber-emerald shadow-lg shadow-emerald-900/40 animate-pulse'
                : 'bg-dark-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>{isMicActive ? 'Mic Active' : 'Live Mic'}</span>
          </button>

          {/* Legitimate CEO Button */}
          <button
            onClick={() => onStartScenario('ceo')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all ${
              activeScenario === 'ceo'
                ? 'bg-cyber-blue text-white border border-cyber-blue shadow-lg shadow-blue-900/40 animate-pulse'
                : 'bg-dark-900 hover:bg-slate-800 text-sky-300 border border-slate-700/80 hover:border-sky-500/40'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Legitimate CEO</span>
          </button>

          {/* AI Vocoder Clone Button */}
          <button
            onClick={() => onStartScenario('deepfake')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all ${
              activeScenario === 'deepfake'
                ? 'bg-cyber-rose text-white border border-cyber-rose shadow-lg shadow-rose-900/40 animate-pulse'
                : 'bg-dark-900 hover:bg-slate-800 text-rose-300 border border-slate-700/80 hover:border-rose-500/40'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Vocoder Clone</span>
          </button>

          {/* Replay Attack Button */}
          <button
            onClick={() => onStartScenario('replay')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all ${
              activeScenario === 'replay'
                ? 'bg-cyber-amber text-white border border-cyber-amber shadow-lg shadow-amber-900/40 animate-pulse'
                : 'bg-dark-900 hover:bg-slate-800 text-amber-300 border border-slate-700/80 hover:border-amber-500/40'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Replay Attack</span>
          </button>

          {/* Stop Stream Button */}
          <button
            onClick={onStopAll}
            disabled={!isStreaming}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold bg-dark-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 disabled:opacity-40 transition-all"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop</span>
          </button>
        </div>
      </div>

      {/* Visualizers */}
      <div className="flex flex-col gap-4">
        <WaveformCanvas audioSamples={audioSamples} />
        <SpectrogramCanvas isDeepfake={isDeepfake} triggerShift={triggerShift} />
      </div>
    </div>
  );
}
