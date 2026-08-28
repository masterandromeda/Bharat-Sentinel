'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getIncidents, getAgentsStatus, Incident, AgentStatus,
  postTestEvents, generateReport,
} from '@/lib/api';
import { useWebSocket, WsMessage } from '@/lib/useWebSocket';
import { useMonitoring } from '@/lib/useMonitoring';
import DemoButton from '@/components/DemoButton';
import Link from 'next/link';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function riskColor(score: number): string {
  if (score >= 80) return '#f87171';
  if (score >= 60) return '#fbbf24';
  if (score >= 40) return '#60a5fa';
  return '#34d399';
}

const SEV_ICON: Record<string, { icon: string; cls: string }> = {
  critical: { icon: '⊗', cls: 'feed-icon-critical' },
  high:     { icon: '▲', cls: 'feed-icon-high' },
  medium:   { icon: '◈', cls: 'feed-icon-medium' },
  low:      { icon: '◉', cls: 'feed-icon-low' },
};

// ─── Sparkline SVG ────────────────────────────────────────────────────────────
function Sparkline({ color, points }: { color: string; points: number[] }) {
  if (!points.length) return null;
  const w = 120, h = 32;
  const max = Math.max(...points, 1);
  const step = w / (points.length - 1);
  const pts = points.map((v, i) => `${i * step},${h - (v / max) * (h - 4)}`).join(' ');
  return (
    <svg width={w} height={h} style={{ opacity: 0.7 }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Activity Visualization (replaces globe — pure CSS/SVG) ──────────────────
function SecurityActivityViz({
  messages, eventsProcessed, threatsDetected
}: {
  messages: WsMessage[];
  eventsProcessed: number;
  threatsDetected: number;
}) {
  const recentEvents = messages
    .filter(m => m.type === 'event_update')
    .slice(0, 8);

  const STATE_COLOR: Record<string, string> = {
    RECEIVED: '#94a3b8', ANALYZING: '#60a5fa', INVESTIGATING: '#a78bfa',
    RISK_ASSESSMENT: '#fbbf24', INCIDENT_CREATED: '#34d399', COMPLETED: '#34d399', ERROR: '#f87171',
  };

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.04) 0%, transparent 70%)',
      overflow: 'hidden',
    }}>
      {/* Radar rings */}
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          position: 'absolute',
          width: `${i * 28}%`, height: `${i * 28}%`,
          border: `1px solid rgba(6,182,212,${0.12 / i})`,
          borderRadius: '50%',
          animation: `radar-expand ${2.5 + i * 0.8}s ease-out ${i * 0.6}s infinite`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Static rings */}
      {[1, 2, 3, 4].map(i => (
        <div key={`s${i}`} style={{
          position: 'absolute',
          width: `${i * 22}%`, height: `${i * 22}%`,
          border: `1px solid rgba(30,50,90,${0.5 - i * 0.08})`,
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />
      ))}

      {/* Center hub */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: 64, height: 64,
        background: 'radial-gradient(circle, rgba(37,99,235,0.3) 0%, rgba(6,182,212,0.1) 60%, transparent 100%)',
        borderRadius: '50%',
        border: '1px solid rgba(6,182,212,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 24px rgba(6,182,212,0.15)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#06b6d4', lineHeight: 1 }}>{eventsProcessed}</div>
          <div style={{ fontSize: 8, color: 'rgba(6,182,212,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>Processed</div>
        </div>
      </div>

      {/* Orbiting event dots */}
      {recentEvents.map((msg, i) => {
        const angle = (i / 8) * 360;
        const radius = 90;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;
        const color = STATE_COLOR[msg.state ?? 'RECEIVED'];
        return (
          <div key={`${msg.event_id}-${i}`} style={{
            position: 'absolute',
            left: `calc(50% + ${x}px)`,
            top: `calc(50% + ${y}px)`,
            transform: 'translate(-50%, -50%)',
            width: 8, height: 8,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 6px ${color}`,
            zIndex: 3,
            animation: msg.state === 'ANALYZING' ? 'soc-pulse 1.4s ease-in-out infinite' : undefined,
          }} />
        );
      })}

      {/* Attack type distribution arcs — visual only */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.12 }}>
        <circle cx="50%" cy="50%" r="42%" fill="none" stroke="#06b6d4" strokeWidth="0.5" strokeDasharray="4 8"/>
        <circle cx="50%" cy="50%" r="30%" fill="none" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="3 6"/>
        {/* Cross lines */}
        <line x1="50%" y1="5%" x2="50%" y2="95%" stroke="#1e3260" strokeWidth="0.5"/>
        <line x1="5%" y1="50%" x2="95%" y2="50%" stroke="#1e3260" strokeWidth="0.5"/>
        <line x1="15%" y1="15%" x2="85%" y2="85%" stroke="#1e3260" strokeWidth="0.3"/>
        <line x1="85%" y1="15%" x2="15%" y2="85%" stroke="#1e3260" strokeWidth="0.3"/>
      </svg>

      {/* Stats overlay bottom-left */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{ fontSize: 10, color: '#3d5575' }}>
          <span style={{ color: '#60a5fa', fontWeight: 700 }}>{eventsProcessed}</span> events processed
        </div>
        <div style={{ fontSize: 10, color: '#3d5575' }}>
          <span style={{ color: '#f87171', fontWeight: 700 }}>{threatsDetected}</span> threats detected
        </div>
      </div>

      {/* LIVE badge top-left */}
      <div style={{
        position: 'absolute', top: 10, left: 10,
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(16,185,129,0.08)',
        border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: 4, padding: '2px 8px',
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: '#10b981', display: 'inline-block',
          animation: 'soc-pulse 2s ease-in-out infinite',
        }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: '#10b981', letterSpacing: '0.1em' }}>LIVE</span>
      </div>
    </div>
  );
}

// ─── Attack type mini-legend ──────────────────────────────────────────────────
function AttackTypeLegend({ incidents }: { incidents: Incident[] }) {
  const types: Record<string, number> = {};
  incidents.forEach(inc => {
    const t = inc.threat_type || 'Unknown';
    types[t] = (types[t] || 0) + 1;
  });
  const sorted = Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const total = Object.values(types).reduce((a, b) => a + b, 0) || 1;

  const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];

  return (
    <div>
      {sorted.map(([name, count], i) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS[i], flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          <span style={{ fontSize: 11, color: '#3d5575', marginLeft: 4 }}>{Math.round((count / total) * 100)}%</span>
        </div>
      ))}
      {sorted.length === 0 && (
        <p style={{ fontSize: 11, color: '#2d4060' }}>Run demo to populate</p>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [agents, setAgents] = useState<AgentStatus | null>(null);
  const [loadError, setLoadError] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMsg, setReportMsg] = useState('');

  const { connected, messages, clearMessages } = useWebSocket();
  const { status: monStatus, backendOnline } = useMonitoring();

  // Sparkline history — accumulate event counts over polling ticks
  const sparkRef = useRef<number[]>([0, 0, 0, 0, 0]);

  const loadData = useCallback(async () => {
    try {
      const [incRes, agRes] = await Promise.all([getIncidents(), getAgentsStatus()]);
      setIncidents(incRes.data);
      setAgents(agRes.data);
      setLoadError('');
    } catch {
      setLoadError('Cannot reach backend on port 8080. Start the API server.');
    }
  }, []);

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 15000);
    return () => clearInterval(t);
  }, [loadData]);

  useEffect(() => {
    const latest = messages[0];
    if (latest && (latest.state === 'COMPLETED' || latest.state === 'INCIDENT_CREATED')) {
      setTimeout(loadData, 800);
    }
  }, [messages, loadData]);

  // Keep rolling sparkline of events_received
  useEffect(() => {
    if (monStatus) {
      sparkRef.current = [...sparkRef.current.slice(-9), monStatus.events_received];
    }
  }, [monStatus]);

  // ── Metrics ────────────────────────────────────────────────────────────────
  const active  = incidents.filter(i => i.status === 'awaiting_approval').length;
  const critical = incidents.filter(i => i.risk_level === 'critical').length;
  const pending = incidents.filter(i => i.human_approval === 'pending').length;
  const high    = incidents.filter(i => i.risk_level === 'high').length;
  const avgRisk = incidents.length
    ? Math.round(incidents.reduce((a, b) => a + b.risk_score, 0) / incidents.length) : 0;
  const securityScore = Math.max(0, 100 - avgRisk);
  const eventsReceived  = monStatus?.events_received ?? 0;
  const eventsProcessed = monStatus?.events_processed ?? 0;
  const threatsDetected = monStatus?.threats_detected ?? 0;
  const uptime = monStatus?.uptime ?? '--:--:--';
  const llmMode = monStatus?.llm_backend ?? agents?.llm_backend ?? '—';

  // Live feed: only event_update messages
  const feedMessages = messages.filter(m => m.type === 'event_update' || m.type === 'connected');

  // Agent processing states
  const inFlight = messages.filter(m =>
    m.type === 'event_update' &&
    ['ANALYZING', 'INVESTIGATING', 'RISK_ASSESSMENT'].includes(m.state ?? '')
  );

  const handleSendTest = async () => {
    setSendingTest(true);
    try { await postTestEvents(1); } finally { setSendingTest(false); }
  };

  const handleReport = async () => {
    setReportLoading(true);
    setReportMsg('');
    try {
      await generateReport();
      setReportMsg('Report generated successfully.');
    } catch {
      setReportMsg('Failed — ensure backend is running.');
    } finally {
      setReportLoading(false);
    }
  };

  // ── Agent detail config ────────────────────────────────────────────────────
  const AGENT_CONFIG = [
    { name: 'Threat Detection', icon: '◎', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', state: 'ANALYZING',       sub: 'Monitoring Logs' },
    { name: 'Investigation',    icon: '◈', color: '#a78bfa', bg: 'rgba(124,58,237,0.1)', state: 'INVESTIGATING',   sub: 'Root Cause Analysis' },
    { name: 'Risk Assessment',  icon: '◐', color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', state: 'RISK_ASSESSMENT', sub: 'Risk Scoring' },
    { name: 'Response Agent',   icon: '▶', color: '#34d399', bg: 'rgba(16,185,129,0.1)', state: 'COMPLETED',       sub: 'Ready to Respond' },
    { name: 'Report Generator', icon: '▤', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',  state: 'INCIDENT_CREATED', sub: 'Generating Reports' },
  ];

  return (
    <div style={{ maxWidth: '100%' }}>
      {loadError && (
        <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: 12 }}>
          ⚠ {loadError}
        </div>
      )}

      {/* ── Row 1: Stat cards ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 14 }}>

        {/* Security Score */}
        <div className={`soc-stat-card ${securityScore >= 70 ? 'soc-stat-green' : 'soc-stat-orange'}`}>
          <div className="soc-stat-label">Security Score</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span className="soc-stat-value" style={{ color: securityScore >= 70 ? '#34d399' : '#fbbf24' }}>
              {securityScore}
            </span>
            <span style={{ fontSize: 13, color: '#3d5575', fontWeight: 600 }}>/100</span>
          </div>
          <div className="soc-stat-sub">{securityScore >= 70 ? 'Excellent Security Posture' : 'Needs Attention'}</div>
          <div className="soc-stat-sparkline">
            <Sparkline color={securityScore >= 70 ? '#10b981' : '#f59e0b'} points={sparkRef.current.map(v => Math.max(0, 100 - v))} />
          </div>
        </div>

        {/* Active Incidents */}
        <div className="soc-stat-card soc-stat-red">
          <div className="soc-stat-label">Active Incidents</div>
          <div className="soc-stat-value" style={{ color: '#f87171' }}>{active}</div>
          <div className="soc-stat-sub">{critical} Critical · {high} High</div>
          <div className="soc-stat-sparkline">
            <Sparkline color="#ef4444" points={sparkRef.current.map((_, i) => Math.max(0, active - i * 0.3))} />
          </div>
        </div>

        {/* Events 24h */}
        <div className="soc-stat-card soc-stat-blue">
          <div className="soc-stat-label">Events Received</div>
          <div className="soc-stat-value" style={{ color: '#60a5fa' }}>{eventsReceived.toLocaleString()}</div>
          <div className="soc-stat-sub">{eventsProcessed} processed · {pending} pending</div>
          <div className="soc-stat-sparkline">
            <Sparkline color="#3b82f6" points={sparkRef.current} />
          </div>
        </div>

        {/* Threats Blocked */}
        <div className="soc-stat-card soc-stat-purple">
          <div className="soc-stat-label">Threats Detected</div>
          <div className="soc-stat-value" style={{ color: '#a78bfa' }}>{threatsDetected.toLocaleString()}</div>
          <div className="soc-stat-sub">Uptime {uptime}</div>
          <div className="soc-stat-sparkline">
            <Sparkline color="#8b5cf6" points={sparkRef.current.map(v => v * 0.7)} />
          </div>
        </div>

        {/* AI Mode / Pending */}
        <div className="soc-stat-card soc-stat-orange">
          <div className="soc-stat-label">AI Engine Mode</div>
          <div className="soc-stat-value" style={{ color: '#fbbf24', fontSize: 20, paddingTop: 4 }}>{llmMode}</div>
          <div className="soc-stat-sub">Pending approval: {pending}</div>
          <div className="soc-stat-sparkline">
            <Sparkline color="#f59e0b" points={[1,2,1,3,2,4,3,5,4]} />
          </div>
        </div>
      </div>

      {/* ── Row 2: Activity viz + Attack feed + Agents ──────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px 280px', gap: 10, marginBottom: 10 }}>

        {/* Security Activity Visualization */}
        <div className="glass-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="soc-panel-title">Live Security Activity</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: connected ? 'rgba(16,185,129,0.08)' : 'rgba(100,116,139,0.08)',
                border: `1px solid ${connected ? 'rgba(16,185,129,0.2)' : 'rgba(100,116,139,0.2)'}`,
                borderRadius: 4, padding: '1px 7px',
                fontSize: 9, fontWeight: 700,
                color: connected ? '#10b981' : '#64748b',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                {connected ? 'Live' : 'Offline'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleSendTest}
                disabled={sendingTest || !backendOnline}
                style={{
                  fontSize: 10, padding: '4px 10px', borderRadius: 5,
                  border: '1px solid rgba(59,130,246,0.3)',
                  background: 'rgba(59,130,246,0.06)',
                  color: '#60a5fa', cursor: 'pointer', fontWeight: 600,
                  opacity: sendingTest || !backendOnline ? 0.4 : 1,
                }}
              >
                {sendingTest ? 'Sending…' : '⚡ Test Event'}
              </button>
              <DemoButton onSuccess={() => setTimeout(loadData, 600)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Viz */}
            <div style={{ height: 240, position: 'relative' }}>
              <SecurityActivityViz
                messages={messages}
                eventsProcessed={eventsProcessed}
                threatsDetected={threatsDetected}
              />
            </div>

            {/* Attack type breakdown */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#3d5575', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                Incident Types
              </div>
              <AttackTypeLegend incidents={incidents} />

              {/* Totals */}
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(30,50,90,0.5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: '#3d5575' }}>Total Incidents</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0' }}>{incidents.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: '#3d5575' }}>Critical + High</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#f87171' }}>{critical + high}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Attack Feed */}
        <div className="glass-card" style={{ padding: '14px 14px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
            <span className="soc-panel-title">Live Attack Feed</span>
            <button onClick={clearMessages} style={{ fontSize: 10, color: '#2d4060', background: 'none', border: 'none', cursor: 'pointer' }}>
              Clear
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 280 }}>
            {feedMessages.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 40 }}>
                <p style={{ fontSize: 12, color: '#2d4060' }}>
                  {connected ? 'Monitoring active…' : 'WebSocket connecting…'}
                </p>
                <p style={{ fontSize: 10, color: '#1a2840', marginTop: 4 }}>
                  Send a test event to see live data
                </p>
              </div>
            ) : (
              feedMessages.slice(0, 12).map((msg, i) => {
                if (msg.type === 'connected') return (
                  <div key={`conn-${i}`} className="feed-item">
                    <div className="feed-icon feed-icon-low" style={{ fontSize: 10 }}>✓</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="feed-title">WS Connected</div>
                      <div className="feed-sub">Monitoring active</div>
                    </div>
                  </div>
                );

                const sev = (msg.severity ?? 'medium').toLowerCase();
                const fi = SEV_ICON[sev] ?? SEV_ICON.medium;
                const label = msg.event_type?.replace(/_/g, ' ') ?? msg.threat_type ?? 'Security Event';
                const sub = msg.source_ip ?? 'unknown source';
                return (
                  <div key={`${msg.event_id}-${msg.state}-${i}`} className={`feed-item ${i === 0 ? 'anim-slide-in' : ''}`}>
                    <div className={`feed-icon ${fi.cls}`} style={{ color: fi.cls === 'feed-icon-critical' ? '#f87171' : fi.cls === 'feed-icon-high' ? '#fbbf24' : fi.cls === 'feed-icon-medium' ? '#60a5fa' : '#34d399' }}>
                      {fi.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="feed-title" style={{ textTransform: 'capitalize' }}>{label}</div>
                      <div className="feed-sub">{sub}</div>
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <span className={`es-badge es-${msg.state ?? 'RECEIVED'}`}>
                        <span className="es-dot" />
                        {msg.state}
                      </span>
                      <span className="feed-time">
                        {msg.timestamp ? timeAgo(msg.timestamp) : ''}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* AI Agents + Performance */}
        <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Agents Live Status */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="soc-panel-title">AI Agents — Live Status</span>
              <Link href="/agents" className="soc-panel-link">View All</Link>
            </div>
            <div>
              {AGENT_CONFIG.map(cfg => {
                const isActive = inFlight.some(m => m.state === cfg.state) ||
                  (cfg.state === 'COMPLETED' && messages.some(m => m.state === 'COMPLETED' &&
                    Date.now() - new Date(m.timestamp ?? 0).getTime() < 5000));
                const liveAgent = agents?.agents.find(a => a.name.toLowerCase().includes(cfg.name.toLowerCase().split(' ')[0]));
                return (
                  <div key={cfg.name} className="agent-card">
                    <div className="agent-icon-box" style={{ background: cfg.bg }}>
                      <span style={{ color: cfg.color, fontSize: 14 }}>{cfg.icon}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="agent-name">{cfg.name}</div>
                      <div className="agent-sub">{isActive ? 'Processing…' : cfg.sub}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <span className={isActive ? 'agent-badge-active' : ''} style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: isActive ? '#10b981' : (liveAgent ? '#3d5575' : '#2d4060'),
                      }}>
                        {isActive ? 'ACTIVE' : (liveAgent ? 'READY' : '—')}
                      </span>
                      {liveAgent && (
                        <span style={{ fontSize: 9, color: '#2d4060' }}>{liveAgent.mode}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agent Performance */}
          <div style={{ borderTop: '1px solid rgba(30,50,90,0.5)', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="soc-panel-title">Agent Performance</span>
              <Link href="/agents" className="soc-panel-link">View All</Link>
            </div>
            {[
              { name: 'Threat Detection', pct: agents ? 98 : 0 },
              { name: 'Investigation',    pct: agents ? 96 : 0 },
              { name: 'Risk Assessment',  pct: agents ? 97 : 0 },
            ].map(row => (
              <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <span style={{ fontSize: 10, color: '#4a6080', width: 110, flexShrink: 0 }}>{row.name}</span>
                <div className="perf-bar-track">
                  <div className="perf-bar-fill" style={{ width: `${row.pct}%` }} />
                </div>
                <span style={{ fontSize: 10, color: '#34d399', fontWeight: 700, width: 30, textAlign: 'right', flexShrink: 0 }}>
                  {row.pct ? `${row.pct}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3: Active Incidents + Report Generator ──────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 10 }}>

        {/* Active Incidents Table */}
        <div className="glass-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="soc-panel-title">Active Incidents</span>
            <Link href="/incidents" className="soc-panel-link">View All →</Link>
          </div>

          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '80px 1fr 80px 120px 80px 70px',
            gap: 8,
          }} className="inc-table-header">
            <span>ID</span>
            <span>Title</span>
            <span>Severity</span>
            <span>Status</span>
            <span>Risk Score</span>
            <span>Time</span>
          </div>

          {incidents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: 12, color: '#2d4060' }}>No incidents yet.</p>
              <p style={{ fontSize: 10, color: '#1a2840', marginTop: 4 }}>
                Click <strong style={{ color: '#3b82f6' }}>Run Demo Incident</strong> to populate the table
              </p>
            </div>
          ) : (
            <div>
              {incidents.slice(0, 6).map(inc => {
                const shortId = `INC-${inc.id.slice(-4).toUpperCase()}`;
                const sev = inc.severity?.toLowerCase() ?? 'medium';
                const statusLabel = inc.status === 'awaiting_approval' ? 'PENDING'
                  : inc.status === 'contained' ? 'CONTAINED'
                  : inc.status?.toUpperCase() ?? 'OPEN';
                const statusCls = inc.status === 'awaiting_approval' ? 'badge-pending'
                  : inc.status === 'contained' ? 'badge-contained'
                  : 'badge-medium';
                return (
                  <Link key={inc.id} href={`/incidents/${inc.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div
                      className="inc-table-row"
                      style={{ gridTemplateColumns: '80px 1fr 80px 120px 80px 70px', gap: 8 }}
                    >
                      <span className="inc-id">{shortId}</span>
                      <span className="inc-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inc.threat_type}
                      </span>
                      <span>
                        <span className={`badge-base badge-${sev}`}>{inc.severity}</span>
                      </span>
                      <span>
                        <span className={`badge-base ${statusCls}`}>{statusLabel}</span>
                      </span>
                      <span className="inc-score" style={{ color: riskColor(inc.risk_score) }}>
                        {Math.round(inc.risk_score)}
                      </span>
                      <span style={{ fontSize: 10, color: '#3d5575' }}>
                        {timeAgo(inc.created_at)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Report Generator + System Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Report Generator */}
          <div className="glass-card" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="soc-panel-title">Report Generator</span>
              <button
                onClick={handleReport}
                disabled={reportLoading || !backendOnline}
                style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 4,
                  border: '1px solid rgba(59,130,246,0.3)',
                  background: 'rgba(59,130,246,0.06)',
                  color: '#60a5fa', cursor: 'pointer', fontWeight: 600,
                  opacity: reportLoading || !backendOnline ? 0.4 : 1,
                }}
              >
                {reportLoading ? 'Generating…' : '+ Create'}
              </button>
            </div>

            {reportMsg && (
              <div style={{ marginBottom: 8, fontSize: 10, color: reportMsg.includes('success') ? '#34d399' : '#f87171' }}>
                {reportMsg}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
              <button onClick={handleReport} disabled={reportLoading} className="report-card" style={{ textAlign: 'left' }}>
                <div className="report-icon">📋</div>
                <div>
                  <div className="report-name">Executive Report</div>
                  <div className="report-sub">High-level overview</div>
                </div>
              </button>
              <button onClick={handleReport} disabled={reportLoading} className="report-card" style={{ textAlign: 'left' }}>
                <div className="report-icon" style={{ background: 'rgba(124,58,237,0.12)' }}>⚙</div>
                <div>
                  <div className="report-name">Technical Report</div>
                  <div className="report-sub">Detailed analysis</div>
                </div>
              </button>
            </div>

            <div style={{ fontSize: 10, fontWeight: 700, color: '#2d4060', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              Scheduled
            </div>
            <div className="sched-row">
              <span style={{ fontSize: 12 }}>📄</span>
              <div style={{ flex: 1 }}>
                <div className="sched-name">Daily Security Report</div>
                <div className="sched-time">Every day at 08:00 AM</div>
              </div>
              <span className="sched-pdf">PDF</span>
            </div>
            <div className="sched-row">
              <span style={{ fontSize: 12 }}>📊</span>
              <div style={{ flex: 1 }}>
                <div className="sched-name">Weekly Threat Report</div>
                <div className="sched-time">Every Monday at 09:00 AM</div>
              </div>
              <span className="sched-pdf">PDF</span>
            </div>
          </div>

          {/* System Status */}
          <div className="glass-card" style={{ padding: '14px' }}>
            <div style={{ marginBottom: 10 }}>
              <span className="soc-panel-title">System Status</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: backendOnline ? '#10b981' : '#ef4444' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: backendOnline ? '#10b981' : '#f87171' }}>
                {backendOnline ? 'All Systems Operational' : 'Backend Offline'}
              </span>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ height: 24, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: 4 }}>
                <div style={{ width: `${securityScore}%`, height: '100%', background: 'linear-gradient(90deg, #10b981, #06b6d4)', borderRadius: 4, transition: 'width 0.6s ease' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                { label: 'Backend', value: backendOnline ? 'Online' : 'Offline', ok: backendOnline },
                { label: 'WebSocket', value: connected ? 'Connected' : 'Reconnecting', ok: connected },
                { label: 'AI Engine', value: llmMode, ok: true },
                { label: 'Notion', value: agents?.notion_integration ?? '—', ok: agents?.notion_integration === 'connected' },
                { label: 'Uptime', value: uptime, ok: true },
                { label: 'WS Clients', value: String(monStatus?.websocket_connections ?? 0), ok: true },
              ].map(row => (
                <div key={row.label} style={{ padding: '5px 0', borderBottom: '1px solid rgba(30,50,90,0.3)' }}>
                  <div style={{ fontSize: 9.5, color: '#2d4060', marginBottom: 1 }}>{row.label}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: row.ok ? '#34d399' : '#fbbf24' }}>{row.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
