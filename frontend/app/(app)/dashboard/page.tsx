'use client';
import { useEffect, useState, useCallback } from 'react';
import { getIncidents, getAgentsStatus, Incident, AgentStatus } from '@/lib/api';
import StatCard from '@/components/StatCard';
import Badge from '@/components/Badge';
import DemoButton from '@/components/DemoButton';
import Link from 'next/link';

export default function DashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [agents, setAgents] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [incRes, agRes] = await Promise.all([getIncidents(), getAgentsStatus()]);
      setIncidents(incRes.data);
      setAgents(agRes.data);
    } catch {
      setError('Cannot connect to backend. Make sure the API is running on port 8000.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const active = incidents.filter(i => i.status === 'awaiting_approval').length;
  const critical = incidents.filter(i => i.risk_level === 'critical').length;
  const pending = incidents.filter(i => i.human_approval === 'pending').length;
  const avgRisk = incidents.length
    ? Math.round(incidents.reduce((a, b) => a + b.risk_score, 0) / incidents.length)
    : 0;

  const securityScore = Math.max(0, 100 - avgRisk);

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Security Dashboard</h1>
          <p className="text-[#64748b] text-sm mt-1">AI-native threat detection and response</p>
        </div>
        <DemoButton onSuccess={() => { setTimeout(loadData, 500); }} />
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Security Score"
          value={`${securityScore}/100`}
          subtitle={securityScore >= 70 ? 'Good posture' : 'Needs attention'}
          accent={securityScore >= 70 ? 'text-green-400' : 'text-yellow-400'}
          icon="◎"
        />
        <StatCard
          title="Active Incidents"
          value={active}
          subtitle="Awaiting approval"
          accent="text-blue-400"
          icon="⚡"
        />
        <StatCard
          title="Critical Risks"
          value={critical}
          subtitle="Immediate action required"
          accent="text-red-400"
          icon="🔴"
        />
        <StatCard
          title="Pending Approval"
          value={pending}
          subtitle="Human review needed"
          accent="text-yellow-400"
          icon="⏳"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Events */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#e2e8f0] uppercase tracking-wide">Recent Security Events</h2>
            <Link href="/incidents" className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
          </div>

          {loading ? (
            <p className="text-[#64748b] text-sm py-8 text-center">Loading incidents...</p>
          ) : incidents.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[#64748b] text-sm">No incidents yet.</p>
              <p className="text-[#64748b] text-xs mt-1">Click <strong>Run Demo Incident</strong> to see the full workflow.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.slice(0, 6).map(inc => (
                <Link key={inc.id} href={`/incidents/${inc.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg bg-white/3 hover:bg-white/5 border border-transparent hover:border-[#1e2d4a] transition-all cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#e2e8f0] truncate">{inc.threat_type}</p>
                    <p className="text-xs text-[#64748b] mt-0.5 truncate">{inc.investigation_summary?.slice(0, 80)}...</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge value={inc.severity} type="severity" />
                    <span className="text-[10px] text-[#64748b]">{new Date(inc.created_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Agents Status */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-[#e2e8f0] uppercase tracking-wide mb-4">AI Agents Status</h2>
          {agents ? (
            <div className="space-y-3">
              {agents.agents.map(agent => (
                <div key={agent.name} className="p-3 rounded-lg bg-white/3 border border-[#1e2d4a]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-[#e2e8f0] truncate">{agent.name}</p>
                    <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                  </div>
                  <p className="text-[10px] text-[#64748b] mt-1">{agent.mode} mode</p>
                </div>
              ))}
              <div className="pt-2 border-t border-[#1e2d4a]">
                <p className="text-[10px] text-[#64748b]">
                  Notion: <span className={agents.notion_integration === 'connected' ? 'text-green-400' : 'text-yellow-400'}>
                    {agents.notion_integration}
                  </span>
                </p>
                <p className="text-[10px] text-[#64748b] mt-0.5">
                  LLM: <span className="text-blue-400">{agents.llm_backend}</span>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[#64748b] text-xs">Connecting...</p>
          )}
        </div>
      </div>
    </div>
  );
}
