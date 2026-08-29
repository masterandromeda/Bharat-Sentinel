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
  return `${Math.floor(m / 60)}h ago`;
}
function riskColor(score: number) {
  if (score >= 80) return '#f87171';
  if (score >= 60) return '#fbbf24';
  if (score >= 40) return '#60a5fa';
  return '#34d399';
}
const SEV: Record<string, { icon: string; color: string }> = {
  critical: { icon: '⊗', color: '#f87171' },
  high:     { icon: '▲', color: '#fbbf24' },
  medium:   { icon: '◈', color: '#60a5fa' },
  low:      { icon: '◉', color: '#34d399' },
};

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ color, pts }: { color: string; pts: number[] }) {
  if (pts.length < 2) return <div style={{ height: 28 }} />;
  const W = 100, H = 28, max = Math.max(...pts, 1);
  const step = W / (pts.length - 1);
  const d = pts.map((v, i) => `${i * step},${H - (v / max) * (H - 3)}`).join(' ');
  return (
    <svg width={W} height={H} style={{ opacity: 0.6 }}>
      <polyline points={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon, variant, sparkPts }: {
  label: string; value: string | number; sub: string;
  color: string; icon: string; variant: string; sparkPts: number[];
}) {
  const glowMap: Record<string, string> = {
    green: 'rgba(16,185,129,0.12)', red: 'rgba(239,68,68,0.12)',
    blue: 'rgba(59,130,246,0.12)', purple: 'rgba(139,92,246,0.12)', cyan: 'rgba(6,182,212,0.12)',
  };
  const neonMap: Record<string, string> = {
    green: '#10b981', red: '#ef4444', blue: '#3b82f6', purple: '#8b5cf6', cyan: '#06b6d4',
  };
  const neon = neonMap[variant] || '#3b82f6';
  return (
    <div className={`stat3d stat3d-${variant}`} style={{ cursor: 'default' }}>
      {/* Icon orb */}
      <div className="stat3d-icon" style={{ background: glowMap[variant] }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
      </div>
      <div className="stat3d-label">{label}</div>
      <div className="stat3d-value" style={{ color: neon, fontSize: typeof value === 'string' && value.length > 6 ? 18 : 34 }}>
        {value}
      </div>
      <div className="stat3d-sub">{sub}</div>
      <div className="stat3d-spark"><Sparkline color={neon} pts={sparkPts} /></div>
    </div>
  );
}

// ─── Radar Viz ────────────────────────────────────────────────────────────────
function RadarViz({ messages, processed, threats }: { messages: WsMessage[]; processed: number; threats: number }) {
  const events = messages.filter(m => m.type === 'event_update').slice(0, 10);
  const STATE_COLOR: Record<string, string> = {
    RECEIVED: '#94a3b8', ANALYZING: '#60a5fa', INVESTIGATING: '#a78bfa',
    RISK_ASSESSMENT: '#fbbf24', INCIDENT_CREATED: '#34d399', COMPLETED: '#34d399', ERROR: '#f87171',
  };
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.04) 0%, transparent 70%)' }}>
      {/* Radar expand rings */}
      {[1,2,3].map(i => (
        <div key={i} style={{ position: 'absolute', width: `${i*26}%`, height: `${i*26}%`,
          border: `1px solid rgba(6,182,212,${0.14/i})`, borderRadius: '50%',
          animation: `radar-expand ${2.5+i*0.9}s ease-out ${i*0.5}s infinite`, pointerEvents: 'none' }} />
      ))}
      {/* Static rings */}
      {[1,2,3,4,5].map(i => (
        <div key={`s${i}`} style={{ position: 'absolute', width: `${i*18}%`, height: `${i*18}%`,
          border: `1px solid rgba(30,55,100,${0.5-i*0.07})`, borderRadius: '50%', pointerEvents: 'none' }} />
      ))}
      {/* Grid SVG */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.09 }}>
        <circle cx="50%" cy="50%" r="44%" fill="none" stroke="#06b6d4" strokeWidth="0.5" strokeDasharray="4 10"/>
        <circle cx="50%" cy="50%" r="30%" fill="none" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="3 7"/>
        <line x1="50%" y1="2%" x2="50%" y2="98%" stroke="#1e3a6e" strokeWidth="0.5"/>
        <line x1="2%" y1="50%" x2="98%" y2="50%" stroke="#1e3a6e" strokeWidth="0.5"/>
        <line x1="14%" y1="14%" x2="86%" y2="86%" stroke="#1e3a6e" strokeWidth="0.3"/>
        <line x1="86%" y1="14%" x2="14%" y2="86%" stroke="#1e3a6e" strokeWidth="0.3"/>
      </svg>
      {/* Center orb */}
      <div style={{ position: 'relative', zIndex: 2, width: 70, height: 70,
        background: 'radial-gradient(circle, rgba(37,99,235,0.35) 0%, rgba(6,182,212,0.1) 60%, transparent 100%)',
        borderRadius: '50%', border: '1px solid rgba(6,182,212,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 28px rgba(6,182,212,0.18)', animation: 'orb-float 3.5s ease-in-out infinite' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#06b6d4', lineHeight: 1 }}>{processed}</div>
          <div style={{ fontSize: 7, color: 'rgba(6,182,212,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>Events</div>
        </div>
      </div>
      {/* Orbiting dots */}
      {events.map((msg, i) => {
        const angle = (i / 10) * 360 - 90;
        const r = 100, rad = angle * Math.PI / 180;
        const color = STATE_COLOR[msg.state ?? 'RECEIVED'];
        return (
          <div key={`${msg.event_id}-${i}`} title={`${msg.event_type ?? 'Event'} — ${msg.state}`} style={{
            position: 'absolute',
            left: `calc(50% + ${Math.cos(rad)*r}px)`, top: `calc(50% + ${Math.sin(rad)*r}px)`,
            transform: 'translate(-50%,-50%)', width: 9, height: 9, borderRadius: '50%',
            background: color, boxShadow: `0 0 8px ${color}`, zIndex: 3,
            animation: ['ANALYZING','INVESTIGATING','RISK_ASSESSMENT'].includes(msg.state??'') ? 'soc-pulse 1.4s ease-in-out infinite' : undefined,
          }} />
        );
      })}
      {/* Stats */}
      <div style={{ position: 'absolute', bottom: 10, left: 12 }}>
        <div style={{ fontSize: 10, color: '#2d4060' }}><span style={{ color: '#60a5fa', fontWeight: 700 }}>{processed}</span> processed</div>
        <div style={{ fontSize: 10, color: '#2d4060' }}><span style={{ color: '#f87171', fontWeight: 700 }}>{threats}</span> threats</div>
      </div>
      {/* LIVE badge */}
      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 4,
        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', borderRadius: 4, padding: '2px 8px' }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', animation: 'soc-pulse 2s ease-in-out infinite' }} />
        <span style={{ fontSize: 8.5, fontWeight: 700, color: '#10b981', letterSpacing: '0.1em' }}>LIVE</span>
      </div>
    </div>
  );
}

