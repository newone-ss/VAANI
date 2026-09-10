// BiTe_me Real-Time Security Operations Console Script

let ws = null;
let currentCallId = "CALL-MIRROR-" + Math.floor(1000 + Math.random() * 9000);
let audioContext = null;
let micSource = null;
let scriptProcessor = null;
let simInterval = null;
let isStreaming = false;

// DOM Elements
const callIdTag = document.getElementById("currentCallId");
const riskNumber = document.getElementById("riskNumber");
const gaugeProgress = document.getElementById("gaugeProgress");
const policyStateBanner = document.getElementById("policyStateBanner");
const policyStateTitle = document.getElementById("policyStateTitle");
const policyActionDesc = document.getElementById("policyActionDesc");
const stateIcon = document.getElementById("stateIcon");
const threatReasonsList = document.getElementById("threatReasonsList");

// Latency DOM
const totalLatencyVal = document.getElementById("totalLatencyVal");
const dspLatVal = document.getElementById("dspLatVal");
const dspLatBar = document.getElementById("dspLatBar");
const spoofLatVal = document.getElementById("spoofLatVal");
const spoofLatBar = document.getElementById("spoofLatBar");
const speakerLatVal = document.getElementById("speakerLatVal");
const speakerLatBar = document.getElementById("speakerLatBar");
const policyLatVal = document.getElementById("policyLatVal");
const policyLatBar = document.getElementById("policyLatBar");

// Metric DOM
const spoofProbVal = document.getElementById("spoofProbVal");
const spoofProbBar = document.getElementById("spoofProbBar");
const speakerMatchVal = document.getElementById("speakerMatchVal");
const speakerMatchBar = document.getElementById("speakerMatchBar");
const flatnessVal = document.getElementById("flatnessVal");
const flatnessBar = document.getElementById("flatnessBar");
const highFreqVal = document.getElementById("highFreqVal");
const highFreqBar = document.getElementById("highFreqBar");

// Webhook & Ledger
const webhookSnippet = document.getElementById("webhookSnippet");
const ledgerStream = document.getElementById("ledgerStream");
const blockCountVal = document.getElementById("blockCountVal");
const ledgerStatusBadge = document.getElementById("ledgerStatusBadge");
const btnVerifyChain = document.getElementById("btnVerifyChain");

// Canvas
const waveCanvas = document.getElementById("waveformCanvas");
const waveCtx = waveCanvas.getContext("2d");
const specCanvas = document.getElementById("spectrogramCanvas");
const specCtx = specCanvas.getContext("2d");

callIdTag.innerText = `ID: ${currentCallId}`;

