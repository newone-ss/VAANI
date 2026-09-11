import React, { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileJson,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Flame,
  ChevronDown,
  Info
} from 'lucide-react';

export const INITIAL_ANOMALY_DATA = [
  {
    id: 'anom-1',
    timestamp: '2026-09-09 13:08:58.114 UTC',
    offset: '+00:00:18.42',
    frame: 'Frame #11,842',
    vector: 'Sub-Perceptual Opus Codec Quantization',
    category: 'Spectral',
    segment: "Vowel \\i:\\/ in 'Geneva Portfolio'",
    confidence: '12.4%',
    ciRange: '[±1.1%] 95% CI [10.2% - 14.6%]',
    pValue: 'p = 0.012',
    observed: '0.032 spectral distortion',
    baseline: 'Base: 0.010 ± 0.005',
    severity: 'nominal',
    badge: 'NOMINAL / Benign Human',
  },
  {
    id: 'anom-2',
    timestamp: '2026-09-09 13:08:51.462 UTC',
    offset: '+00:00:11.77',
    frame: 'Frame #7,535',
    vector: 'Room-Acoustic Reverberation Decay',
    category: 'Acoustic',
    segment: 'Pause between [0:10-0:11]',
    confidence: '18.2%',
    ciRange: '[±1.5%] 95% CI [14.7% - 21.7%]',
    pValue: 'p = 0.004',
    observed: 'RT60 = 240 ms (Glass conference room)',
    baseline: 'Base: 210 ± 40 ms',
    severity: 'nominal',
    badge: 'NOMINAL / Benign Human',
  },
  {
    id: 'anom-3',
    timestamp: '2026-09-09 13:08:48.330 UTC',
    offset: '+00:00:08.64',
    frame: 'Frame #5,783',
    vector: 'Micro-Prosody Normal Emotional Variation',
    category: 'Prosody',
    segment: "Sentence stress on 'affirmative'",
    confidence: '8.6%',
    ciRange: '[±1.3%] 95% CI [6.1% - 11.1%]',
    pValue: 'p = 0.035',
    observed: '0.280 semitone human jitter',
    baseline: 'Base: 0.250 ± 0.050 semitones',
    severity: 'nominal',
    badge: 'NOMINAL / Benign Human',
  },
];

const SAMPLE_CRITICAL_ROW = {
  id: 'anom-sim-critical',
  timestamp: '2026-09-09 13:09:02.890 UTC',
  offset: '+00:00:22.18',
  frame: 'Frame #14,204',
  vector: 'ElevenLabs Neural Vocoder Phase Stitching',
  category: 'Spectral',
  segment: "Phoneme cluster in 'Transfer Authorization'",
  confidence: '94.8%',
  ciRange: '[±0.8%] 95% CI [93.2% - 96.4%]',
  pValue: 'p < 0.0001',
  observed: '0.884 vocoder discontinuity glitch',
  baseline: 'Base: 0.012 ± 0.004',
  severity: 'critical',
  badge: 'CRITICAL / Synthetic Clone Detected',
};

