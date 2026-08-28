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
from backend.services.ai_service import llm_mode

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Demo event is built fresh on each /api/demo/run call (see run_demo below)
_DEMO_EVENT_TEMPLATE = {
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
    "failed_attempts": 15,
    "additional_context": {
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
    mode = llm_mode()
    has_notion = bool(
        os.getenv("NOTION_API_KEY", "").strip() and
        os.getenv("NOTION_DATABASE_ID", "").strip()
    )
    return {
        "agents": [
            {
                "name": "Threat Detection Agent",
                "status": "active",
                "mode": mode,
                "description": "Classifies incoming security events by threat type, severity, and confidence",
            },
            {
                "name": "Investigation Agent",
                "status": "active",
                "mode": mode,
                "description": "Identifies root cause, evidence, and attack pattern from threat data",
            },
            {
                "name": "Risk Assessment Agent",
                "status": "active",
                "mode": mode,
                "description": "Calculates risk score, business impact, and remediation recommendation",
            },
        ],
        "notion_integration": "connected" if has_notion else "mock-mode",
        "llm_backend": mode,
    }


# ── Demo ──────────────────────────────────────────────────────────────────────

@app.post("/api/demo/run", tags=["Demo"])
def run_demo():
    """Run the built-in demo scenario: Suspicious Login Detected."""
    # Stamp a fresh timestamp on every run
    event = {**_DEMO_EVENT_TEMPLATE, "timestamp": datetime.utcnow().isoformat()}
    incident = orchestrator.run_pipeline(event)
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
