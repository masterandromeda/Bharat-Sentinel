'use client';
import { useEffect, useState, useCallback } from 'react';
import { getIncident, approveIncident, rejectIncident, Incident } from '@/lib/api';
import Badge from '@/components/Badge';
import { useRouter } from 'next/navigation';

export default function IncidentDetailPage({ params }: { params: { id: string } }) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const r = await getIncident(params.id);
      setIncident(r.data);
    } catch {
      setError('Incident not found.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await approveIncident(params.id, notes);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail || 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setApproving(true);
    try {
      await rejectIncident(params.id, notes);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail || 'Rejection failed');
    } finally {
      setApproving(false);
    }
  };

  if (loading) return <div className="text-[#64748b] text-sm py-16 text-center">Loading incident...</div>;
  if (!incident) return <div className="text-red-400 py-8">{error || 'Incident not found'}</div>;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <button onClick={() => router.back()} className="text-xs text-[#64748b] hover:text-blue-400 mb-2">← Back to Incidents</button>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">{incident.threat_type}</h1>
          <p className="text-[#64748b] text-xs mt-1 font-mono">{incident.id}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge value={incident.severity} type="severity" />
          <Badge value={incident.human_approval} type="approval" />
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Risk score */}
        <div className="glass-card p-5 text-center">
          <p className="text-[#64748b] text-xs uppercase tracking-wide">Risk Score</p>
          <p className="text-4xl font-bold mt-2" style={{
            color: incident.risk_score >= 75 ? '#ef4444' : incident.risk_score >= 50 ? '#f59e0b' : '#3b82f6'
          }}>
            {Math.round(incident.risk_score)}
          </p>
          <Badge value={incident.risk_level} type="severity" className="mt-2" />
        </div>
        {/* Confidence */}
        <div className="glass-card p-5 text-center">
          <p className="text-[#64748b] text-xs uppercase tracking-wide">Confidence</p>
          <p className="text-4xl font-bold mt-2 text-purple-400">{Math.round(incident.confidence)}%</p>
          <p className="text-[#64748b] text-xs mt-2">AI detection confidence</p>
        </div>
        {/* Status */}
        <div className="glass-card p-5 text-center">
          <p className="text-[#64748b] text-xs uppercase tracking-wide">Status</p>
          <div className="mt-3"><Badge value={incident.status} type="status" /></div>
          <p className="text-[#64748b] text-xs mt-2">{new Date(incident.updated_at).toLocaleString()}</p>
        </div>
      </div>

      {/* Investigation Details */}
      <div className="grid gap-4 mb-6">
        <Section title="Incident Summary" content={incident.investigation_summary} />
        <Section title="Root Cause Analysis" content={incident.root_cause} />
        <Section title="Business Impact" content={incident.business_impact} />
        <Section title="Recommendation" content={incident.recommendation} accent />
      </div>

      {/* Notion */}
      {incident.notion_page_id && (
        <div className="glass-card p-4 mb-6 flex items-center gap-3">
          <span className="text-lg">📝</span>
          <div>
            <p className="text-sm text-[#e2e8f0]">Notion Incident Created</p>
            <p className="text-xs text-[#64748b] font-mono mt-0.5">{incident.notion_page_id}</p>
          </div>
          <span className="ml-auto text-xs text-green-400">✓ Synced</span>
        </div>
      )}

      {/* Human Approval */}
      {incident.human_approval === 'pending' ? (
        <div className="glass-card p-6 border border-yellow-600/30 bg-yellow-500/5">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-1">Human Approval Required</h3>
          <p className="text-[#64748b] text-xs mb-4">Review the AI findings above and approve or reject the suggested response action.</p>

          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional notes (reason for approval/rejection)..."
            className="w-full bg-[#0a0e1a] border border-[#1e2d4a] rounded-lg p-3 text-sm text-[#e2e8f0] placeholder-[#64748b] resize-none focus:outline-none focus:border-blue-600/50 mb-4"
            rows={3}
          />

          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={approving}
              className="flex-1 py-2.5 rounded-lg bg-green-600/20 border border-green-600/40 text-green-400 text-sm font-semibold hover:bg-green-600/30 transition disabled:opacity-60"
            >
              {approving ? 'Processing...' : '✓ Approve — Mark Contained'}
            </button>
            <button
              onClick={handleReject}
              disabled={approving}
              className="flex-1 py-2.5 rounded-lg bg-red-600/20 border border-red-600/40 text-red-400 text-sm font-semibold hover:bg-red-600/30 transition disabled:opacity-60"
            >
              {approving ? 'Processing...' : '✗ Reject — Dismiss'}
            </button>
          </div>
        </div>
      ) : (
        <div className={`glass-card p-4 border ${incident.human_approval === 'approved' ? 'border-green-600/30 bg-green-500/5' : 'border-red-600/30 bg-red-500/5'}`}>
          <p className="text-sm font-semibold text-[#e2e8f0]">
            {incident.human_approval === 'approved' ? '✓ Incident Approved & Contained' : '✗ Incident Rejected'}
          </p>
          <p className="text-xs text-[#64748b] mt-1">Updated: {new Date(incident.updated_at).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}

function Section({ title, content, accent }: { title: string; content: string; accent?: boolean }) {
  return (
    <div className="glass-card p-5">
      <p className="text-[10px] uppercase tracking-wide text-[#64748b] font-medium mb-2">{title}</p>
      <p className={`text-sm leading-relaxed ${accent ? 'text-blue-300' : 'text-[#e2e8f0]'}`}>{content}</p>
    </div>
  );
}
