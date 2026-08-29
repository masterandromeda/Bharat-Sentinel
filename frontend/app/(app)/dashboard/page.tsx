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
  if (points.length < 2) return <div style={{ height: 32 }} />;
  const w = 110, h = 32;
  const max = Math.max(...points, 1);
  const step = w / (points.length - 1);
  const pts = points.map((v, i) => `${i * step},${h - (v / max) * (h - 4)}`).join(' ');
  return (
    <svg width={w} height={h} style={{ opacity: 0.65 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Security Activity Visualization ─────────────────────────────────────────
function SecurityActivityViz({
  messages, eventsProcessed, threatsDetected,
}: {
  messages: WsMessage[];
  eventsProcessed: number;
  threatsDetected: number;
}) {
  const recentEvents = messages.filter(m => m.type === 'event_update').slice(0, 10);

  const STATE_COLOR: Record<string, string> = {
    RECEIVED: '#94a3b8', ANALYZING: '#60a5fa', INVESTIGATING: '#a78bfa',
    RISK_ASSESSMENT: '#fbbf24', INCIDENT_CREATED: '#34d399',
    COMPLETED: '#34d399', ERROR: '#f87171',
  };

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.05) 0%, transparent 65%)',
      overflow: 'hidden',
    }}>
      {/* Expanding radar rings */}
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          position: 'absolute',
          width: `${i * 26}%`, height: `${i * 26}%`,
          border: `1px solid rgba(6,182,212,${0.14 / i})`,
          borderRadius: '50%',
          animation: `radar-expand ${2.5 + i * 0.9}s ease-out ${i * 0.5}s infinite`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Static rings */}
      {[1, 2, 3, 4, 5].map(i => (
        <div key={`s${i}`} style={{
          position: 'absolute',
          width: `${i * 18}%`, height: `${i * 18}%`,
          border: `1px solid rgba(30,55,100,${0.55 - i * 0.07})`,
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />
      ))}

      {/* SVG grid overlay */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.1 }}>
        <circle cx="50%" cy="50%" r="44%" fill="none" stroke="#06b6d4" strokeWidth="0.5" strokeDasharray="4 10" />
        <circle cx="50%" cy="50%" r="30%" fill="none" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="3 7" />
        <line x1="50%" y1="2%" x2="50%" y2="98%" stroke="#1e3a6e" strokeWidth="0.5" />
        <line x1="2%" y1="50%" x2="98%" y2="50%" stroke="#1e3a6e" strokeWidth="0.5" />
        <line x1="14%" y1="14%" x2="86%" y2="86%" stroke="#1e3a6e" strokeWidth="0.3" />
        <line x1="86%" y1="14%" x2="14%" y2="86%" stroke="#1e3a6e" strokeWidth="0.3" />
      </svg>

      {/* Center hub with orb-float */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: 72, height: 72,
        background: 'radial-gradient(circle, rgba(37,99,235,0.35) 0%, rgba(6,182,212,0.12) 60%, transparent 100%)',
        borderRadius: '50%',
        border: '1px solid rgba(6,182,212,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 28px rgba(6,182,212,0.18), 0 0 60px rgba(37,99,235,0.08)',
        animation: 'orb-float 3.5s ease-in-out infinite',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#06b6d4', lineHeight: 1 }}>{eventsProcessed}</div>
          <div style={{ fontSize: 7.5, color: 'rgba(6,182,212,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>Events</div>
        </div>
      </div>

      {/* Orbiting event dots */}
      {recentEvents.map((msg, i) => {
        const angle = (i / 10) * 360 - 90;
        const radius = 100;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;
        const color = STATE_COLOR[msg.state ?? 'RECEIVED'];
        return (
          <div key={`${msg.event_id}-${i}`} title={`${msg.event_type ?? 'Event'} — ${msg.state}`} style={{
            position: 'absolute',
            left: `calc(50% + ${x}px)`,
            top: `calc(50% + ${y}px)`,
            transform: 'translate(-50%, -50%)',
            width: 9, height: 9,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 8px ${color}`,
            zIndex: 3,
            animation: ['ANALYZING','INVESTIGATING','RISK_ASSESSMENT'].includes(msg.state ?? '')
              ? 'soc-pulse 1.4s ease-in-out infinite' : undefined,
          }} />
        );
      })}

      {/* Stats overlay bottom-left */}
      <div style={{ position: 'absolute', bottom: 10, left: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ fontSize: 10, color: '#2d4060' }}>
          <span style={{ color: '#60a5fa', fontWeight: 700 }}>{eventsProcessed}</span>
          <span> processed</span>
        </div>
        <div style={{ fontSize: 10, color: '#2d4060' }}>
          <span style={{ color: '#f87171', fontWeight: 700 }}>{threatsDetected}</span>
          <span> threats</span>
        </div>
      </div>

      {/* LIVE badge */}
      <div style={{
        position: 'absolute', top: 10, left: 10,
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(16,185,129,0.08)',
        border: '1px solid rgba(16,185,129,0.22)',
        borderRadius: 4, padding: '2px 8px',
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: '50%', background: '#10b981',
          display: 'inline-block', animation: 'soc-pulse 2s ease-in-out infinite',
        }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: '#10b981', letterSpacing: '0.1em' }}>LIVE</span>
      </div>
    </div>
  );
}

// ─── Attack type mini-legend ──────────────────────────────────────────────────
function AttackTypeLegend({ incidents }: { incidents: Incident[] }) {
  const types: Record<string, number> = {};
  incidents.forEach(inc => { const t = inc.threat_type || 'Unknown'; types[t] = (types[t] || 0) + 1; });
  const sorted = Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const total = Object.values(types).reduce((a, b) => a + b, 0) || 1;
  const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];
  return (
    <div>
      {sorted.map(([name, count], i) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS[i], flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          <span style={{ fontSize: 11, color: '#3d5575' }}>{Math.round((count / total) * 100)}%</span>
        </div>
      ))}
      {sorted.length === 0 && (
        <p style={{ fontSize: 11, color: '#1e3260', paddingTop: 4 }}>Run demo to populate</p>
      )}
    </div>
  );
}

// ─── Pipeline Flow Bar ────────────────────────────────────────────────────────
const PIPELINE_STEPS = [
  { label: 'Event\nReceived',   icon: '📡', state: 'RECEIVED' },
  { label: 'Threat\nDetection', icon: '🔍', state: 'ANALYZING' },
  { label: 'Investigation',     icon: '🧠', state: 'INVESTIGATING' },
  { label: 'Risk\nAssessment',  icon: '⚡', state: 'RISK_ASSESSMENT' },
  { label: 'Incident\nCreated', icon: '📋', state: 'INCIDENT_CREATED' },
  { label: 'Human\nApproval',   icon: '👤', state: null },
  { label: 'Response',          icon: '🛡️', state: null },
  { label: 'Audit\nReport',     icon: '📊', state: 'COMPLETED' },
];

function PipelineFlow({ messages }: { messages: WsMessage[] }) {
  const activeStates = new Set(messages.slice(0, 5).map(m => m.state));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, padding: '6px 0' }}>
      {PIPELINE_STEPS.map((step, i) => {
        const isActive = step.state ? activeStates.has(step.state) : false;
        return (
          <div key={step.label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div className="pipeline-step">
              <div className={`pipeline-node${isActive ? ' pipeline-node-active' : ''}`}
                style={isActive ? { background: 'rgba(16,185,129,0.1)' } : {}}>
                <span style={{ fontSize: 13 }}>{step.icon}</span>
              </div>
              <div className="pipeline-label" style={{ whiteSpace: 'pre-line', textAlign: 'center' }}>
                {step.label}
              </div>
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div className="pipeline-arrow" style={{ margin: '0 2px', marginBottom: 20, fontSize: 9, color: isActive ? 'rgba(16,185,129,0.5)' : 'rgba(30,55,100,0.7)' }}>
                ›
              </div>
            )}
          </div>
        );
      })}
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

  // Rolling sparkline history
  const sparkRef = useRef<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);

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

  useEffect(() => {
    if (monStatus) {
      sparkRef.current = [...sparkRef.current.slice(-7), monStatus.events_received];
    }
  }, [monStatus]);

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const active   = incidents.filter(i => i.status === 'awaiting_approval').length;
  const critical = incidents.filter(i => i.risk_level === 'critical').length;
  const high     = incidents.filter(i => i.risk_level === 'high').length;
  const pending  = incidents.filter(i => i.human_approval === 'pending').length;
  const avgRisk  = incidents.length
    ? Math.round(incidents.reduce((a, b) => a + b.risk_score, 0) / incidents.length) : 0;
  const securityScore   = Math.max(0, 100 - avgRisk);
  const eventsReceived  = monStatus?.events_received ?? 0;
  const eventsProcessed = monStatus?.events_processed ?? 0;
  const threatsDetected = monStatus?.threats_detected ?? 0;
  const uptime  = monStatus?.uptime ?? '--:--:--';
  const llmMode = monStatus?.llm_backend ?? agents?.llm_backend ?? '—';

  const feedMessages = messages.filter(m => m.type === 'event_update' || m.type === 'connected');
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
      setReportMsg('✓ Report generated successfully.');
    } catch {
      setReportMsg('✗ Failed — ensure backend is running.');
    } finally {
      setReportLoading(false);
    }
  };

  // ── Agent config ────────────────────────────────────────────────────────────
  const AGENT_CONFIG = [
    { name: 'Threat Detection', icon: '◎', colorCls: 'agent3d-blue',   color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',   state: 'ANALYZING',        sub: 'Monitoring Logs' },
    { name: 'Investigation',    icon: '◈', colorCls: 'agent3d-purple', color: '#a78bfa', bg: 'rgba(124,58,237,0.12)',   state: 'INVESTIGATING',    sub: 'Root Cause Analysis' },
    { name: 'Risk Assessment',  icon: '◐', colorCls: 'agent3d-yellow', color: '#fbbf24', bg: 'rgba(245,158,11,0.12)',   state: 'RISK_ASSESSMENT',  sub: 'Risk Scoring' },
    { name: 'Response Agent',   icon: '▶', colorCls: 'agent3d-green',  color: '#34d399', bg: 'rgba(16,185,129,0.12)',   state: 'COMPLETED',        sub: 'Ready to Respond' },
    { name: 'Report Generator', icon: '▤', colorCls: 'agent3d-cyan',   color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',    state: 'INCIDENT_CREATED', sub: 'Generating Reports' },
  ];

  return (
    <div style={{ maxWidth: '100%' }}>

      {/* Error banner */}
      {loadError && (
        <div style={{
          marginBottom: 10, padding: '9px 14px', borderRadius: 8,
          background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)',
          color: '#f87171', fontSize: 11.5,
        }}>
          ⚠ {loadError}
        </div>
      )}

      {/* ── Row 1: 5 stat3d cards ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 12 }}>

        {/* Security Score */}
        <div className={`stat3d ${securityScore >= 70 ? 'stat3d-green' : 'stat3d-red'}`}>
          <div className="stat3d-icon" style={{ background: securityScore >= 70 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }}>
            <span style={{ fontSize: 20 }}>🛡️</span>
          </div>
          <div className="stat3d-label">Security Score</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span className="stat3d-value" style={{ color: securityScore >= 70 ? '#34d399' : '#f87171' }}>
              {securityScore}
            </span>
            <span style={{ fontSize: 13, color: '#3d5575', fontWeight: 600 }}>/100</span>
          </div>
          <div className="stat3d-sub">{securityScore >= 70 ? 'Excellent Posture' : 'Needs Attention'}</div>
          <div className="stat3d-spark">
            <Sparkline color={securityScore >= 70 ? '#10b981' : '#ef4444'} points={sparkRef.current.map(v => Math.max(0, 100 - v))} />
          </div>
        </div>

        {/* Active Incidents */}
        <div className="stat3d stat3d-red">
          <div className="stat3d-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>
            <span style={{ fontSize: 20 }}>🚨</span>
          </div>
          <div className="stat3d-label">Active Incidents</div>
          <div className="stat3d-value" style={{ color: '#f87171' }}>{active}</div>
          <div className="stat3d-sub">{critical} Critical · {high} High</div>
          <div className="stat3d-spark">
            <Sparkline color="#ef4444" points={sparkRef.current.map((_, i) => Math.max(0, active - i * 0.2))} />
          </div>
        </div>

        {/* Events Received */}
        <div className="stat3d stat3d-blue">
          <div className="stat3d-icon" style={{ background: 'rgba(59,130,246,0.12)' }}>
            <span style={{ fontSize: 20 }}>📡</span>
          </div>
          <div className="stat3d-label">Events Received</div>
          <div className="stat3d-value" style={{ color: '#60a5fa' }}>{eventsReceived.toLocaleString()}</div>
          <div className="stat3d-sub">{eventsProcessed} processed</div>
          <div className="stat3d-spark">
            <Sparkline color="#3b82f6" points={sparkRef.current} />
          </div>
        </div>

        {/* Threats Detected */}
        <div className="stat3d stat3d-purple">
          <div className="stat3d-icon" style={{ background: 'rgba(139,92,246,0.12)' }}>
            <span style={{ fontSize: 20 }}>⚡</span>
          </div>
          <div className="stat3d-label">Threats Detected</div>
          <div className="stat3d-value" style={{ color: '#a78bfa' }}>{threatsDetected.toLocaleString()}</div>
          <div className="stat3d-sub">Uptime {uptime}</div>
          <div className="stat3d-spark">
            <Sparkline color="#8b5cf6" points={sparkRef.current.map(v => Math.round(v * 0.6))} />
          </div>
        </div>

        {/* AI Engine */}
        <div className="stat3d stat3d-cyan">
          <div className="stat3d-icon" style={{ background: 'rgba(6,182,212,0.12)' }}>
            <span style={{ fontSize: 20 }}>🤖</span>
          </div>
          <div className="stat3d-label">AI Engine Mode</div>
          <div className="stat3d-value" style={{ color: '#06b6d4', fontSize: 18, paddingTop: 2 }}>{llmMode}</div>
          <div className="stat3d-sub">Pending approval: {pending}</div>
          <div className="stat3d-spark">
            <Sparkline color="#06b6d4" points={[1,2,1,3,2,4,3,5,4,6]} />
          </div>
        </div>
      </div>

      {/* ── Pipeline Flow Row ────────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: '10px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="soc-panel-title">AI Orchestration Pipeline</span>
          <span style={{
            fontSize: 9, fontWeight: 700, color: inFlight.length > 0 ? '#10b981' : '#3d5575',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {inFlight.length > 0 && (
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'soc-pulse 1.4s ease-in-out infinite' }} />
            )}
            {inFlight.length > 0 ? `${inFlight.length} event(s) in-flight` : 'Idle — waiting for events'}
          </span>
        </div>
        <PipelineFlow messages={messages} />
      </div>

      {/* ── Row 2: Viz + Feed + Agents ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 256px 276px', gap: 10, marginBottom: 10 }}>

        {/* Live Cyber Threat Map */}
        <div className="glass-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="soc-panel-title">Live Cyber Threat Map</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: connected ? 'rgba(16,185,129,0.08)' : 'rgba(100,116,139,0.08)',
                border: `1px solid ${connected ? 'rgba(16,185,129,0.2)' : 'rgba(100,116,139,0.2)'}`,
                borderRadius: 4, padding: '1px 7px',
                fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: connected ? '#10b981' : '#64748b',
              }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                {connected ? 'Live' : 'Offline'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={handleSendTest}
                disabled={sendingTest || !backendOnline}
                style={{
                  fontSize: 10, padding: '4px 10px', borderRadius: 5,
                  border: '1px solid rgba(59,130,246,0.3)',
                  background: 'rgba(59,130,246,0.06)',
                  color: '#60a5fa', cursor: 'pointer', fontWeight: 600,
                  opacity: sendingTest || !backendOnline ? 0.4 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {sendingTest ? 'Sending…' : '⚡ Test Event'}
              </button>
              <DemoButton onSuccess={() => setTimeout(loadData, 600)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 170px', gap: 14 }}>
            {/* Radar viz */}
            <div style={{ height: 250, position: 'relative' }}>
              <SecurityActivityViz
                messages={messages}
                eventsProcessed={eventsProcessed}
                threatsDetected={threatsDetected}
              />
            </div>

            {/* Attack type legend + totals */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#2d4060', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Incident Types
                </div>
                <AttackTypeLegend incidents={incidents} />
              </div>

              <div style={{ paddingTop: 10, borderTop: '1px solid rgba(30,50,90,0.45)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: '#3d5575' }}>Total</span>
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
        <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
            <span className="soc-panel-title">Live Attack Feed</span>
            <button onClick={clearMessages} style={{ fontSize: 10, color: '#2d4060', background: 'none', border: 'none', cursor: 'pointer' }}>
              Clear
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 290 }}>
            {feedMessages.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 44 }}>
                <p style={{ fontSize: 12, color: '#2d4060' }}>
                  {connected ? 'Monitoring active…' : 'WebSocket connecting…'}
                </p>
                <p style={{ fontSize: 10, color: '#1a2840', marginTop: 5 }}>
                  Send a test event to see live data
                </p>
              </div>
            ) : (
              feedMessages.slice(0, 14).map((msg, i) => {
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
                  <div key={`${msg.event_id}-${msg.state}-${i}`}
                    className={`feed-item ${i === 0 ? 'anim-slide-in' : ''}`}>
                    <div className={`feed-icon ${fi.cls}`}>
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
                      <span className="feed-time">{msg.timestamp ? timeAgo(msg.timestamp) : ''}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* AI Agents 3D + Performance */}
        <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="soc-panel-title">AI Agents — Live Status</span>
              <Link href="/agents" className="soc-panel-link">All →</Link>
            </div>
            {AGENT_CONFIG.map(cfg => {
              const isActive = inFlight.some(m => m.state === cfg.state) ||
                (cfg.state === 'COMPLETED' && messages.some(m => m.state === 'COMPLETED' &&
                  Date.now() - new Date(m.timestamp ?? 0).getTime() < 5000));
              const liveAgent = agents?.agents.find(a =>
                a.name.toLowerCase().includes(cfg.name.toLowerCase().split(' ')[0])
              );
              return (
                <div key={cfg.name} className={`agent3d ${cfg.colorCls}${isActive ? ' agent3d-active' : ''}`}>
                  <div className="agent3d-icon" style={{ background: cfg.bg }}>
                    <span style={{ color: cfg.color, fontSize: 15 }}>{cfg.icon}</span>
                    {isActive && (
                      <div className="agent3d-icon-ring" style={{ color: cfg.color }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="agent3d-name">{cfg.name}</div>
                    <div className="agent3d-task">{isActive ? 'Processing…' : cfg.sub}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                    {isActive ? (
                      <span className="agent3d-status-active">ACTIVE</span>
                    ) : (
                      <span className="agent3d-status-ready">{liveAgent ? 'READY' : '—'}</span>
                    )}
                    {liveAgent && !isActive && (
                      <span style={{ fontSize: 8.5, color: '#2d4060' }}>{liveAgent.mode}</span>
                    )}
                  </div>
                  {isActive && (
                    <span className="pulse-dot pulse-dot-active" style={{ background: cfg.color, color: cfg.color, position: 'absolute', right: 8, top: 8, width: 6, height: 6 }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Agent Performance */}
          <div style={{ borderTop: '1px solid rgba(30,50,90,0.45)', paddingTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="soc-panel-title">Agent Performance (24H)</span>
            </div>
            {[
              { name: 'Threat Detection', pct: agents ? 98 : 0, color: '#3b82f6' },
              { name: 'Investigation',    pct: agents ? 96 : 0, color: '#a78bfa' },
              { name: 'Risk Assessment',  pct: agents ? 97 : 0, color: '#fbbf24' },
            ].map(row => (
              <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <span style={{ fontSize: 9.5, color: '#4a6080', width: 100, flexShrink: 0 }}>{row.name}</span>
                <div className="perf-bar-track">
                  <div className="perf-bar-fill" style={{ width: `${row.pct}%` }} />
                </div>
                <span style={{ fontSize: 10, color: '#34d399', fontWeight: 700, width: 28, textAlign: 'right', flexShrink: 0 }}>
                  {row.pct ? `${row.pct}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3: Incidents table + Reports + System Status ─────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 276px', gap: 10 }}>

        {/* Active Incidents Table */}
        <div className="glass-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="soc-panel-title">Active Incidents</span>
            <Link href="/incidents" className="soc-panel-link">View All →</Link>
          </div>

          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '78px 1fr 82px 118px 76px 64px', gap: 8 }}
            className="inc-table-header">
            <span>ID</span>
            <span>Threat Type</span>
            <span>Severity</span>
            <span>Status</span>
            <span>Risk Score</span>
            <span>Time</span>
          </div>

          {incidents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '26px 0' }}>
              <p style={{ fontSize: 12, color: '#2d4060' }}>No incidents yet.</p>
              <p style={{ fontSize: 10, color: '#1a2840', marginTop: 4 }}>
                Click <strong style={{ color: '#3b82f6' }}>Run Demo Incident</strong> to populate
              </p>
            </div>
          ) : (
            <div>
              {incidents.slice(0, 7).map(inc => {
                const shortId = `INC-${inc.id.slice(-4).toUpperCase()}`;
                const sev = inc.severity?.toLowerCase() ?? 'medium';
                const statusLabel = inc.status === 'awaiting_approval' ? 'PENDING'
                  : inc.status === 'contained' ? 'CONTAINED'
                  : inc.status?.toUpperCase() ?? 'OPEN';
                const statusCls = inc.status === 'awaiting_approval' ? 'badge-pending'
                  : inc.status === 'contained' ? 'badge-contained'
                  : 'badge-investigating';
                return (
                  <Link key={inc.id} href={`/incidents/${inc.id}`} style={{ textDecoration: 'none' }}>
                    <div className="inc-table-row"
                      style={{ gridTemplateColumns: '78px 1fr 82px 118px 76px 64px', gap: 8 }}>
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
                      <span style={{ fontSize: 10, color: '#3d5575' }}>{timeAgo(inc.created_at)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: Report Generator + System Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Report Generator */}
          <div className="glass-card" style={{ padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="soc-panel-title">Report Generator</span>
              <button
                onClick={handleReport}
                disabled={reportLoading || !backendOnline}
                style={{
                  fontSize: 10, padding: '3px 9px', borderRadius: 4,
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
              <div style={{ marginBottom: 8, fontSize: 10.5, color: reportMsg.includes('✓') ? '#34d399' : '#f87171' }}>
                {reportMsg}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
              <button onClick={handleReport} disabled={reportLoading} className="report-card" style={{ textAlign: 'left', width: '100%' }}>
                <div className="report-icon">📋</div>
                <div>
                  <div className="report-name">Executive</div>
                  <div className="report-sub">High-level overview</div>
                </div>
              </button>
              <button onClick={handleReport} disabled={reportLoading} className="report-card" style={{ textAlign: 'left', width: '100%' }}>
                <div className="report-icon" style={{ background: 'rgba(124,58,237,0.12)' }}>⚙</div>
                <div>
                  <div className="report-name">Technical</div>
                  <div className="report-sub">Detailed analysis</div>
                </div>
              </button>
            </div>

            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#2d4060', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="soc-panel-title">System Status</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: backendOnline ? '#10b981' : '#ef4444', display: 'inline-block' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: backendOnline ? '#10b981' : '#f87171' }}>
                  {backendOnline ? 'Operational' : 'Degraded'}
                </span>
              </span>
            </div>

            {/* Score bar */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ height: 4, background: 'rgba(30,50,90,0.5)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  width: `${securityScore}%`, height: '100%',
                  background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                  borderRadius: 3, transition: 'width 0.6s ease',
                }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {[
                { label: 'Backend',    value: backendOnline ? 'Online' : 'Offline',            ok: backendOnline },
                { label: 'WebSocket',  value: connected ? 'Connected' : 'Reconnecting',        ok: connected },
                { label: 'AI Engine',  value: llmMode,                                         ok: true },
                { label: 'Notion',     value: agents?.notion_integration ?? '—',               ok: agents?.notion_integration === 'connected' },
                { label: 'Uptime',     value: uptime,                                          ok: true },
                { label: 'WS Clients', value: String(monStatus?.websocket_connections ?? 0),   ok: true },
              ].map(row => (
                <div key={row.label} style={{ padding: '5px 0', borderBottom: '1px solid rgba(30,50,90,0.28)' }}>
                  <div style={{ fontSize: 9, color: '#2d4060', marginBottom: 1 }}>{row.label}</div>
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
