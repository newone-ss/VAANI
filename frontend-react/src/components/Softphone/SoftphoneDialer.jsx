import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, UserCheck, ShieldAlert, Play, Square, Radio } from 'lucide-react';

export default function SoftphoneDialer({
  callId = 'CALL-SIP-7741',
  setCallId,
  isCalling = false,
  onStartCall,
  onEndCall,
  isMuted = false,
  onToggleMute,
  audioDb = -60,
  onEnrollVoice,
  enrollStatus = 'idle',
  onTriggerScenario,
  activeScenario = null,
}) {
  const [dialedNumber, setDialedNumber] = useState('1001 (CEO Suite)');
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let timer = null;
    if (isCalling) {
      timer = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isCalling]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const dialKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

  const handleKeyClick = (key) => {
    if (!isCalling) {
      setDialedNumber((prev) => (prev.includes('(') ? key : prev + key));
    }
  };

  const vuPercentage = Math.min(100, Math.max(0, ((audioDb + 60) / 60) * 100));

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-700/50 flex flex-col gap-4">
      {/* Softphone Header */}
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyber-emerald/20 border border-cyber-emerald/40 flex items-center justify-center text-cyber-emerald">
            <Phone className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">VoIP PBX Softphone</h2>
            <p className="text-[11px] text-slate-400">16 kHz PCM Linear Streaming Client</p>
          </div>
        </div>
        <span
          className={`text-xs font-mono px-2.5 py-1 rounded-full border font-bold ${
            isCalling
              ? 'bg-cyber-emerald/20 text-cyber-emerald border-cyber-emerald/40 animate-pulse'
              : 'bg-slate-800/80 text-slate-400 border-slate-700'
          }`}
        >
          {isCalling ? `IN CALL (${formatTime(callDuration)})` : 'IDLE / READY'}
        </span>
      </div>

      {/* Screen / Dial Display */}
      <div className="bg-dark-950 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs font-mono text-slate-400">
          <span>Extension / Target:</span>
          <span>{callId}</span>
        </div>
        <div className="text-xl font-bold font-mono text-white tracking-wider truncate">
          {dialedNumber}
        </div>

        {/* Live Audio VU Meter */}
        <div className="flex flex-col gap-1 pt-1">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
            <span>MIC LEVEL</span>
            <span className={audioDb > -30 ? 'text-cyber-emerald font-bold' : 'text-slate-400'}>
              {isMuted ? 'MUTED' : `${audioDb} dB`}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-75 ${
                audioDb > -15
                  ? 'bg-cyber-rose'
                  : audioDb > -30
                  ? 'bg-cyber-amber'
                  : 'bg-cyber-emerald'
              }`}
              style={{ width: `${isMuted ? 0 : vuPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Dialpad */}
      <div className="grid grid-cols-3 gap-2 py-1">
        {dialKeys.map((k) => (
          <button
            key={k}
            onClick={() => handleKeyClick(k)}
            disabled={isCalling}
            className="py-2.5 rounded-xl bg-dark-900/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-slate-200 font-mono font-bold text-base transition-all active:scale-95 disabled:opacity-50"
          >
            {k}
          </button>
        ))}
      </div>

      {/* Call Actions */}
      <div className="grid grid-cols-2 gap-2.5">
        {!isCalling ? (
          <button
            onClick={onStartCall}
            className="col-span-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-98"
          >
            <Phone className="w-4 h-4" />
            <span>Connect / Call (Live Mic)</span>
          </button>
        ) : (
          <>
            <button
              onClick={onToggleMute}
              className={`py-2.5 rounded-xl border text-xs font-bold font-mono flex items-center justify-center gap-2 transition-all ${
                isMuted
                  ? 'bg-cyber-amber/20 border-cyber-amber text-cyber-amber'
                  : 'bg-dark-900 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>
            <button
              onClick={onEndCall}
              className="py-2.5 rounded-xl bg-cyber-red/80 hover:bg-cyber-red text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-900/40"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Hang Up</span>
            </button>
          </>
        )}
      </div>

      {/* Dynamic 1-Click Biometric Voice Enrollment */}
      <div className="border-t border-slate-800 pt-3 flex flex-col gap-2">
        <button
          onClick={onEnrollVoice}
          disabled={!isCalling}
          className="w-full py-2.5 px-3 rounded-xl bg-cyber-purple/20 hover:bg-cyber-purple/30 border border-cyber-purple/40 text-purple-300 text-xs font-bold font-mono flex items-center justify-center gap-2 transition-all disabled:opacity-40"
        >
          <UserCheck className="w-4 h-4" />
          <span>
            {enrollStatus === 'enrolling'
              ? 'Capturing 2s vocal features...'
              : '🎙️ Enroll Live Voice as CEO'}
          </span>
        </button>
        <p className="text-[10px] text-slate-400 text-center">
          Captures 2s from live RAM buffer to update reference template in-memory.
        </p>
      </div>

      {/* Scenario Simulation Quick Triggers */}
      <div className="border-t border-slate-800 pt-3 flex flex-col gap-2">
        <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
          Simulate Call Scenarios:
        </span>
        <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
          <button
            onClick={() => onTriggerScenario('ceo')}
            className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1 transition-all ${
              activeScenario === 'ceo'
                ? 'bg-cyber-blue text-white border-cyber-blue font-bold shadow-md'
                : 'bg-dark-900/80 border-slate-800 text-slate-300 hover:border-cyber-blue/50'
            }`}
          >
            <span>CEO</span>
          </button>
          <button
            onClick={() => onTriggerScenario('deepfake')}
            className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1 transition-all ${
              activeScenario === 'deepfake'
                ? 'bg-cyber-rose text-white border-cyber-rose font-bold shadow-md'
                : 'bg-dark-900/80 border-slate-800 text-slate-300 hover:border-cyber-rose/50'
            }`}
          >
            <span>Clone</span>
          </button>
          <button
            onClick={() => onTriggerScenario('replay')}
            className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1 transition-all ${
              activeScenario === 'replay'
                ? 'bg-cyber-amber text-white border-cyber-amber font-bold shadow-md'
                : 'bg-dark-900/80 border-slate-800 text-slate-300 hover:border-cyber-amber/50'
            }`}
          >
            <span>Replay</span>
          </button>
        </div>
      </div>
    </div>
  );
}
