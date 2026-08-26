# BharatSentinel — Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Next.js Frontend                      │
│  Dashboard | Agents | Incidents | Reports               │
│  /dashboard /agents /incidents /reports                 │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (REST)
                         ▼
┌─────────────────────────────────────────────────────────┐
│              FastAPI Backend (port 8000)                │
│  /health  /api/analyze  /api/incidents  /api/agents     │
│  /api/demo/run  /api/reports/generate                   │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  AI Orchestrator                        │
│  Coordinates agent pipeline sequentially               │
└──────────┬──────────────────────┬──────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐   ┌──────────────────────────────────┐
│ Threat Detection │→  │ Investigation Agent              │
│ Agent            │   │ (root cause, evidence, pattern)  │
└──────────────────┘   └──────────────────────────────────┘
                                  │
                                  ▼
                       ┌──────────────────────────────────┐
                       │ Risk Assessment Agent             │
                       │ (score, level, business impact)  │
                       └──────────────┬───────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                  │
                    ▼                 ▼                  ▼
           ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐
           │  SQLite DB   │  │ Notion API  │  │  Human Approval  │
           │  (incidents) │  │  (incident) │  │  (approve/reject)│
           └──────────────┘  └─────────────┘  └──────────────────┘
```

## Data Flow

1. Frontend sends security event to `POST /api/analyze`
2. Orchestrator calls Threat Detection Agent
3. Threat result passed to Investigation Agent
4. Investigation result passed to Risk Assessment Agent
5. Incident persisted to SQLite
6. Notion page created (if configured)
7. Frontend polls `GET /api/incidents` to show updated state
8. Human approves/rejects via `POST /api/incidents/{id}/approve`
9. Status updated in SQLite and Notion

## Agent Modes

- **LLM mode**: Uses Azure OpenAI or OpenAI API with JSON output format
- **Rule-based mode**: Keyword/pattern matching when LLM is unavailable

Both modes produce identical JSON output schemas — the rest of the pipeline is unaffected.

## Notion Integration

- Requires `NOTION_API_KEY` and `NOTION_DATABASE_ID`
- If not configured, application runs in local-only mode (SQLite only)
- Uses Notion API v2022-06-28
- Creates/updates pages with structured properties and rich text blocks