// ─── Attack type legend ────────────────────────────────────────────────────────
function TypeLegend({ incidents }: { incidents: Incident[] }) {
  const types: Record<string, number> = {};
  incidents.forEach(i => { const t = i.threat_type || 'Unknown'; types[t] = (types[t]||0)+1; });
  const sorted = Object.entries(types).sort((a,b) => b[1]-a[1]).slice(0,5);
  const total = Object.values(types).reduce((a,b)=>a+b,0)||1;
  const COLS = ['#ef4444','#3b82f6','#f59e0b','#8b5cf6','#10b981'];
  return (
    <div>
      {sorted.map(([name,count],i) => (
        <div key={name} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:7 }}>
          <span style={{ width:7,height:7,borderRadius:'50%',background:COLS[i],flexShrink:0 }} />
          <span style={{ fontSize:11,color:'#94a3b8',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{name}</span>
          <span style={{ fontSize:11,color:'#3d5575' }}>{Math.round(count/total*100)}%</span>
        </div>
      ))}
      {sorted.length===0 && <p style={{ fontSize:11,color:'#1e3260' }}>Run demo to populate</p>}
    </div>
  );
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────
const PIPE = [
  { label:'Event\nReceived',  icon:'📡', state:'RECEIVED' },
  { label:'Threat\nDetect',   icon:'🔍', state:'ANALYZING' },
  { label:'Investigation',    icon:'🧠', state:'INVESTIGATING' },
  { label:'Risk\nAssessment', icon:'⚡', state:'RISK_ASSESSMENT' },
  { label:'Incident\nCreated',icon:'📋', state:'INCIDENT_CREATED' },
  { label:'Human\nApproval',  icon:'👤', state:null },
  { label:'Response',         icon:'🛡️', state:null },
  { label:'Audit\nReport',    icon:'📊', state:'COMPLETED' },
];
function Pipeline({ messages }: { messages: WsMessage[] }) {
  const active = new Set(messages.slice(0,5).map(m=>m.state));
  return (
    <div style={{ display:'flex', alignItems:'flex-start' }}>
      {PIPE.map((step,i) => {
        const on = step.state ? active.has(step.state) : false;
        return (
          <div key={step.label} style={{ display:'flex', alignItems:'center', flex:1 }}>
            <div className="pipeline-step">
              <div className={`pipeline-node${on?' pipeline-node-active':''}`}
                style={on ? { background:'rgba(16,185,129,0.1)' } : {}}>
                <span style={{ fontSize:13 }}>{step.icon}</span>
              </div>
              <div className="pipeline-label" style={{ whiteSpace:'pre-line', textAlign:'center' }}>{step.label}</div>
            </div>
            {i < PIPE.length-1 && (
              <div className="pipeline-arrow" style={{ margin:'0 1px', marginBottom:20, fontSize:9,
                color: on ? 'rgba(16,185,129,0.6)' : 'rgba(30,55,100,0.7)' }}>›</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Agent Card (premium 3D) ──────────────────────────────────────────────────
const AGENTS_CFG = [
  { name:'Threat Detection', icon:'◎', colorCls:'agent3d-blue',   color:'#3b82f6', bg:'rgba(59,130,246,0.12)',  state:'ANALYZING' },
  { name:'Investigation',    icon:'◈', colorCls:'agent3d-purple', color:'#a78bfa', bg:'rgba(124,58,237,0.12)',  state:'INVESTIGATING' },
  { name:'Risk Assessment',  icon:'◐', colorCls:'agent3d-yellow', color:'#fbbf24', bg:'rgba(245,158,11,0.12)',  state:'RISK_ASSESSMENT' },
  { name:'Response Agent',   icon:'▶', colorCls:'agent3d-green',  color:'#34d399', bg:'rgba(16,185,129,0.12)',  state:'COMPLETED' },
  { name:'Report Generator', icon:'▤', colorCls:'agent3d-cyan',   color:'#06b6d4', bg:'rgba(6,182,212,0.12)',   state:'INCIDENT_CREATED' },
];

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [agents, setAgents] = useState<AgentStatus | null>(null);
  const [loadError, setLoadError] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMsg, setReportMsg] = useState('');
  const { connected, messages, clearMessages } = useWebSocket();
  const { status: mon, backendOnline } = useMonitoring();
  const sparkRef = useRef<number[]>([0,0,0,0,0,0,0,0]);

  const loadData = useCallback(async () => {
    try {
      const [iR, aR] = await Promise.all([getIncidents(), getAgentsStatus()]);
      setIncidents(iR.data); setAgents(aR.data); setLoadError('');
    } catch { setLoadError('Backend offline — start: python -m uvicorn backend.api.main:app --port 8081'); }
  }, []);

  useEffect(() => { loadData(); const t = setInterval(loadData,15000); return () => clearInterval(t); }, [loadData]);
  useEffect(() => {
    const m = messages[0];
    if (m && (m.state==='COMPLETED'||m.state==='INCIDENT_CREATED')) setTimeout(loadData,800);
  }, [messages, loadData]);
  useEffect(() => { if (mon) sparkRef.current = [...sparkRef.current.slice(-7), mon.events_received]; }, [mon]);

  // Derived
  const active   = incidents.filter(i=>i.status==='awaiting_approval').length;
  const critical = incidents.filter(i=>i.risk_level==='critical').length;
  const high     = incidents.filter(i=>i.risk_level==='high').length;
  const pending  = incidents.filter(i=>i.human_approval==='pending').length;
  const avgRisk  = incidents.length ? Math.round(incidents.reduce((a,b)=>a+b.risk_score,0)/incidents.length) : 0;
  const secScore = Math.max(0,100-avgRisk);
  const evRec    = mon?.events_received  ?? 0;
  const evProc   = mon?.events_processed ?? 0;
  const threats  = mon?.threats_detected ?? 0;
  const uptime   = mon?.uptime ?? '--:--:--';
  const llmMode  = mon?.llm_backend ?? agents?.llm_backend ?? '—';
  const feedMsgs = messages.filter(m=>m.type==='event_update'||m.type==='connected');
  const inFlight = messages.filter(m=>m.type==='event_update'&&['ANALYZING','INVESTIGATING','RISK_ASSESSMENT'].includes(m.state??''));

  const handleTest = async () => { setSendingTest(true); try { await postTestEvents(1); } finally { setSendingTest(false); } };
  const handleReport = async () => {
    setReportLoading(true); setReportMsg('');
    try { await generateReport(); setReportMsg('✓ Report generated.'); }
    catch { setReportMsg('✗ Failed — ensure backend is running.'); }
    finally { setReportLoading(false); }
  };

  return (
    <div style={{ maxWidth:'100%', paddingBottom:16 }}>

      {/* Error */}
      {loadError && (
        <div style={{ marginBottom:10, padding:'9px 14px', borderRadius:8,
          background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.22)', color:'#f87171', fontSize:11.5 }}>
          ⚠ {loadError}
        </div>
      )}

      {/* ── Row 1: KPI Cards ──────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:12 }}>
        <KpiCard label="Security Score" value={`${secScore}`} sub={secScore>=70?'Excellent Posture':'Needs Attention'}
          color="#10b981" icon="🛡️" variant={secScore>=70?'green':'red'} sparkPts={sparkRef.current.map(v=>Math.max(0,100-v))} />
        <KpiCard label="Active Incidents" value={active} sub={`${critical} Critical · ${high} High`}
          color="#ef4444" icon="🚨" variant="red" sparkPts={sparkRef.current.map((_,i)=>Math.max(0,active-i*0.2))} />
        <KpiCard label="Events Received" value={evRec.toLocaleString()} sub={`${evProc} processed`}
          color="#3b82f6" icon="📡" variant="blue" sparkPts={sparkRef.current} />
        <KpiCard label="Threats Detected" value={threats.toLocaleString()} sub={`Uptime ${uptime}`}
          color="#8b5cf6" icon="⚡" variant="purple" sparkPts={sparkRef.current.map(v=>Math.round(v*0.6))} />
        <KpiCard label="AI Engine Mode" value={llmMode} sub={`Pending: ${pending}`}
          color="#06b6d4" icon="🤖" variant="cyan" sparkPts={[1,2,1,3,2,4,3,5,4,6]} />
      </div>

      {/* ── Pipeline ──────────────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding:'10px 16px', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
          <span className="soc-panel-title">AI Orchestration Pipeline</span>
          <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase',
            color: inFlight.length>0?'#10b981':'#3d5575', display:'flex', alignItems:'center', gap:4 }}>
            {inFlight.length>0 && <span style={{ width:5,height:5,borderRadius:'50%',background:'#10b981',animation:'soc-pulse 1.4s ease-in-out infinite' }} />}
            {inFlight.length>0 ? `${inFlight.length} event(s) in-flight` : 'Idle — waiting for events'}
          </span>
        </div>
        <Pipeline messages={messages} />
      </div>

      {/* ── Row 2: Radar + Feed + Agents ─────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 252px 278px', gap:10, marginBottom:10 }}>

        {/* Radar panel */}
        <div className="glass-card" style={{ padding:'14px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span className="soc-panel-title">Live Cyber Threat Map</span>
              <span style={{ display:'inline-flex', alignItems:'center', gap:4,
                background: connected?'rgba(16,185,129,0.08)':'rgba(100,116,139,0.08)',
                border:`1px solid ${connected?'rgba(16,185,129,0.2)':'rgba(100,116,139,0.2)'}`,
                borderRadius:4, padding:'1px 7px', fontSize:8.5, fontWeight:700,
                color: connected?'#10b981':'#64748b', letterSpacing:'0.08em', textTransform:'uppercase' }}>
                <span style={{ width:4,height:4,borderRadius:'50%',background:'currentColor' }} />
                {connected?'Live':'Offline'}
              </span>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <button onClick={handleTest} disabled={sendingTest||!backendOnline} style={{
                fontSize:10, padding:'4px 10px', borderRadius:5,
                border:'1px solid rgba(59,130,246,0.3)', background:'rgba(59,130,246,0.07)',
                color:'#60a5fa', cursor:'pointer', fontWeight:600,
                opacity:sendingTest||!backendOnline?0.4:1 }}>
                {sendingTest?'Sending…':'⚡ Test Event'}
              </button>
              <DemoButton onSuccess={() => setTimeout(loadData,600)} />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 165px', gap:14 }}>
            <div style={{ height:252, position:'relative' }}>
              <RadarViz messages={messages} processed={evProc} threats={threats} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:9.5, fontWeight:700, color:'#2d4060', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:10 }}>Incident Types</div>
                <TypeLegend incidents={incidents} />
              </div>
              <div style={{ paddingTop:10, borderTop:'1px solid rgba(30,50,90,0.45)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:10, color:'#3d5575' }}>Total</span>
                  <span style={{ fontSize:13, fontWeight:800, color:'#e2e8f0' }}>{incidents.length}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:10, color:'#3d5575' }}>Critical+High</span>
                  <span style={{ fontSize:13, fontWeight:800, color:'#f87171' }}>{critical+high}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Feed */}
        <div className="glass-card" style={{ padding:'14px', display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, flexShrink:0 }}>
            <span className="soc-panel-title">Live Attack Feed</span>
            <button onClick={clearMessages} style={{ fontSize:9.5, color:'#2d4060', background:'none', border:'none', cursor:'pointer' }}>Clear</button>
          </div>
          <div style={{ flex:1, overflowY:'auto', maxHeight:290 }}>
            {feedMsgs.length===0 ? (
              <div style={{ textAlign:'center', paddingTop:48 }}>
                <p style={{ fontSize:12, color:'#2d4060' }}>{connected?'Monitoring active…':'Connecting…'}</p>
                <p style={{ fontSize:10, color:'#1a2840', marginTop:5 }}>Send a test event to see live data</p>
              </div>
            ) : feedMsgs.slice(0,14).map((msg,i) => {
              if (msg.type==='connected') return (
                <div key={`c${i}`} className="feed-item">
                  <div className="feed-icon feed-icon-low" style={{ fontSize:10 }}>✓</div>
                  <div style={{ flex:1 }}><div className="feed-title">WS Connected</div><div className="feed-sub">Monitoring active</div></div>
                </div>
              );
              const sev = (msg.severity??'medium').toLowerCase();
              const s = SEV[sev] ?? SEV.medium;
              return (
                <div key={`${msg.event_id}-${msg.state}-${i}`} className={`feed-item ${i===0?'anim-slide-in':''}`}>
                  <div className={`feed-icon feed-icon-${sev}`}>{s.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="feed-title" style={{ textTransform:'capitalize' }}>
                      {msg.event_type?.replace(/_/g,' ')??msg.threat_type??'Security Event'}
                    </div>
                    <div className="feed-sub">{msg.source_ip??'unknown'}</div>
                  </div>
                  <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
                    <span className={`es-badge es-${msg.state??'RECEIVED'}`}>
                      <span className="es-dot"/>{msg.state}
                    </span>
                    <span className="feed-time">{msg.timestamp?timeAgo(msg.timestamp):''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Agents */}
        <div className="glass-card" style={{ padding:'14px', display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <span className="soc-panel-title">AI Agents — Live Status</span>
              <Link href="/agents" className="soc-panel-link">All →</Link>
            </div>
            {AGENTS_CFG.map(cfg => {
              const isActive = inFlight.some(m=>m.state===cfg.state) ||
                (cfg.state==='COMPLETED' && messages.some(m=>m.state==='COMPLETED' && Date.now()-new Date(m.timestamp??0).getTime()<5000));
              const live = agents?.agents.find(a=>a.name.toLowerCase().includes(cfg.name.toLowerCase().split(' ')[0]));
              return (
                <div key={cfg.name} className={`agent3d ${cfg.colorCls}${isActive?' agent3d-active':''}`}>
                  <div className="agent3d-icon" style={{ background:cfg.bg }}>
                    <span style={{ color:cfg.color, fontSize:15 }}>{cfg.icon}</span>
                    {isActive && <div className="agent3d-icon-ring" style={{ color:cfg.color }} />}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="agent3d-name">{cfg.name}</div>
                    <div className="agent3d-task">{isActive?'Processing…':live?.mode??'Rule-based'}</div>
                  </div>
                  <div style={{ flexShrink:0 }}>
                    {isActive
                      ? <span className="agent3d-status-active">ACTIVE</span>
                      : <span className="agent3d-status-ready">{live?'READY':'—'}</span>}
                  </div>
                  {isActive && <span className="pulse-dot pulse-dot-active" style={{ background:cfg.color, color:cfg.color, position:'absolute', right:8, top:8, width:6, height:6 }} />}
                </div>
              );
            })}
          </div>
          {/* Perf bars */}
          <div style={{ borderTop:'1px solid rgba(30,50,90,0.45)', paddingTop:10 }}>
            <span className="soc-panel-title" style={{ marginBottom:10, display:'block' }}>Agent Performance (24H)</span>
            {[
              { n:'Threat Detection', p:agents?98:0 },
              { n:'Investigation',    p:agents?96:0 },
              { n:'Risk Assessment',  p:agents?97:0 },
            ].map(r => (
              <div key={r.n} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                <span style={{ fontSize:9.5, color:'#4a6080', width:100, flexShrink:0 }}>{r.n}</span>
                <div className="perf-bar-track"><div className="perf-bar-fill" style={{ width:`${r.p}%` }} /></div>
                <span style={{ fontSize:10, color:'#34d399', fontWeight:700, width:28, textAlign:'right', flexShrink:0 }}>
                  {r.p?`${r.p}%`:'—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3: Incidents + Reports + System ──────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 278px', gap:10 }}>

        {/* Incidents table */}
        <div className="glass-card" style={{ padding:'14px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <span className="soc-panel-title">Active Incidents</span>
            <Link href="/incidents" className="soc-panel-link">View All →</Link>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'76px 1fr 80px 116px 74px 62px', gap:8 }} className="inc-table-header">
            <span>ID</span><span>Threat Type</span><span>Severity</span><span>Status</span><span>Risk</span><span>Time</span>
          </div>
          {incidents.length===0 ? (
            <div style={{ textAlign:'center', padding:'26px 0' }}>
              <p style={{ fontSize:12, color:'#2d4060' }}>No incidents yet.</p>
              <p style={{ fontSize:10, color:'#1a2840', marginTop:4 }}>
                Click <strong style={{ color:'#3b82f6' }}>Run Demo Incident</strong>
              </p>
            </div>
          ) : incidents.slice(0,7).map(inc => {
            const sid = `INC-${inc.id.slice(-4).toUpperCase()}`;
            const sev = inc.severity?.toLowerCase()??'medium';
            const stLbl = inc.status==='awaiting_approval'?'PENDING':inc.status==='contained'?'CONTAINED':inc.status?.toUpperCase()??'OPEN';
            const stCls = inc.status==='awaiting_approval'?'badge-pending':inc.status==='contained'?'badge-contained':'badge-investigating';
            return (
              <Link key={inc.id} href={`/incidents/${inc.id}`} style={{ textDecoration:'none' }}>
                <div className="inc-table-row" style={{ gridTemplateColumns:'76px 1fr 80px 116px 74px 62px', gap:8 }}>
                  <span className="inc-id">{sid}</span>
                  <span className="inc-title" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{inc.threat_type}</span>
                  <span><span className={`badge-base badge-${sev}`}>{inc.severity}</span></span>
                  <span><span className={`badge-base ${stCls}`}>{stLbl}</span></span>
                  <span className="inc-score" style={{ color:riskColor(inc.risk_score) }}>{Math.round(inc.risk_score)}</span>
                  <span style={{ fontSize:10, color:'#3d5575' }}>{timeAgo(inc.created_at)}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Right col */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

          {/* Report Generator */}
          <div className="glass-card" style={{ padding:'14px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <span className="soc-panel-title">Report Generator</span>
              <button onClick={handleReport} disabled={reportLoading||!backendOnline} style={{
                fontSize:10, padding:'3px 9px', borderRadius:4,
                border:'1px solid rgba(59,130,246,0.3)', background:'rgba(59,130,246,0.06)',
                color:'#60a5fa', cursor:'pointer', fontWeight:600,
                opacity:reportLoading||!backendOnline?0.4:1 }}>
                {reportLoading?'Generating…':'+ Create'}
              </button>
            </div>
            {reportMsg && (
              <div style={{ marginBottom:8, fontSize:10.5, color:reportMsg.includes('✓')?'#34d399':'#f87171' }}>{reportMsg}</div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:10 }}>
              <button onClick={handleReport} disabled={reportLoading} className="report-card" style={{ textAlign:'left', width:'100%' }}>
                <div className="report-icon">📋</div>
                <div><div className="report-name">Executive</div><div className="report-sub">High-level overview</div></div>
              </button>
              <button onClick={handleReport} disabled={reportLoading} className="report-card" style={{ textAlign:'left', width:'100%' }}>
                <div className="report-icon" style={{ background:'rgba(124,58,237,0.12)' }}>⚙</div>
                <div><div className="report-name">Technical</div><div className="report-sub">Detailed analysis</div></div>
              </button>
            </div>
            <div style={{ fontSize:9, fontWeight:700, color:'#2d4060', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Scheduled</div>
            <div className="sched-row">
              <span style={{ fontSize:12 }}>📄</span>
              <div style={{ flex:1 }}><div className="sched-name">Daily Security Report</div><div className="sched-time">Every day at 08:00 AM</div></div>
              <span className="sched-pdf">PDF</span>
            </div>
            <div className="sched-row">
              <span style={{ fontSize:12 }}>📊</span>
              <div style={{ flex:1 }}><div className="sched-name">Weekly Threat Report</div><div className="sched-time">Every Monday at 09:00 AM</div></div>
              <span className="sched-pdf">PDF</span>
            </div>
          </div>

          {/* System Status */}
          <div className="glass-card" style={{ padding:'14px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <span className="soc-panel-title">System Status</span>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ width:6,height:6,borderRadius:'50%',background:backendOnline?'#10b981':'#ef4444',
                  boxShadow:backendOnline?'0 0 5px #10b981':'none' }} />
                <span style={{ fontSize:9.5, fontWeight:600, color:backendOnline?'#10b981':'#f87171' }}>
                  {backendOnline?'Operational':'Degraded'}
                </span>
              </span>
            </div>
            <div style={{ marginBottom:10 }}>
              <div style={{ height:4, background:'rgba(30,50,90,0.5)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ width:`${secScore}%`, height:'100%', background:'linear-gradient(90deg,#10b981,#06b6d4)', borderRadius:3, transition:'width 0.6s ease' }} />
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
              {[
                { l:'Backend',    v:backendOnline?'Online':'Offline',             ok:backendOnline },
                { l:'WebSocket',  v:connected?'Connected':'Reconnecting',         ok:connected },
                { l:'AI Engine',  v:llmMode,                                      ok:true },
                { l:'Notion',     v:agents?.notion_integration??'—',              ok:agents?.notion_integration==='connected' },
                { l:'Uptime',     v:uptime,                                       ok:true },
                { l:'WS Clients', v:String(mon?.websocket_connections??0),        ok:true },
              ].map(r => (
                <div key={r.l} style={{ padding:'5px 0', borderBottom:'1px solid rgba(30,50,90,0.28)' }}>
                  <div style={{ fontSize:9, color:'#2d4060', marginBottom:1 }}>{r.l}</div>
                  <div style={{ fontSize:11, fontWeight:600, color:r.ok?'#34d399':'#fbbf24' }}>{r.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
