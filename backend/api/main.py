import os
import logging
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.database.database import init_db
from backend.models.incident import (
    AnalyzeRequest, ApprovalRequest, ReportRequest, IncidentResponse
)
from backend.orchestrator import orchestrator
from backend.services.incident_service import generate_report

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

DEMO_EVENT = {
    "event_type": "suspicious_login",
    "description": (
        "Multiple failed login attempts detected for admin account. "
        "15 failed attempts in 3 minutes from an unusual geographic location. "
        "Login time is 3:47 AM, outside normal business hours. "
        "The targeted account has admin-level privileges."
    ),
    "source_ip": "203.0.113.42",
    "target_user": "admin@bharatsentinel.in",
    "location": "Unknown — Eastern Europe",
    "timestamp": datetime.utcnow().isoformat(),
    "additional_context": {
        "failed_attempts": 15,
        "time_window_minutes": 3,
        "normal_login_location": "Mumbai, India",
        "account_type": "administrator",
    },
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("BharatSentinel backend started. DB initialized.")
    yield


app = FastAPI(
    title="BharatSentinel API",
    description="AI-Native Enterprise Cybersecurity Workforce",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
def health():
    return {
        "status": "healthy",
        "service": "BharatSentinel",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


# ── Incidents ─────────────────────────────────────────────────────────────────

@app.get("/api/incidents", tags=["Incidents"])
def get_incidents():
    return orchestrator.list_incidents()


@app.get("/api/incidents/{incident_id}", tags=["Incidents"])
def get_incident(incident_id: str):
    incident = orchestrator.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@app.post("/api/analyze", tags=["Incidents"])
def analyze_event(request: AnalyzeRequest):
    """Run the full AI pipeline on a security event."""
    event_dict = request.event.model_dump()
    if not event_dict.get("timestamp"):
        event_dict["timestamp"] = datetime.utcnow().isoformat()
    incident = orchestrator.run_pipeline(event_dict)
    return incident


@app.post("/api/incidents/{incident_id}/approve", tags=["Incidents"])
def approve_incident(incident_id: str, request: ApprovalRequest):
    """Human approves an incident response."""
    incident = orchestrator.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if incident["human_approval"] != "pending":
        raise HTTPException(status_code=400, detail="Incident already actioned")
    return orchestrator.approve_incident(incident_id, request.notes or "")


@app.post("/api/incidents/{incident_id}/reject", tags=["Incidents"])
def reject_incident(incident_id: str, request: ApprovalRequest):
    """Human rejects an incident response."""
    incident = orchestrator.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if incident["human_approval"] != "pending":
        raise HTTPException(status_code=400, detail="Incident already actioned")
    return orchestrator.reject_incident(incident_id, request.notes or "")


# ── Agents ────────────────────────────────────────────────────────────────────

@app.get("/api/agents/status", tags=["Agents"])
def agents_status():
    import os
    has_llm = bool(
        os.getenv("AZURE_OPENAI_KEY") or os.getenv("OPENAI_API_KEY")
    )
    has_notion = bool(
        os.getenv("NOTION_API_KEY") and os.getenv("NOTION_DATABASE_ID")
    )
    return {
        "agents": [
            {
                "name": "Threat Detection Agent",
                "status": "active",
                "mode": "llm" if has_llm else "rule-based",
                "description": "Detects and classifies security threats",
            },
            {
                "name": "Investigation Agent",
                "status": "active",
                "mode": "llm" if has_llm else "rule-based",
                "description": "Investigates threats and identifies root cause",
            },
            {
                "name": "Risk Assessment Agent",
                "status": "active",
                "mode": "llm" if has_llm else "rule-based",
                "description": "Assesses risk score and business impact",
            },
        ],
        "notion_integration": "connected" if has_notion else "mock-mode",
        "llm_backend": "azure-openai" if os.getenv("AZURE_OPENAI_KEY") else
                       ("openai" if os.getenv("OPENAI_API_KEY") else "rule-based"),
    }


# ── Demo ──────────────────────────────────────────────────────────────────────

@app.post("/api/demo/run", tags=["Demo"])
def run_demo():
    """Run the built-in demo scenario: Suspicious Login Detected."""
    incident = orchestrator.run_pipeline(DEMO_EVENT)
    return {
        "message": "Demo incident created successfully",
        "incident": incident,
    }


# ── Reports ───────────────────────────────────────────────────────────────────

@app.post("/api/reports/generate", tags=["Reports"])
def create_report(request: ReportRequest):
    """Generate an audit/summary report."""
    return generate_report(
        incident_id=request.incident_id if not request.include_all else None
    )
