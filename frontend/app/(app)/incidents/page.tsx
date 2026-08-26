'use client';
import { useEffect, useState, useCallback } from 'react';
import { getIncidents, Incident } from '@/lib/api';
import Badge from '@/components/Badge';
import Link from 'next/link';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await getIncidents();
      setIncidents(r.data);
    } catch {
      setError('Cannot connect to backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Incidents</h1>
          <p className="text-[#64748b] text-sm mt-1">All detected security incidents</p>
        </div>
        <button onClick={load} className="text-xs text-blue-400 hover:text-blue-300 border border-blue-600/30 px-3 py-1.5 rounded-lg">
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">⚠ {error}</div>
      )}

      {loading ? (
        <p className="text-[#64748b] text-sm text-center py-16">Loading incidents...</p>
      ) : incidents.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-[#64748b]">No incidents found.</p>
          <p className="text-[#64748b] text-sm mt-2">Go to the Dashboard and click <strong className="text-blue-400">Run Demo Incident</strong>.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e2d4a]">
                {['ID', 'Threat Type', 'Severity', 'Risk Score', 'Approval', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wide text-[#64748b] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {incidents.map(inc => (
                <tr key={inc.id} className="border-b border-[#1e2d4a]/50 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-[#64748b]">{inc.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-sm text-[#e2e8f0] max-w-xs truncate">{inc.threat_type}</td>
                  <td className="px-4 py-3"><Badge value={inc.severity} type="severity" /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-[#1e2d4a]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${inc.risk_score}%`,
                            background: inc.risk_score >= 75 ? '#ef4444' : inc.risk_score >= 50 ? '#f59e0b' : '#3b82f6',
                          }}
                        />
                      </div>
                      <span className="text-xs text-[#64748b]">{Math.round(inc.risk_score)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge value={inc.human_approval} type="approval" /></td>
                  <td className="px-4 py-3"><Badge value={inc.status} type="status" /></td>
                  <td className="px-4 py-3 text-xs text-[#64748b]">{new Date(inc.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Link href={`/incidents/${inc.id}`} className="text-xs text-blue-400 hover:text-blue-300">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
