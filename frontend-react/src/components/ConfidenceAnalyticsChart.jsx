import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Legend
} from 'recharts';
import { TrendingUp, BarChart2, ShieldAlert, CheckCircle2, SlidersHorizontal, Eye } from 'lucide-react';

const chartData = [
  { time: '+00:00:02.00', confidence: 7.2, ciLow: 5.1, ciHigh: 9.3, event: null },
  { time: '+00:00:04.50', confidence: 9.5, ciLow: 7.0, ciHigh: 12.0, event: null },
  { time: '+00:00:06.45', confidence: 11.2, ciLow: 8.9, ciHigh: 13.5, event: 'Acoustic Shift' },
  { time: '+00:00:08.64', confidence: 8.6, ciLow: 6.1, ciHigh: 11.1, event: 'Micro-Prosody' },
  { time: '+00:00:10.11', confidence: 14.8, ciLow: 11.9, ciHigh: 17.7, event: 'Pause Frame' },
  { time: '+00:00:11.77', confidence: 18.2, ciLow: 14.7, ciHigh: 21.7, event: 'Reverberation (Peak)' },
  { time: '+00:00:14.50', confidence: 15.1, ciLow: 12.3, ciHigh: 17.9, event: null },
  { time: '+00:00:18.42', confidence: 12.4, ciLow: 10.2, ciHigh: 14.6, event: 'Opus Codec' },
  { time: '+00:00:20.00', confidence: 11.0, ciLow: 9.0, ciHigh: 13.0, event: null },
];

export default function ConfidenceAnalyticsChart({ isDark = true }) {
  const [showCiBand, setShowCiBand] = useState(true);
  const [showThresholds, setShowThresholds] = useState(true);

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-3 rounded-xl border font-mono text-xs shadow-xl backdrop-blur-md ${
          isDark ? 'bg-[#0B0F17]/95 border-[#1F2937] text-white' : 'bg-white/95 border-slate-200 text-slate-900'
        }`}>
          <div className="text-[11px] text-slate-400 font-semibold mb-1">{label}</div>
          <div className="flex items-center gap-2 text-vaani-blue font-bold">
            <span>Point Confidence:</span>
            <span>{data.confidence.toFixed(1)}%</span>
          </div>
          {showCiBand && (
            <div className="text-[11px] text-slate-400 mt-0.5">
              95% CI: [{data.ciLow.toFixed(1)}% - {data.ciHigh.toFixed(1)}%]
            </div>
          )}
          {data.event && (
            <div className="mt-1 pt-1 border-t border-slate-700/60 text-[10px] text-vaani-emerald font-semibold">
              Marker: {data.event}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`w-full rounded-2xl border p-6 flex flex-col gap-5 transition-colors duration-200 ${
      isDark ? 'bg-[#111827] border-[#1F2937] shadow-card-dark' : 'bg-white border-slate-200 shadow-card-light'
    }`}>
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`text-base font-bold tracking-tight font-sans ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Confidence Over Time & Detection Trends
            </h2>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-vaani-blue/15 text-vaani-blue font-bold">
              WELCH t-TEST
            </span>
          </div>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
            Visualizing anomaly model certainty and statistical confidence envelopes across speech frames
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setShowCiBand((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showCiBand
                ? 'bg-vaani-blue/20 text-vaani-blue border-vaani-blue/40 shadow-sm'
                : isDark
                ? 'bg-dark-900 border-slate-700 text-slate-400'
                : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>95% CI Band</span>
          </button>

          <button
            onClick={() => setShowThresholds((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              showThresholds
                ? 'bg-vaani-emerald/20 text-vaani-emerald border-vaani-emerald/40 shadow-sm'
                : isDark
                ? 'bg-dark-900 border-slate-700 text-slate-400'
                : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Thresholds</span>
          </button>
        </div>
      </div>

      {/* 4 Key Diagnostic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        {/* Card 1: Trend Trajectory */}
        <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
          isDark ? 'bg-[#0B0F17]/80 border-[#1F2937]' : 'bg-slate-50 border-slate-200'
        }`}>
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-vaani-amber" />
            TREND TRAJECTORY
          </span>
          <div className="mt-1.5">
            <span className="text-base font-bold text-vaani-amber tracking-tight">Escalating</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">+1.8% session drift</span>
          </div>
        </div>

        {/* Card 2: Mean Anomaly Certainty */}
        <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
          isDark ? 'bg-[#0B0F17]/80 border-[#1F2937]' : 'bg-slate-50 border-slate-200'
        }`}>
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
            <BarChart2 className="w-3 h-3 text-vaani-blue" />
            MEAN ANOMALY CERTAINTY
          </span>
          <div className="mt-1.5">
            <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'} tabular-nums`}>13.1%</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Over 3 acoustic segments</span>
          </div>
        </div>

        {/* Card 3: Peak Anomaly Confidence */}
        <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
          isDark ? 'bg-[#0B0F17]/80 border-[#1F2937]' : 'bg-slate-50 border-slate-200'
        }`}>
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-vaani-emerald" />
            PEAK ANOMALY CONFIDENCE
          </span>
          <div className="mt-1.5">
            <span className="text-base font-bold text-vaani-emerald tabular-nums">18.2%</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">0 detections ≥ 75% threshold</span>
          </div>
        </div>

        {/* Card 4: Statistical Significance */}
        <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
          isDark ? 'bg-[#0B0F17]/80 border-[#1F2937]' : 'bg-slate-50 border-slate-200'
        }`}>
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-vaani-emerald" />
            STATISTICAL SIGNIFICANCE
          </span>
          <div className="mt-1.5">
            <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>95% CI [α = 0.05]</span>
            <span className="text-[10px] text-vaani-emerald block mt-0.5 truncate">Welch t-test hypothesis valid</span>
          </div>
        </div>
      </div>

      {/* Recharts Analytics Chart */}
      <div className="w-full h-72 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? '#1F2937' : '#E2E8F0'}
              vertical={false}
            />
            <XAxis
              dataKey="time"
              stroke={isDark ? '#94A3B8' : '#64748B'}
              fontSize={10}
              fontFamily="JetBrains Mono"
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              stroke={isDark ? '#94A3B8' : '#64748B'}
              fontSize={10}
              fontFamily="JetBrains Mono"
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Threshold Reference Lines */}
            {showThresholds && (
              <>
                <ReferenceLine
                  y={75}
                  stroke="#EF4444"
                  strokeDasharray="5 5"
                  label={{
                    value: 'Critical Threat Cutoff (75%)',
                    fill: '#EF4444',
                    fontSize: 10,
                    position: 'top',
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <ReferenceLine
                  y={25}
                  stroke="#10B981"
                  strokeDasharray="5 5"
                  label={{
                    value: 'Nominal Baseline (25%)',
                    fill: '#10B981',
                    fontSize: 10,
                    position: 'bottom',
                    fontFamily: 'JetBrains Mono',
                  }}
                />
              </>
            )}

            {/* 95% Confidence Interval Envelope Area */}
            {showCiBand && (
              <Area
                type="monotone"
                dataKey="ciHigh"
                stroke="none"
                fill="#38BDF8"
                fillOpacity={0.15}
                name="95% CI Envelope"
              />
            )}

            {/* Point Confidence Line */}
            <Line
              type="monotone"
              dataKey="confidence"
              stroke="#38BDF8"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#38BDF8', strokeWidth: 2, stroke: isDark ? '#0B0F17' : '#FFFFFF' }}
              activeDot={{ r: 6, fill: '#38BDF8', stroke: '#FFFFFF', strokeWidth: 2 }}
              name="Point Confidence"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
