import React, { useState, useEffect, useRef, useCallback } from 'react';
import VaaniHeader from './components/VaaniHeader';
import CallerProfileCard from './components/CallerProfileCard';
import ConfidenceAnalyticsChart from './components/ConfidenceAnalyticsChart';
import AnomalyForensicsTable from './components/AnomalyForensicsTable';
import FreezeAccountModal from './components/Modals/FreezeAccountModal';
import TriggerMfaModal from './components/Modals/TriggerMfaModal';
import CallerDetailModal from './components/Modals/CallerDetailModal';
import FooterCompliance from './components/FooterCompliance';

// Telemetry & Media Gateway components for Live Threat Telemetry tab
import RiskGauge from './components/ThreatHUD/RiskGauge';
import GraduatedTierLadder from './components/ThreatHUD/GraduatedTierLadder';
import MediaGatewayConsole from './components/ThreatHUD/MediaGatewayConsole';
import LatencyBudget from './components/ThreatHUD/LatencyBudget';
import MultiModalTelemetry from './components/ThreatHUD/MultiModalTelemetry';
import SignedWebhookCard from './components/ThreatHUD/SignedWebhookCard';
import AuditLedgerStream from './components/ThreatHUD/AuditLedgerStream';
import { useAudioStream } from './hooks/useAudioStream';
import { useScenarioSimulator } from './hooks/useScenarioSimulator';
import { CheckCircle2, AlertTriangle, ShieldCheck, Zap, Lock, Bell } from 'lucide-react';

