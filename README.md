# BharatSentinel

## AI Agents. Human Control. Continuous Security.

> AI-Native Enterprise Cybersecurity Workforce for resource-constrained organizations.

---

## Overview

BharatSentinel is an AI-native enterprise cybersecurity workforce designed for organizations — hospitals, colleges, SMEs, and startups — that cannot afford a large dedicated security team.

Three collaborating AI agents handle the full incident lifecycle: **Security Event → Threat Detection → Investigation → Risk Assessment → Notion Incident → Human Approval → Response → Audit**.

---

## Problem

- 60% of Indian SMEs and institutions lack a dedicated cybersecurity team
- Security incidents go undetected for days or weeks
- Manual incident response is slow, expensive, and inconsistent
- Compliance documentation is often incomplete

## Solution

BharatSentinel deploys collaborating AI agents that:
1. Detect threats in real-time security events
2. Automatically investigate and assess risk
3. Create structured incidents in Notion for human review
4. Enforce human-in-the-loop approval before any response
5. Generate audit trails for compliance

---

## Architecture

```
Next.js Frontend
      ↓
FastAPI Backend (port 8000)
      ↓
AI Orchestrator
      ↓ ↓ ↓
Threat Agent → Investigation Agent → Risk Agent
      ↓
Notion Integration (create/update incident)
      ↓
Human Approval (approve / reject)
      ↓
Response + Audit Record
```

---

## AI Agents

### 1. Threat Detection Agent
- Input: Raw security event
- Output: `threat_detected`, `threat_type`, `severity`, `confidence`, `reason`
- Fallback: Rule-based detection when LLM is unavailable

### 2. Investigation Agent
- Input: Threat result + event
- Output: `incident_summary`, `root_cause`, `evidence`, `attack_pattern`, `recommended_action`

### 3. Risk Assessment Agent
- Input: Threat result + investigation result
- Output: `risk_score` (0-100), `risk_level`, `business_impact`, `recommendation`

---

## Notion Workflow

```
AI detects incident
      ↓
Notion page created (Status: Awaiting Approval)
      ↓
Human reviews and approves/rejects
      ↓
Notion page updated (Status: Contained / Rejected)
      ↓
Audit timestamp recorded
```

Required Notion database properties:
- `Incident ID` (Title)
- `Threat Type` (Rich text)
- `Severity` (Select: Low / Medium / High / Critical)
- `Risk Score` (Number)
- `Status` (Select: Awaiting Approval / Contained / Rejected)
- `Human Approval` (Select: Pending / Approved / Rejected)
- `Timestamp` (Date)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS |
| Backend | Python 3.12, FastAPI, SQLite |
| AI/LLM | Azure OpenAI / OpenAI API (falls back to rule-based) |
| Notion | Notion API v2022-06-28 |
| Container | Docker, docker-compose |

---

## Project Structure

```
Bharat-Sentinel/
├── frontend/            # Next.js app
│   ├── app/(app)/       # Dashboard, Agents, Incidents, Reports pages
│   ├── components/      # Sidebar, Badge, StatCard, DemoButton
│   └── lib/api.ts       # API client
├── backend/
│   ├── api/main.py      # FastAPI application & all endpoints
│   ├── agents/          # threat_agent, investigation_agent, risk_agent
│   ├── orchestrator/    # orchestrator.py — full pipeline coordination
│   ├── services/        # ai_service, incident_service
│   ├── models/          # Pydantic models
│   └── database/        # SQLite setup
├── notion/
│   ├── notion_client.py # Notion API calls
│   └── workflows.py     # Workflow helpers
├── Dockerfile           # Backend Docker image
├── docker-compose.yml   # Full stack compose
├── requirements.txt     # Python dependencies
└── .env.example         # Environment variable template
```

---

## Local Setup

### Prerequisites
- Python 3.12+
- Node.js 20+
- pip

### 1. Clone and configure

```bash
git clone https://github.com/masterandromeda/Bharat-Sentinel.git
cd Bharat-Sentinel
cp .env.example .env
# Edit .env with your credentials
```

### 2. Backend

```bash
pip install -r requirements.txt
uvicorn backend.api.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000  
Backend API: http://localhost:8000  
API Docs: http://localhost:8000/docs

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `AZURE_OPENAI_KEY` | Azure OpenAI API key | Optional* |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL | Optional* |
| `AZURE_OPENAI_DEPLOYMENT` | Model deployment name (default: gpt-4) | Optional |
| `OPENAI_API_KEY` | OpenAI API key (alternative to Azure) | Optional* |
| `NOTION_API_KEY` | Notion integration token | Optional** |
| `NOTION_DATABASE_ID` | Notion database ID | Optional** |
| `DB_PATH` | SQLite DB file path (default: `bharat_sentinel.db`) | No |
| `NEXT_PUBLIC_API_URL` | Backend URL for frontend (default: `http://localhost:8000`) | No |

*Without an LLM key, agents use rule-based fallback logic — still fully functional.  
**Without Notion credentials, the app runs in local mock mode — incidents stored in SQLite only.

---

## Docker Deployment

### Backend only

```bash
docker build -t bharatsentinel-backend .
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=your_key \
  -e NOTION_API_KEY=your_notion_key \
  -e NOTION_DATABASE_ID=your_db_id \
  bharatsentinel-backend
```

### Full stack with docker-compose

```bash
docker-compose up --build
```

### Zopday / Zop.dev Deployment

The backend exposes `0.0.0.0:8000` as required. Set environment variables in the Zopday dashboard. The `/health` endpoint is available for health checks.

---

## Demo Workflow

1. Open http://localhost:3000/dashboard
2. Click **Run Demo Incident** button
3. The system runs: Threat Detection → Investigation → Risk Assessment
4. A new incident appears in the Recent Events list and in Notion (if configured)
5. Navigate to Incidents → click the incident
6. Review AI findings, risk score, and recommendation
7. Click **Approve — Mark Contained** or **Reject**
8. Status updates in the UI and Notion
9. Go to Reports → Generate Report to see the audit trail

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/incidents` | List all incidents |
| GET | `/api/incidents/{id}` | Get single incident |
| POST | `/api/analyze` | Run AI pipeline on event |
| POST | `/api/incidents/{id}/approve` | Human approve |
| POST | `/api/incidents/{id}/reject` | Human reject |
| GET | `/api/agents/status` | Agent status |
| POST | `/api/demo/run` | Run built-in demo scenario |
| POST | `/api/reports/generate` | Generate audit report |

Full interactive docs: http://localhost:8000/docs

---

## Future Scope

- **SIEM integration** — ingest alerts from Splunk, ELK, or Microsoft Sentinel
- **Email/Slack notifications** — alert security team on new incidents
- **Custom agent workflows** — user-defined playbooks via LangGraph
- **Multi-tenant** — support multiple organizations with isolated data
- **Advanced analytics** — trend analysis and threat intelligence dashboards
- **Auto-remediation** — safe automated response for low-risk incidents with human pre-approval
- **Mobile app** — approve/reject incidents from mobile

---

## Security Notes

- No API keys are committed to the repository
- All sensitive configuration is via environment variables
- No destructive security actions are executed — demo uses safe simulated responses
- Human approval is required before any response action

---

*Built for the Notion Track Hackathon — AI Agents. Human Control. Continuous Security.*