// Connect to Media Gateway WebSocket
function connectWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/audio/stream/${currentCallId}`;

    ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
        console.log("WebSocket connected to Media Gateway:", url);
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleTelemetry(data);
        } catch (e) {
            console.error("Telemetry parse error:", e);
        }
    };

    ws.onclose = () => {
        console.warn("WebSocket closed. Reconnecting in 2s...");
        setTimeout(connectWebSocket, 2000);
    };
}

// Telemetry handler
function handleTelemetry(data) {
    if (data.status === "SILENCE_DROPPED") {
        updateLatencyBars(data.latency_breakdown);
        return;
    }

    const risk = data.risk_score || 0;
    const state = data.state || "NORMAL";
    const action = data.action || "ALLOW";

    // 1. Update Gauge (Arc length: 251.2)
    riskNumber.innerText = Math.round(risk);
    const dashOffset = 251.2 - (risk / 100) * 251.2;
    gaugeProgress.style.strokeDashoffset = dashOffset;

    let strokeColor = "#10b981";
    if (risk >= 90) strokeColor = "#ef4444";
    else if (risk >= 75) strokeColor = "#f97316";
    else if (risk >= 60) strokeColor = "#f59e0b";
    else if (risk >= 30) strokeColor = "#06b6d4";
    gaugeProgress.style.stroke = strokeColor;

    // 2. Update Policy Banner
    policyStateTitle.innerText = state;
    policyStateBanner.className = `policy-state-banner state-${state.toLowerCase().replace('_', '-')}`;

    if (state === "NORMAL") {
        stateIcon.innerText = "🛡️";
        policyActionDesc.innerText = "Pass-through authorized. Continuous acoustic monitoring active.";
    } else if (state === "MONITOR") {
        stateIcon.innerText = "👁️";
        policyActionDesc.innerText = "Slight acoustic anomaly detected. Heightened telemetry logging.";
    } else if (state === "WARN_ANALYST") {
        stateIcon.innerText = "⚠️";
        policyActionDesc.innerText = "Probable voice anomaly. Real-time alert dispatched to analyst console.";
    } else if (state === "STEP_UP_MFA") {
        stateIcon.innerText = "📱";
        policyActionDesc.innerText = "Critical impersonation risk! Wire/privileged action held. Out-of-band MFA sent to CEO phone.";
    } else if (state === "ACTIVE_HOLD") {
        stateIcon.innerText = "🚨";
        policyActionDesc.innerText = "AI VOICE CLONE CONFIRMED! PBX SIP call held / disconnected. Assets frozen.";
    }

    // 3. Update Tier Steps
    document.querySelectorAll(".tier-step").forEach(el => el.classList.remove("active"));
    if (state === "NORMAL") document.getElementById("tierNormal").classList.add("active");
    if (state === "MONITOR") document.getElementById("tierMonitor").classList.add("active");
    if (state === "WARN_ANALYST") document.getElementById("tierWarn").classList.add("active");
    if (state === "STEP_UP_MFA") document.getElementById("tierMfa").classList.add("active");
    if (state === "ACTIVE_HOLD") document.getElementById("tierHold").classList.add("active");

    // 4. Update Reasons
    threatReasonsList.innerHTML = "";
    if (data.reasons && data.reasons.length > 0) {
        data.reasons.forEach(r => {
            const li = document.createElement("li");
            li.innerText = r;
            threatReasonsList.appendChild(li);
        });
    } else {
        const li = document.createElement("li");
        li.className = "empty";
        li.innerText = "No acoustic or biometric anomalies detected.";
        threatReasonsList.appendChild(li);
    }

    // 5. Update Latencies
    if (data.latency_breakdown) {
        updateLatencyBars(data.latency_breakdown);
    }

    // 6. Update Multi-Modal Metrics
    if (data.spoof_probability !== undefined) {
        spoofProbVal.innerText = data.spoof_probability.toFixed(3);
        spoofProbBar.style.width = `${Math.min(100, data.spoof_probability * 100)}%`;
    }
    if (data.speaker_similarity !== undefined) {
        const pct = Math.round(data.speaker_similarity * 100);
        speakerMatchVal.innerText = `${pct}%`;
        speakerMatchBar.style.width = `${pct}%`;
        speakerMatchBar.className = `meter-fill ${data.speaker_match ? 'green' : 'red'}`;
    }
    if (data.dsp) {
        flatnessVal.innerText = data.dsp.spectral_flatness.toFixed(2);
        flatnessBar.style.width = `${Math.min(100, data.dsp.spectral_flatness * 100)}%`;
        highFreqVal.innerText = data.dsp.high_freq_ratio.toFixed(2);
        highFreqBar.style.width = `${Math.min(100, data.dsp.high_freq_ratio * 150)}%`;
    }

    // 7. Update Webhook snippet if action triggers
    if (risk >= 60) {
        webhookSnippet.innerText = JSON.stringify({
            event_type: "EXECUTIVE_VOICE_THREAT_DETECTED",
            call_id: data.call_id,
            speaker_id: data.speaker_id,
            risk_score: data.risk_score,
            action: data.action,
            reasons: data.reasons,
            header: "X-Signature-SHA256: [HMAC_AUTHENTICATED]",
            raw_audio: "[EXCLUDED_FOR_PRIVACY]"
        }, null, 2);
    }

    fetchAuditBlocks();
}

function updateLatencyBars(lb) {
    totalLatencyVal.innerText = lb.total_ms;
    dspLatVal.innerText = lb.dsp_ms;
    dspLatBar.style.width = `${Math.min(100, (lb.dsp_ms / 15) * 100)}%`;

    if (lb.spoof_inference_ms) {
        spoofLatVal.innerText = lb.spoof_inference_ms;
        spoofLatBar.style.width = `${Math.min(100, (lb.spoof_inference_ms / 40) * 100)}%`;
    }
    if (lb.speaker_verify_ms) {
        speakerLatVal.innerText = lb.speaker_verify_ms;
        speakerLatBar.style.width = `${Math.min(100, (lb.speaker_verify_ms / 10) * 100)}%`;
    }
    if (lb.policy_ms) {
        policyLatVal.innerText = lb.policy_ms;
        policyLatBar.style.width = `${Math.min(100, (lb.policy_ms / 5) * 100)}%`;
    }
}

// Fetch Audit Ledger Blocks
async function fetchAuditBlocks() {
    try {
        const res = await fetch("/api/audit/blocks?limit=6");
        const data = await res.json();
        blockCountVal.innerText = `Blocks: ${data.total_blocks}`;

        ledgerStream.innerHTML = "";
        data.blocks.reverse().forEach(b => {
            const div = document.createElement("div");
            div.className = `ledger-item ${b.risk_score >= 60 ? 'alert' : ''}`;
            div.innerHTML = `
                <span>#${b.index} [${b.policy_state}] Risk: ${b.risk_score}</span>
                <span class="hash">${b.block_hash.substring(0, 12)}...</span>
            `;
            ledgerStream.appendChild(div);
        });
    } catch (e) {}
}

// Cryptographic Ledger Verification
btnVerifyChain.addEventListener("click", async () => {
    try {
        const res = await fetch("/api/audit/verify");
        const result = await res.json();
        if (result.valid) {
            ledgerStatusBadge.innerText = "SHA-256 VERIFIED";
            ledgerStatusBadge.className = "val green";
            alert(`✅ Cryptographic Audit Ledger Verified!\nTotal Blocks: ${result.total_blocks}\nIntegrity: 100% Tamper-Free SHA-256 Hash Chain.`);
        } else {
            ledgerStatusBadge.innerText = "TAMPER DETECTED";
            ledgerStatusBadge.className = "val red";
            alert(`🚨 Tamper Detected!\nError: ${result.error}`);
        }
    } catch (e) {
        alert("Failed to verify ledger.");
    }
});

// Canvas Waveform & Spectrogram Drawing
function drawWaveform(samples) {
    waveCtx.fillStyle = "#080c16";
    waveCtx.fillRect(0, 0, waveCanvas.width, waveCanvas.height);

    waveCtx.lineWidth = 2;
    waveCtx.strokeStyle = "#38bdf8";
    waveCtx.beginPath();

    const sliceWidth = waveCanvas.width / samples.length;
    let x = 0;

    for (let i = 0; i < samples.length; i++) {
        const v = samples[i];
        const y = (v + 1) / 2 * waveCanvas.height;
        if (i === 0) waveCtx.moveTo(x, y);
        else waveCtx.lineTo(x, y);
        x += sliceWidth;
    }
    waveCtx.stroke();
}

function drawSpectrogram(isDeepfake) {
    // Shift spectrogram left
    const width = specCanvas.width;
    const height = specCanvas.height;
    const imgData = specCtx.getImageData(10, 0, width - 10, height);
    specCtx.putImageData(imgData, 0, 0);

    // Draw new column
    for (let y = 0; y < height; y++) {
        const freqRatio = 1.0 - (y / height);
        let intensity = Math.random() * 0.4;

        if (isDeepfake && freqRatio > 0.5) {
            // Unnatural vocoder buzz in high frequency bands
            intensity = 0.7 + Math.random() * 0.3;
            specCtx.fillStyle = `rgb(${Math.floor(intensity * 255)}, 30, 80)`;
        } else if (freqRatio < 0.35) {
            // Normal speech formant bands
            intensity = 0.5 + Math.random() * 0.4;
            specCtx.fillStyle = `rgb(10, ${Math.floor(intensity * 200)}, ${Math.floor(intensity * 255)})`;
        } else {
            specCtx.fillStyle = `rgb(5, ${Math.floor(intensity * 50)}, 30)`;
        }
        specCtx.fillRect(width - 10, y, 10, 1);
    }
}

// Audio Stream Simulator
function stopCurrentStream() {
    if (simInterval) {
        clearInterval(simInterval);
        simInterval = null;
    }
    if (scriptProcessor) {
        scriptProcessor.disconnect();
        scriptProcessor = null;
    }
    if (micSource) {
        micSource.disconnect();
        micSource = null;
    }
    isStreaming = false;
}

function simulateScenario(type) {
    stopCurrentStream();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    isStreaming = true;
    const sampleRate = 16000;
    const frameMs = 50;
    const frameSamples = Math.floor((sampleRate * frameMs) / 1000); // 800 samples

    let step = 0;
    simInterval = setInterval(() => {
        step++;
        const samples = new Float32Array(frameSamples);
        const pcm16 = new Int16Array(frameSamples);

        const baseF0 = 120.0;
        const isDeepfake = (type === "deepfake");
        const isReplay = (type === "replay");

        for (let i = 0; i < frameSamples; i++) {
            const t = (step * frameSamples + i) / sampleRate;
            let sample = 0;

            if (type === "ceo") {
                // Natural organic human speech with vocal vibrato
                const jitter = 0.02 * Math.sin(2 * Math.PI * 5 * t);
                const f0 = baseF0 * (1.0 + jitter);
                sample = Math.sin(2 * Math.PI * f0 * t) * 0.6 +
                         Math.sin(2 * Math.PI * 500 * t) * 0.3 * Math.exp(-(t % (1/baseF0)) * 300);
            } else if (type === "deepfake") {
                // AI Vocoder: Rigid F0 + high frequency phase buzz (6400Hz)
                sample = Math.sin(2 * Math.PI * baseF0 * t) * 0.5 +
                         Math.sin(2 * Math.PI * 6400 * t) * 0.35 +
                         Math.sin(2 * Math.PI * 7200 * t) * 0.25;
            } else if (type === "replay") {
                // Replay attack: reverberation + speaker hiss
                const f0 = 135.0;
                sample = Math.sin(2 * Math.PI * f0 * t) * 0.5 + (Math.random() - 0.5) * 0.15;
            }

            // Speaking cadence modulation
            sample *= 0.5 * (1 + Math.sin(2 * Math.PI * 2 * t));
            sample = Math.max(-1, Math.min(1, sample));
            samples[i] = sample;
            pcm16[i] = Math.floor(sample * 32767);
        }

        // Send binary PCM frame
        ws.send(pcm16.buffer);

        // Visuals
        drawWaveform(samples);
        drawSpectrogram(isDeepfake);

    }, frameMs);
}

// Live Microphone Ingestion
async function startMicrophone() {
    stopCurrentStream();
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        micSource = audioContext.createMediaStreamSource(stream);

        // 2048 buffer size
        scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
        micSource.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);

        scriptProcessor.onaudioprocess = (e) => {
            const input = e.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) {
                const s = Math.max(-1, Math.min(1, input[i]));
                pcm16[i] = Math.floor(s * 32767);
            }
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(pcm16.buffer);
            }
            drawWaveform(input);
            drawSpectrogram(false);
        };
        isStreaming = true;
    } catch (e) {
        alert("Microphone access denied or not available: " + e.message);
    }
}

// Button Listeners
document.getElementById("btnSimCeo").addEventListener("click", () => simulateScenario("ceo"));
document.getElementById("btnSimDeepfake").addEventListener("click", () => simulateScenario("deepfake"));
document.getElementById("btnSimReplay").addEventListener("click", () => simulateScenario("replay"));
document.getElementById("btnStopStream").addEventListener("click", stopCurrentStream);
document.getElementById("btnMic").addEventListener("click", startMicrophone);

// Initialize
connectWebSocket();
fetchAuditBlocks();