export default function AnomalyForensicsTable({ isDark = true, onSelectAnomaly }) {
  const [data, setData] = useState(INITIAL_ANOMALY_DATA);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedVector, setSelectedVector] = useState('all');
  const [hasInjectedSample, setHasInjectedSample] = useState(false);

  // Toggle sample anomaly
  const handleToggleSample = () => {
    if (hasInjectedSample) {
      setData(INITIAL_ANOMALY_DATA);
      setHasInjectedSample(false);
    } else {
      setData([SAMPLE_CRITICAL_ROW, ...INITIAL_ANOMALY_DATA]);
      setHasInjectedSample(true);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Timestamp',
      'Offset',
      'Frame',
      'Vector',
      'Category',
      'Segment',
      'Confidence',
      'Confidence Interval',
      'p-Value',
      'Observed Metrics',
      'Baseline',
      'Classification'
    ];
    const rows = filteredData.map(r => [
      `"${r.timestamp}"`,
      `"${r.offset}"`,
      `"${r.frame}"`,
      `"${r.vector}"`,
      `"${r.category}"`,
      `"${r.segment}"`,
      `"${r.confidence}"`,
      `"${r.ciRange}"`,
      `"${r.pValue}"`,
      `"${r.observed}"`,
      `"${r.baseline}"`,
      `"${r.badge}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `vaani_forensics_elena_rostova_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON
  const handleExportJSON = () => {
    const jsonContent = JSON.stringify({
      subject: 'Elena Rostova',
      callId: 'CH-8829-019',
      exportTimestamp: new Date().toISOString(),
      forensicAnomalies: filteredData
    }, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `vaani_forensics_elena_rostova_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered dataset
  const filteredData = data.filter((item) => {
    const matchesSearch =
      searchQuery === '' ||
      item.vector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.segment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.timestamp.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.frame.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity =
      selectedSeverity === 'all' || item.severity.toLowerCase() === selectedSeverity.toLowerCase();

    const matchesVector =
      selectedVector === 'all' || item.category.toLowerCase() === selectedVector.toLowerCase();

    return matchesSearch && matchesSeverity && matchesVector;
  });

  return (
    <div className={`w-full rounded-2xl border flex flex-col transition-colors duration-200 overflow-hidden ${
      isDark ? 'bg-[#111827] border-[#1F2937] shadow-card-dark' : 'bg-white border-slate-200 shadow-card-light'
    }`}>
      {/* Table Control Bar */}
      <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
        isDark ? 'border-[#1F2937] bg-[#0B0F17]/60' : 'border-slate-200 bg-slate-50/70'
      }`}>
        {/* Left Filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="search anomaly vector, phoneme, timestamp, or frame..."
              className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs font-mono transition-colors outline-none border ${
                isDark
                  ? 'bg-[#111827] border-[#1F2937] text-slate-200 placeholder-slate-500 focus:border-vaani-blue'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-sky-500'
              }`}
            />
          </div>

          {/* Severity Dropdown */}
          <div className="relative">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className={`appearance-none text-xs font-mono pl-3 pr-8 py-2 rounded-lg border outline-none cursor-pointer transition-colors ${
                isDark
                  ? 'bg-[#111827] border-[#1F2937] text-slate-300 hover:border-slate-600'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <option value="all">Severity: All Severities</option>
              <option value="nominal">Nominal / Benign</option>
              <option value="critical">Critical / Threat</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Vector Dropdown */}
          <div className="relative">
            <select
              value={selectedVector}
              onChange={(e) => setSelectedVector(e.target.value)}
              className={`appearance-none text-xs font-mono pl-3 pr-8 py-2 rounded-lg border outline-none cursor-pointer transition-colors ${
                isDark
                  ? 'bg-[#111827] border-[#1F2937] text-slate-300 hover:border-slate-600'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <option value="all">Vector: All Categories</option>
              <option value="spectral">Spectral</option>
              <option value="acoustic">Acoustic</option>
              <option value="prosody">Prosody</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Sample Anomaly Button */}
          <button
            onClick={handleToggleSample}
            className={`px-3 py-2 rounded-lg border flex items-center gap-1.5 transition-all active:scale-95 ${
              hasInjectedSample
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                : isDark
                ? 'bg-[#111827] border-[#1F2937] text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Inject simulated deepfake test event"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{hasInjectedSample ? 'Clear Sample' : 'Sample Anomaly'}</span>
          </button>

          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            className={`px-3 py-2 rounded-lg border flex items-center gap-1.5 transition-all active:scale-95 ${
              isDark
                ? 'bg-[#111827] border-[#1F2937] text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Download forensics as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-vaani-emerald" />
            <span>CSV Export</span>
          </button>

          {/* JSON Export Button */}
          <button
            onClick={handleExportJSON}
            className={`px-3 py-2 rounded-lg border flex items-center gap-1.5 transition-all active:scale-95 ${
              isDark
                ? 'bg-[#111827] border-[#1F2937] text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Download forensics telemetry as JSON"
          >
            <FileJson className="w-3.5 h-3.5 text-vaani-blue" />
            <span>JSON Export</span>
          </button>
        </div>
      </div>

      {/* Forensic Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse font-sans">
          <thead>
            <tr className={`border-b text-[11px] font-mono uppercase tracking-wider font-semibold ${
              isDark ? 'border-[#1F2937] bg-[#0B0F17]/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}>
              <th className="py-3 px-4">Timestamp & Frame</th>
              <th className="py-3 px-4">Vector & Layer</th>
              <th className="py-3 px-4">Segment / Phoneme</th>
              <th className="py-3 px-4">Confidence & 95% CI</th>
              <th className="py-3 px-4">Observed Metric vs Baseline</th>
              <th className="py-3 px-4 text-right">Classification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 font-mono text-xs">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No anomaly detections matched your filter query.
                </td>
              </tr>
            ) : (
              filteredData.map((row) => {
                const isCritical = row.severity === 'critical';
                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelectAnomaly && onSelectAnomaly(row)}
                    className={`transition-colors cursor-pointer group ${
                      isCritical
                        ? isDark
                          ? 'bg-red-950/20 hover:bg-red-950/40 border-l-4 border-l-vaani-coral'
                          : 'bg-red-50/60 hover:bg-red-100/60 border-l-4 border-l-red-500'
                        : isDark
                        ? 'hover:bg-slate-800/40 border-l-4 border-l-transparent'
                        : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                    }`}
                  >
                    {/* Timestamp & Frame */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                        {row.timestamp}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span className="text-vaani-blue font-semibold">{row.offset}</span>
                        <span>•</span>
                        <span className="text-slate-400">{row.frame}</span>
                      </div>
                    </td>

                    {/* Vector & Category */}
                    <td className="py-3.5 px-4">
                      <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'} max-w-xs truncate`}>
                        {row.vector}
                      </div>
                      <div className="mt-1">
                        <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${
                          row.category === 'Spectral'
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                            : row.category === 'Acoustic'
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          [{row.category}]
                        </span>
                      </div>
                    </td>

                    {/* Speech Segment */}
                    <td className="py-3.5 px-4 font-sans text-xs">
                      <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {row.segment}
                      </span>
                    </td>

                    {/* Confidence & Statistics */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm tabular-nums ${
                          isCritical ? 'text-vaani-coral' : 'text-vaani-emerald'
                        }`}>
                          {row.confidence}
                        </span>
                        <span className="text-[10px] text-slate-400">{row.pValue}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        {row.ciRange}
                      </div>
                    </td>

                    {/* Observed vs Baseline */}
                    <td className="py-3.5 px-4">
                      <div className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {row.observed}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {row.baseline}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                        isCritical
                          ? 'bg-vaani-coral/15 border-vaani-coral/30 text-vaani-coral animate-pulse'
                          : 'bg-vaani-emerald/15 border-vaani-emerald/30 text-vaani-emerald'
                      }`}>
                        {isCritical ? (
                          <Flame className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{row.badge}</span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className={`p-3.5 border-t flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] ${
        isDark ? 'border-[#1F2937] bg-[#0B0F17]/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
      }`}>
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-vaani-blue" />
          <span>Showing {filteredData.length} of {data.length} anomaly detections for Elena Rostova</span>
        </div>
        <div className="text-slate-400">
          Confidence Interval: Student's t-distribution α=0.05
        </div>
      </div>
    </div>
  );
}