export default function App() {
  // Theme state: default soft dark mode
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('vaani-theme') || 'dark';
  });
  const isDark = theme === 'dark';

  // Apply dark class to <html> element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('vaani-theme', theme);
  }, [theme]);

  // Tab navigation: default to user-requested active tab "Biometric Anomaly Forensics (3)"
  const [activeTab, setActiveTab] = useState('forensics'); // 'forensics' or 'telemetry'

  // Modal dialog states
  const [isFreezeModalOpen, setIsFreezeModalOpen] = useState(false);
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);
  const [isCallerModalOpen, setIsCallerModalOpen] = useState(false);

  // Toast feedback notifications
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Telemetry States for Live Media Gateway & Backend sync
  const [callId, setCallId] = useState('CH-8829-019');
  const [isConnected, setIsConnected] = useState(false);
  const [riskScore, setRiskScore] = useState(14.0);
  const [policyState, setPolicyState] = useState('NORMAL');
  const [reasons, setReasons] = useState([]);
  const [spoofProbability, setSpoofProbability] = useState(0.08);
  const [speakerMatch, setSpeakerMatch] = useState(true);
  const [speakerSimilarity, setSpeakerSimilarity] = useState(0.96);
  const [spectralFlatness, setSpectralFlatness] = useState(0.01);
  const [highFreqRatio, setHighFreqRatio] = useState(0.01);
  const [latencyBreakdown, setLatencyBreakdown] = useState({
    dsp_ms: 0.76,
    spoof_inference_ms: 8.39,
    speaker_verify_ms: 2.86,
    policy_ms: 0.12,
    total_ms: 12.63,
  });
  const [webhookPayload, setWebhookPayload] = useState(null);

  // Canvas visualizer buffers
  const [audioSamples, setAudioSamples] = useState([]);
  const [isDeepfakeVisual, setIsDeepfakeVisual] = useState(false);
  const [spectrogramStep, setSpectrogramStep] = useState(0);

  // WebSocket reference
  const wsRef = useRef(null);

  // Connect to backend WebSocket for live audio stream
  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/audio/stream/${encodeURIComponent(callId)}`;

    try {
      const ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const isSilence = data.status === 'SILENCE_DROPPED';
          const risk = data.risk_score !== undefined ? data.risk_score : 0.0;
          const state = data.policy_state || data.state || 'NORMAL';

          setRiskScore(risk);
          setPolicyState(state);

          if (data.latency_breakdown) {
            setLatencyBreakdown(data.latency_breakdown);
          }

          if (data.reasons) {
            setReasons(data.reasons);
          } else if (isSilence) {
            setReasons([]);
          }

          if (data.spoof_probability !== undefined) {
            setSpoofProbability(data.spoof_probability);
          }

          if (data.speaker_similarity !== undefined) {
            setSpeakerSimilarity(data.speaker_similarity);
            setSpeakerMatch(data.speaker_match);
          }

          if (data.dsp) {
            setSpectralFlatness(data.dsp.spectral_flatness || 0.01);
            setHighFreqRatio(data.dsp.high_freq_ratio || 0.01);
          }

          if (risk >= 60) {
            setWebhookPayload({
              event_type: 'EXECUTIVE_VOICE_THREAT_DETECTED',
              call_id: callId,
              risk_score: risk,
              action: data.action || 'CHALLENGE_MFA',
              reasons: data.reasons || ['Synthetic vocoder artifacts detected (>0.80)'],
              header: 'X-Signature-SHA256: [HMAC_AUTHENTICATED]',
              raw_audio: '[EXCLUDED_FOR_PRIVACY]',
            });
          }
        } catch (err) {
          console.error('Telemetry parse error:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setTimeout(connectWebSocket, 4000);
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    } catch (e) {
      console.warn('WebSocket connection deferred:', e);
    }
  }, [callId]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWebSocket]);

  // Audio Hooks
  const { isMicActive, audioDb, startMic, stopMic } = useAudioStream();
  const { activeScenario, startScenario, stopScenario } = useScenarioSimulator();

  const handleFrameVisual = (samples, isDeepfake = false) => {
    setAudioSamples(samples);
    setIsDeepfakeVisual(isDeepfake);
    setSpectrogramStep((prev) => prev + 1);
  };

  const handleToggleMic = async () => {
    if (isMicActive) {
      stopMic();
    } else {
      stopScenario();
      await startMic(wsRef.current, (samples) => handleFrameVisual(samples, false));
    }
  };

  const handleStartScenario = (type) => {
    if (isMicActive) stopMic();
    startScenario(type, wsRef.current, handleFrameVisual);
  };

  const handleStopAll = () => {
    stopMic();
    stopScenario();
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isDark ? 'bg-[#0B0F17] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'
    }`}>
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-4 right-6 z-50 animate-in slide-in-from-top-3 fade-in duration-200">
          <div className={`px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 font-mono text-xs ${
            toast.type === 'error'
              ? 'bg-red-950/90 border-red-500/50 text-red-200'
              : toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : 'bg-slate-900/90 border-slate-700 text-slate-200'
          }`}>
            {toast.type === 'error' ? (
              <Lock className="w-4 h-4 text-vaani-coral" />
            ) : toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-vaani-emerald" />
            ) : (
              <Zap className="w-4 h-4 text-vaani-blue" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header & Navigation */}
      <VaaniHeader
        theme={theme}
        setTheme={setTheme}
        onOpenMfaModal={() => setIsMfaModalOpen(true)}
        onOpenFreezeModal={() => setIsFreezeModalOpen(true)}
        onOpenCallerModal={() => setIsCallerModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {activeTab === 'forensics' ? (
          /* Primary User Requested Tab: Biometric Anomaly Forensics */
          <div className="flex flex-col gap-6 animate-in fade-in duration-150">
            {/* Caller Profile Card */}
            <CallerProfileCard isDark={isDark} />

            {/* Confidence Over Time & Detection Trends */}
            <ConfidenceAnalyticsChart isDark={isDark} />

            {/* Anomaly Forensics Data Table */}
            <AnomalyForensicsTable
              isDark={isDark}
              onSelectAnomaly={(item) => {
                showToast(`Inspecting forensic vector: ${item.vector} (${item.confidence})`, 'info');
              }}
            />
          </div>
        ) : (
          /* Secondary Tab: Live Threat Telemetry & Media Gateway */
          <div className="flex flex-col gap-6 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left: Risk Gauge & Policy Ladder */}
              <div className="lg:col-span-4 flex flex-col gap-5">
                <RiskGauge
                  riskScore={riskScore}
                  policyState={policyState}
                  reasons={reasons}
                  callId={callId}
                />
                <GraduatedTierLadder policyState={policyState} />
              </div>

              {/* Center: Live Media Gateway & Latency Budget */}
              <div className="lg:col-span-5 flex flex-col gap-5">
                <MediaGatewayConsole
                  onStartMic={handleToggleMic}
                  isMicActive={isMicActive}
                  onStartScenario={handleStartScenario}
                  activeScenario={activeScenario}
                  onStopAll={handleStopAll}
                  audioSamples={audioSamples}
                  isDeepfake={isDeepfakeVisual}
                  triggerShift={spectrogramStep}
                />
                <LatencyBudget latencyBreakdown={latencyBreakdown} />
              </div>

              {/* Right: Multi-Modal Biometric Telemetry & Audit Stream */}
              <div className="lg:col-span-3 flex flex-col gap-5">
                <MultiModalTelemetry
                  spoofProbability={spoofProbability}
                  speakerMatch={speakerMatch}
                  speakerSimilarity={speakerSimilarity}
                  spectralFlatness={spectralFlatness}
                  highFreqRatio={highFreqRatio}
                />
                <SignedWebhookCard
                  webhookPayload={webhookPayload}
                  riskScore={riskScore}
                />
                <AuditLedgerStream />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Compliance Badges */}
      <FooterCompliance isDark={isDark} />

      {/* Interactive Modals */}
      <FreezeAccountModal
        isOpen={isFreezeModalOpen}
        onClose={() => setIsFreezeModalOpen(false)}
        isDark={isDark}
        onFreezeExecuted={(data) => {
          showToast(
            `Account CH-8829-019 quarantined: ${data.enforceWiresOnly ? 'Outbound Wires & ACH Blocked' : 'Full Lockdown'}`,
            'error'
          );
        }}
      />

      <TriggerMfaModal
        isOpen={isMfaModalOpen}
        onClose={() => setIsMfaModalOpen(false)}
        isDark={isDark}
        onChallengeDispatched={(data) => {
          showToast(
            `Challenge dispatched via ${data.method.toUpperCase()} to ${data.targetUser}`,
            'success'
          );
        }}
      />

      <CallerDetailModal
        isOpen={isCallerModalOpen}
        onClose={() => setIsCallerModalOpen(false)}
        isDark={isDark}
      />
    </div>
  );
}
