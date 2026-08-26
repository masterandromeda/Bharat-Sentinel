'use client';
import { useState } from 'react';
import { generateReport } from '@/lib/api';

interface Report {
  generated_at: string;
  total_incidents: number;
  critical_incidents: number;
  high_incidents: number;
  average_risk_score: number;
  approval_summary: { approved: number; rejected: number; pending: number };
  severity_breakdown: Record<string, number>;
  incidents: Array<{
    id: string;
    threat_type: string;
    severity: string;
    risk_score: number;
    human_approval: string;
    status: string;
    created_at: string;
  }>;
}

export default function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await generateReport();
      setReport(r.data);
    } catch {
      setError('Failed to generate report. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Reports & Audit</h1>
          <p className="text-[#64748b] text-sm mt-1">Generate security audit reports and incident summaries</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-500 hover:to-purple-600 text-white font-semibold text-sm rounded-lg transition disabled:opacity-60"
        >
          {loading ? 'Generating...' : '↓ Generate Report'}
        </button>
      </div>

      {error && <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">⚠ {error}</div>}

      {!report && !loading && (
        <div className="glass-card p-12 text-center">
          <p className="text-[#64748b]">No report generated yet.</p>
          <p className="text-[#64748b] text-sm mt-2">Click <strong className="text-blue-400">Generate Report</strong> to create an audit summary.</p>
        </div>
      )}

      {report && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[#e2e8f0] uppercase tracking-wide">Executive Summary</h2>
              <span className="text-xs text-[#64748b]">Generated: {new Date(report.generated_at).toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryItem label="Total Incidents" value={report.total_incidents} color="text-blue-400" />
              <SummaryItem label="Critical" value={report.critical_incidents} color="text-red-400" />
              <SummaryItem label="High Severity" value={report.high_incidents} color="text-yellow-400" />
              <SummaryItem label="Avg. Risk Score" value={`${report.average_risk_score}/100`} color="text-purple-400" />
            </div>
          </div>

          {/* Approval breakdown */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-semibold text-[#e2e8f0] uppercase tracking-wide mb-4">Approval Summary</h2>
            <div className="grid grid-cols-3 gap-4">
              <SummaryItem label="Approved" value={report.approval_summary.approved} color="text-green-400" />
              <SummaryItem label="Rejected" value={report.approval_summary.rejected} color="text-red-400" />
              <SummaryItem label="Pending" value={report.approval_summary.pending} color="text-yellow-400" />
            </div>
          </div>

          {/* Severity breakdown */}
          {Object.keys(report.severity_breakdown).length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-sm font-semibold text-[#e2e8f0] uppercase tracking-wide mb-4">Severity Breakdown</h2>
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(report.severity_breakdown).map(([sev, count]) => (
                  <div key={sev} className="text-center p-3 rounded-lg bg-white/3 border border-[#1e2d4a]">
                    <p className="text-lg font-bold text-[#e2e8f0]">{count}</p>
                    <p className="text-xs text-[#64748b] capitalize mt-1">{sev}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Incident table */}
          {report.incidents.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-[#1e2d4a]">
                <h2 className="text-sm font-semibold text-[#e2e8f0] uppercase tracking-wide">Incident Log</h2>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1e2d4a]">
                    {['ID', 'Threat', 'Severity', 'Risk', 'Approval', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] uppercase text-[#64748b]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.incidents.map(inc => (
                    <tr key={inc.id} className="border-b border-[#1e2d4a]/50">
                      <td className="px-4 py-3 font-mono text-xs text-[#64748b]">{inc.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-sm text-[#e2e8f0] truncate max-w-xs">{inc.threat_type}</td>
                      <td className="px-4 py-3 text-xs capitalize text-[#e2e8f0]">{inc.severity}</td>
                      <td className="px-4 py-3 text-xs text-[#e2e8f0]">{Math.round(inc.risk_score)}</td>
                      <td className="px-4 py-3 text-xs capitalize text-[#e2e8f0]">{inc.human_approval}</td>
                      <td className="px-4 py-3 text-xs text-[#64748b]">{new Date(inc.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryItem({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="text-center p-4 rounded-lg bg-white/3 border border-[#1e2d4a]">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-[#64748b] mt-1">{label}</p>
    </div>
  );
}
