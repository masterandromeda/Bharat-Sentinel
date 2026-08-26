'use client';
import { useEffect, useState } from 'react';
import { getAgentsStatus, AgentStatus } from '@/lib/api';

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAgentsStatus()
      .then(r => setAgents(r.data))
      .catch(() => setError('Cannot connect to backend.'))
      .finally(() => setLoading(false));
  }, []);

  const agentDetails = [
    {
      name: 'Threat Detection Agent',
      description: 'Analyzes incoming security events and classifies threats by type, severity, and confidence score.',
      inputs: ['Security event', 'Login event', 'Suspicious activity'],
      outputs: ['threat_detected', 'threat_type', 'severity', 'confidence', 'reason'],
      icon: '🔍',
      color: 'from-blue-600/20 to-blue-800/10',
      border: 'border-blue-600/30',
    },
    {
      name: 'Investigation Agent',
      description: 'Deep-dives into detected threats to identify root causes, evidence, and attack patterns.',
      inputs: ['Threat detection result', 'Event information'],
      outputs: ['incident_summary', 'root_cause', 'evidence', 'attack_pattern', 'recommended_action'],
      icon: '🕵️',
      color: 'from-purple-600/20 to-purple-800/10',
      border: 'border-purple-600/30',
    },
    {
      name: 'Risk Assessment Agent',
      description: 'Quantifies business risk and provides actionable recommendations for the security team.',
      inputs: ['Threat result', 'Investigation result'],
      outputs: ['risk_score', 'risk_level', 'business_impact', 'recommendation'],
      icon: '📊',
      color: 'from-cyan-600/20 to-cyan-800/10',
      border: 'border-cyan-600/30',
    },
  ];

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#e2e8f0]">AI Agents</h1>
        <p className="text-[#64748b] text-sm mt-1">Collaborating agents that power the BharatSentinel workflow</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">⚠ {error}</div>
      )}

      {/* Pipeline diagram */}
      <div className="glass-card p-6 mb-8">
        <h2 className="text-sm font-semibold text-[#e2e8f0] uppercase tracking-wide mb-4">Orchestration Pipeline</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {['Security Event', 'Threat Detection', 'Investigation', 'Risk Assessment', 'Notion Incident', 'Human Approval', 'Response'].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-2">
              <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-[#1e2d4a] text-[#e2e8f0] whitespace-nowrap">{step}</span>
              {i < arr.length - 1 && <span className="text-[#64748b] text-xs">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Agent Cards */}
      <div className="grid gap-6">
        {agentDetails.map((agent, idx) => {
          const live = agents?.agents[idx];
          return (
            <div key={agent.name} className={`glass-card p-6 bg-gradient-to-r ${agent.color} border ${agent.border}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{agent.icon}</span>
                  <div>
                    <h3 className="text-[#e2e8f0] font-semibold">{agent.name}</h3>
                    <p className="text-[#64748b] text-xs mt-0.5">{agent.description}</p>
                  </div>
                </div>
                {live && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-xs text-green-400 capitalize">{live.status}</span>
                    <span className="text-xs text-[#64748b] ml-1">({live.mode})</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[#64748b] mb-2">Inputs</p>
                  <ul className="space-y-1">
                    {agent.inputs.map(i => (
                      <li key={i} className="text-xs text-[#64748b] flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-[#64748b]" />{i}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[#64748b] mb-2">Output Fields</p>
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
    </div>
  );
}
