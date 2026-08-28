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

export const getIncidents = () => api.get<Incident[]>('/api/incidents');
export const getIncident = (id: string) => api.get<Incident>(`/api/incidents/${id}`);
export const approveIncident = (id: string, notes?: string) =>
  api.post(`/api/incidents/${id}/approve`, { notes });
export const rejectIncident = (id: string, notes?: string) =>
  api.post(`/api/incidents/${id}/reject`, { notes });
export const getAgentsStatus = () => api.get<AgentStatus>('/api/agents/status');
export const runDemo = () => api.post('/api/demo/run');
export const generateReport = () => api.post('/api/reports/generate', { include_all: true });
export const analyzeEvent = (event: object) => api.post('/api/analyze', { event });

export default api;
