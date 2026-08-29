import axios from 'axios';

// With Next.js rewrites configured, all /api/* calls are proxied to the backend.
// This works in both dev (npm run dev) and production (npm start).
const api = axios.create({ baseURL: '', timeout: 30000 });

export interface Incident {
  id: string;
  threat_type: string;
  severity: string;
  confidence: number;
  investigation_summary: string;
  root_cause: string;
  risk_score: number;
  risk_level: string;
  business_impact: string;
  recommendation: string;
  status: string;
  human_approval: string;
  notion_page_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentStatus {
  agents: Array<{
    name: string;
    status: string;
    mode: string;
    description: string;
  }>;
  notion_integration: string;
  llm_backend: string;
}

export interface MonitoringStatus {
  monitoring: boolean;
  uptime: string;
  events_received: number;
  events_processed: number;
  threats_detected: number;
  last_event: string | null;
  websocket_connections: number;
  llm_backend: string;
}

/** WebSocket URL — direct to backend (Next.js rewrites don't proxy WS). */
export function getWsUrl(): string {
  // In the browser, use the public env var if set, otherwise derive from location
  if (typeof window !== 'undefined') {
    const env = process.env.NEXT_PUBLIC_WS_URL;
    if (env) return env;
    // Default: same host, port 8081 (dev backend)
    const host = window.location.hostname;
    return `ws://${host}:8081/ws/events`;
  }
  return 'ws://localhost:8081/ws/events';
}

export const getIncidents = () => api.get<Incident[]>('/api/incidents');
export const getIncident = (id: string) => api.get<Incident>(`/api/incidents/${id}`);
export const approveIncident = (id: string, notes?: string) =>
  api.post(`/api/incidents/${id}/approve`, { notes });
export const rejectIncident = (id: string, notes?: string) =>
  api.post(`/api/incidents/${id}/reject`, { notes });
export const getAgentsStatus = () => api.get<AgentStatus>('/api/agents/status');
export const getMonitoringStatus = () => api.get<MonitoringStatus>('/api/monitoring/status');
export const runDemo = () => api.post('/api/demo/run');
export const generateReport = () => api.post('/api/reports/generate', { include_all: true });
export const analyzeEvent = (event: object) => api.post('/api/analyze', { event });
export const postTestEvents = (count = 1) =>
  api.post('/api/events/test', { count });

export default api;
