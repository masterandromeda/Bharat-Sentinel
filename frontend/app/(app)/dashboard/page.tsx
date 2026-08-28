'use client';
import { useEffect, useState, useCallback } from 'react';
import { getIncidents, getAgentsStatus, Incident, AgentStatus, postTestEvents } from '@/lib/api';
import { useWebSocket, WsMessage } from '@/lib/useWebSocket';
import { useMonitoring } from '@/lib/useMonitoring';
import StatCard from '@/components/StatCard';
import Badge from '@/components/Badge';
import DemoButton from '@/components/DemoButton';
import Link from 'next/link';

// ── Event state badge ──────────────────────────────────────────────────────────
const STATE_LABEL: Record<string, string> = {
  RECEIVED: 'Received',
  ANALYZING: 'Analyzing',
  INVESTIGATING: 'Investigating',
  RISK_ASSESSMENT: 'Risk Assess.',
  INCIDENT_CREATED: 'Incident Created',
  COMPLETED: 'Completed',
  ERROR: 'Error',
};

function EventStateBadge({ state }: { state: string }) {
  return (
    <span className={`es-badge es-${state}`}>
      <span className="es-dot-pulse" />
      {STATE_LABEL[state] ?? state}
    </span>
  );
}

// ── Live event feed item ───────────────────────────────────────────────────────
function EventFeedItem({ msg, isNew }: { msg: WsMessage; isNew: boolean }) {
  const ts = msg.timestamp
    ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';

  if (msg.type === 'connected') {
    return (
      <div className={`flex items-center gap-3 px-3 py-2 rounded-lg bg-white/2 ${isNew ? 'bs-event-row-new' : ''}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
        <span className="text-xs text-[#4a5f7a] flex-1">WebSocket connected — monitoring active</span>
        <span className="text-[10px] text-[#2d3f5a] shrink-0">{ts}</span>
      </div>
    );
  }

  const label = msg.event_type
    ? msg.event_type.replace(/_/g, ' ')
    : (msg.threat_type ?? 'security event');

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg bg-white/2 hover:bg-white/4 transition-colors ${isNew ? 'bs-event-row-new' : ''}`}>
      <div className="shrink-0">
        <EventStateBadge state={msg.state ?? 'RECEIVED'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#c4cdd8] truncate capitalize">{label}</p>
        {msg.source_ip && (
          <p className="text-[10px] text-[#3d5070] mt-0.5 font-mono">{msg.source_ip}</p>
        )}
      </div>
      <span className="text-[10px] text-[#2d3f5a] shrink-0">{ts}</span>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [agents, setAgents] = useState<AgentStatus | null>(null);
  const [loadError, setLoadError] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const { connected, messages, clearMessages } = useWebSocket();
  const { status: monStatus, backendOnline } = useMonitoring();

  const loadData = useCallback(async () => {
    try {
      const [incRes, agRes] = await Promise.all([getIncidents(), getAgentsStatus()]);
      setIncidents(incRes.data);
      setAgents(agRes.data);
      setLoadError('');
    } catch {
      setLoadError('Cannot connect to backend — make sure the API server is running on port 8080.');
    }
  }, []);

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 15000);
    return () => clearInterval(t);
  }, [loadData]);

  // Refresh incidents list when a new COMPLETED or INCIDENT_CREATED WS message arrives
  useEffect(() => {
    const latest = messages[0];
    if (latest && (latest.state === 'COMPLETED' || latest.state === 'INCIDENT_CREATED')) {
      setTimeout(loadData, 800);
    }
  }, [messages, loadData]);

  // ── Derived metrics (all from real data) ──────────────────────────────────
  const active = incidents.filter(i => i.status === 'awaiting_approval').length;
  const critical = incidents.filter(i => i.risk_level === 'critical').length;
  const pending = incidents.filter(i => i.human_approval === 'pending').length;
  const avgRisk = incidents.length
    ? Math.round(incidents.reduce((a, b) => a + b.risk_score, 0) / incidents.length)
    : 0;
  const securityScore = Math.max(0, 100 - avgRisk);

  const eventsReceived = monStatus?.events_received ?? 0;
  const eventsProcessed = monStatus?.events_processed ?? 0;
  const threatsDetected = monStatus?.threats_detected ?? 0;
  const uptime = monStatus?.uptime ?? '--:--:--';
  const wsConnections = monStatus?.websocket_connections ?? 0;

  const handleSendTest = async () => {
    setSendingTest(true);
    try {
      await postTestEvents(1);
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="max-w-7xl">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Security Operations Center</h1>
          <p className="text-[#64748b] text-sm mt-1">
            Real-time threat detection · AI-native investigation · Human-controlled response
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSendTest}
            disabled={sendingTest || !backendOnline}
            className="px-4 py-2 rounded-lg border border-[#1e2d4a] bg-white/3 hover:bg-white/6 text-xs font-semibold text-[#64748b] hover:text-[#93c5fd] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sendingTest ? 'Sending…' : '⚡ Send Test Event'}
          </button>
          <DemoButton onSuccess={() => { setTimeout(loadData, 600); }} />
        </div>
      </div>

      {loadError && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          ⚠ {loadError}
        </div>
      )}

      {/* ── 6-stat SOC overview row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-8">
        <StatCard
          title="Security Score"
          value={`${securityScore}/100`}
          subtitle={securityScore >= 70 ? 'Good posture' : 'Needs attention'}
          accent={securityScore >= 70 ? 'text-green-400' : 'text-yellow-400'}
          accentBar={securityScore >= 70 ? 'green' : 'yellow'}
          icon="◎"
        />
        <StatCard
          title="Active Incidents"
          value={active}
          subtitle="Awaiting approval"
          accent="text-blue-400"
          accentBar="blue"
          icon="⚡"
        />
        <StatCard
          title="Critical Risks"
          value={critical}
          subtitle="Immediate action"
          accent="text-red-400"
          accentBar="red"
          icon="▲"
        />
        <StatCard
          title="Pending Approval"
          value={pending}
          subtitle="Human review"
          accent="text-yellow-400"
          accentBar="yellow"
          icon="◷"
        />
        <StatCard
          title="Events Received"
          value={eventsReceived}
          subtitle={`${eventsProcessed} processed`}
          accent="text-purple-400"
          accentBar="purple"
          icon="▤"
        />
        <StatCard
          title="Threats Found"
          value={threatsDetected}
          subtitle={`Uptime ${uptime}`}
          accent="text-cyan-400"
          accentBar="blue"
          icon="◉"
        />
      </div>

      {/* ── Main two-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Left: Live event feed (WebSocket) */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col" style={{ minHeight: 340 }}>
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-[#e2e8f0] uppercase tracking-wide">Live Event Stream</h2>
              <span className={connected ? 'bs-ws-connected' : 'bs-ws-disconnected'}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: connected ? '#34d399' : '#64748b', display: 'inline-block' }} />
                {connected ? 'Live' : 'Reconnecting…'}
              </span>
            </div>
            <button
              onClick={clearMessages}
              className="text-[10px] text-[#2d3f5a] hover:text-[#64748b] transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5" style={{ maxHeight: 280 }}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <p className="text-[#3d5070] text-sm">Waiting for events…</p>
                <p className="text-[#2d3f5a] text-xs mt-1">
                  {connected
                    ? 'Click "Send Test Event" or "Run Demo Incident" to see the live stream'
                    : 'Connecting to backend WebSocket...'}
                </p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <EventFeedItem key={`${msg.event_id}-${msg.state}-${i}`} msg={msg} isNew={i === 0} />
              ))
            )}
          </div>
        </div>

        {/* Right: AI Agents Status */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-[#e2e8f0] uppercase tracking-wide mb-4">AI Agents</h2>
          {agents ? (
            <div className="space-y-3">
              {agents.agents.map(agent => (
                <div key={agent.name} className="p-3 rounded-lg bg-white/3 border border-[#1e2d4a]">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-[#c4cdd8] truncate pr-2">{agent.name}</p>
                    <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                  </div>
                  <p className="text-[10px] text-[#3d5070] mt-1 uppercase tracking-wide">{agent.mode}</p>
                </div>
              ))}
              <div className="pt-2 border-t border-[#1e2d4a] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#3d5070]">Notion</span>
                  <span className={`text-[10px] font-semibold ${agents.notion_integration === 'connected' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {agents.notion_integration}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#3d5070]">LLM</span>
                  <span className="text-[10px] font-semibold text-blue-400">{agents.llm_backend}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[#3d5070] text-xs">Connecting to backend…</p>
          )}
        </div>
      </div>

      {/* ── Bottom row: Recent Incidents + System Status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent incidents */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#e2e8f0] uppercase tracking-wide">Recent Incidents</h2>
            <Link href="/incidents" className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
          </div>
          {incidents.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[#3d5070] text-sm">No incidents yet.</p>
              <p className="text-[#2d3f5a] text-xs mt-1">Click <strong>Run Demo Incident</strong> to see the full workflow.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {incidents.slice(0, 5).map(inc => (
                <Link key={inc.id} href={`/incidents/${inc.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg bg-white/2 hover:bg-white/5 border border-transparent hover:border-[#1e2d4a] transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#c4cdd8] truncate">{inc.threat_type}</p>
                    <p className="text-[10px] text-[#3d5070] mt-0.5 truncate">
                      {inc.investigation_summary?.slice(0, 72) ?? ''}…
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge value={inc.severity} type="severity" />
                    <span className="text-[10px] text-[#2d3f5a]">
                      {new Date(inc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* System status */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-semibold text-[#e2e8f0] uppercase tracking-wide mb-4">System Status</h2>
          <div>
            <div className="bs-sys-row">
              <span className="bs-sys-label">Backend API</span>
              <span className={backendOnline ? 'bs-sys-val-ok' : 'bs-sys-val-err'}>
                {backendOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="bs-sys-row">
              <span className="bs-sys-label">WebSocket</span>
              <span className={connected ? 'bs-sys-val-ok' : 'bs-sys-val-warn'}>
                {connected ? 'Connected' : 'Reconnecting'}
              </span>
            </div>
            <div className="bs-sys-row">
              <span className="bs-sys-label">AI Engine</span>
              <span className="bs-sys-val-info">{monStatus?.llm_backend ?? '—'}</span>
            </div>
            <div className="bs-sys-row">
              <span className="bs-sys-label">WS Clients</span>
              <span className="bs-sys-val-info">{wsConnections}</span>
            </div>
            <div className="bs-sys-row">
              <span className="bs-sys-label">Uptime</span>
              <span className="text-[#64748b] font-mono text-xs">{uptime}</span>
            </div>
            <div className="bs-sys-row">
              <span className="bs-sys-label">Notion</span>
              <span className={agents?.notion_integration === 'connected' ? 'bs-sys-val-ok' : 'bs-sys-val-warn'}>
                {agents?.notion_integration ?? '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
