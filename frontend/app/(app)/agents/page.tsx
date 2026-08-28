'use client';
import { useEffect, useState } from 'react';
import { getAgentsStatus, AgentStatus } from '@/lib/api';
import { useWebSocket } from '@/lib/useWebSocket';
import { useMonitoring } from '@/lib/useMonitoring';

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentStatus | null>(null);
  const [error, setError] = useState('');

  const { connected, messages } = useWebSocket();
  const { status: monStatus, backendOnline } = useMonitoring();

  useEffect(() => {
    getAgentsStatus()
      .then(r => setAgents(r.data))
      .catch(() => setError('Cannot connect to backend.'));
  }, []);

  // Count in-flight (ANALYZING / INVESTIGATING / RISK_ASSESSMENT) events from WS stream
  const inFlight = messages.filter(m =>
    m.type === 'event_update' &&
    ['ANALYZING', 'INVESTIGATING', 'RISK_ASSESSMENT'].includes(m.state ?? '')
  );

  const agentDetails = [
    {
      name: 'Threat Detection Agent',
      description: 'Analyzes incoming security events and classifies threats by type, severity, and confidence score.',
      inputs: ['Security event', 'Login event', 'Suspicious activity'],
      outputs: ['threat_detected', 'threat_type', 'severity', 'confidence', 'reason'],
      activeState: 'ANALYZING',
      color: 'from-blue-600/20 to-blue-800/10',
      border: 'border-blue-600/30',
      dotColor: '#60a5fa',
    },
    {
      name: 'Investigation Agent',
      description: 'Deep-dives into detected threats to identify root causes, evidence, and attack patterns.',
      inputs: ['Threat detection result', 'Event information'],
      outputs: ['incident_summary', 'root_cause', 'evidence', 'attack_pattern', 'recommended_action'],
      activeState: 'INVESTIGATING',
      color: 'from-purple-600/20 to-purple-800/10',
      border: 'border-purple-600/30',
      dotColor: '#a78bfa',
    },
    {
      name: 'Risk Assessment Agent',
      description: 'Quantifies business risk and provides actionable recommendations for the security team.',
      inputs: ['Threat result', 'Investigation result'],
      outputs: ['risk_score', 'risk_level', 'business_impact', 'recommendation'],
      activeState: 'RISK_ASSESSMENT',
      color: 'from-cyan-600/20 to-cyan-800/10',
      border: 'border-cyan-600/30',
      dotColor: '#67e8f9',
    },
  ];

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#e2e8f0]">AI Agents</h1>
        <p className="text-[#64748b] text-sm mt-1">
          Collaborating agents that power the BharatSentinel security workflow
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">⚠ {error}</div>
      )}

      {/* ── System status strip ── */}
      <div className="glass-card p-4 mb-6 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: backendOnline ? '#10b981' : '#ef4444', display: 'inline-block' }} />
          <span className="text-xs text-[#64748b]">Backend <strong className={backendOnline ? 'text-green-400' : 'text-red-400'}>{backendOnline ? 'Online' : 'Offline'}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#34d399' : '#64748b', display: 'inline-block' }} />
          <span className="text-xs text-[#64748b]">WebSocket <strong className={connected ? 'text-green-400' : 'text-[#64748b]'}>{connected ? 'Connected' : 'Reconnecting'}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748b]">AI Engine <strong className="text-blue-400">{monStatus?.llm_backend ?? '—'}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748b]">Uptime <strong className="text-[#64748b] font-mono">{monStatus?.uptime ?? '--:--:--'}</strong></span>
        </div>
        {inFlight.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#60a5fa', display: 'inline-block', animation: 'bs-pulse 1.4s ease-in-out infinite' }} />
            <span className="text-xs text-blue-400 font-semibold">{inFlight.length} event{inFlight.length > 1 ? 's' : ''} processing…</span>
          </div>
        )}
      </div>

      {/* ── Pipeline diagram ── */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-sm font-semibold text-[#e2e8f0] uppercase tracking-wide mb-4">Orchestration Pipeline</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {['Security Event', 'Threat Detection', 'Investigation', 'Risk Assessment', 'Notion Incident', 'Human Approval', 'Response'].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-2">
              <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-[#1e2d4a] text-[#e2e8f0] whitespace-nowrap">{step}</span>
              {i < arr.length - 1 && <span className="text-[#3d5070] text-xs">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Agent Cards ── */}
      <div className="grid gap-6">
        {agentDetails.map((agent, idx) => {
          const live = agents?.agents[idx];
          // Is this agent currently active? Check WS messages for its state
          const isActive = inFlight.some(m => m.state === agent.activeState);

          return (
            <div key={agent.name} className={`glass-card p-6 bg-gradient-to-r ${agent.color} border ${agent.border}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-3 mb-1">
                    {/* Live processing indicator */}
                    <span
                      style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: isActive ? agent.dotColor : (live ? '#10b981' : '#1e2d4a'),
                        flexShrink: 0,
                        animation: isActive ? 'bs-pulse 1.4s ease-in-out infinite' : undefined,
                      }}
                    />
                    <h3 className="text-[#e2e8f0] font-semibold">{agent.name}</h3>
                  </div>
                  <p className="text-[#64748b] text-xs">{agent.description}</p>
                </div>
                {live && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold ${isActive ? 'text-blue-400' : 'text-green-400'}`}>
                      {isActive ? 'Processing' : 'Ready'}
                    </span>
                    <span className="text-xs text-[#3d5070]">({live.mode})</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[#3d5070] mb-2">Inputs</p>
                  <ul className="space-y-1">
                    {agent.inputs.map(inp => (
                      <li key={inp} className="text-xs text-[#64748b] flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-[#3d5070]" />{inp}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[#3d5070] mb-2">Output Fields</p>
                  <ul className="space-y-1">
                    {agent.outputs.map(o => (
                      <li key={o} className="text-xs text-blue-400 font-mono flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-blue-400" />{o}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Recent agent activity from WS ── */}
      {messages.filter(m => m.type === 'event_update').length > 0 && (
        <div className="glass-card p-6 mt-6">
          <h2 className="text-sm font-semibold text-[#e2e8f0] uppercase tracking-wide mb-4">Recent Agent Activity</h2>
          <div className="space-y-2">
            {messages.filter(m => m.type === 'event_update').slice(0, 10).map((msg, i) => (
              <div key={`${msg.event_id}-${msg.state}-${i}`} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/2">
                <span className={`es-badge es-${msg.state}`}>
                  <span className="es-dot-pulse" />
                  {msg.state}
                </span>
                <span className="text-xs text-[#4a5f7a] flex-1 truncate">
                  {msg.event_type?.replace(/_/g, ' ') ?? msg.threat_type ?? 'security event'}
                  {msg.incident_id && <span className="text-[#2d3f5a] ml-2 font-mono text-[10px]">→ incident created</span>}
                </span>
                <span className="text-[10px] text-[#2d3f5a] shrink-0 font-mono">
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
