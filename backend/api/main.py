import os
import asyncio
import logging
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field

from backend.database.database import init_db
from backend.models.incident import (
    AnalyzeRequest, ApprovalRequest, ReportRequest,
)
from backend.orchestrator import orchestrator
from backend.services.incident_service import generate_report
from backend.services.ai_service import llm_mode
from backend.services import monitoring as mon

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ── Demo event template ────────────────────────────────────────────────────────
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


# ── Lifespan: init DB + start monitoring worker ────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("BharatSentinel backend started. DB initialized.")

    # Start the background monitoring worker
    worker_task = asyncio.create_task(mon.monitoring_worker())
    logger.info("[Monitor] Background worker started.")

    yield

    # Graceful shutdown
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
    logger.info("[Monitor] Background worker stopped.")


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


# ── Pydantic models for new endpoints ─────────────────────────────────────────
class IncomingEvent(BaseModel):
    """
    A raw security event from any connected source.
    Designed to be source-agnostic: servers, apps, firewalls, SIEM platforms.
    """
    timestamp:   Optional[str] = None
    source:      str           = Field("unknown", description="Source system identifier")
    event_type:  str           = Field(..., description="Event category")
    source_ip:   Optional[str] = None
    destination: Optional[str] = None
    username:    Optional[str] = None
    message:     Optional[str] = None
    failed_attempts: Optional[int] = None
    location:    Optional[str] = None
    additional_context: Optional[dict] = None


class GenerateTestEventsRequest(BaseModel):
    count: int = Field(1, ge=1, le=10, description="Number of test events to generate (1-10)")


# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health():
    return {
        "status": "healthy",
        "service": "BharatSentinel",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


# ── Monitoring ─────────────────────────────────────────────────────────────────
@app.get("/api/monitoring/status", tags=["Monitoring"])
def monitoring_status():
    """
    Real runtime monitoring state.
    Counters reflect actual events received and processed this session.
    events_received / events_processed are from in-process counters (reset on restart).
    threats_detected includes all incidents ever stored in the database.
    """
    db_counts = mon._get_event_counts_from_db()
    return {
        "monitoring": True,
        "uptime": mon.state.uptime,
        "events_received": mon.state.events_received,
        "events_processed": mon.state.events_processed,
        "threats_detected": db_counts["threats"],
        "last_event": mon.state.last_event_at,
        "websocket_connections": len(mon.manager._connections),
        "llm_backend": llm_mode(),
    }


# ── Security Event Collector ───────────────────────────────────────────────────
@app.post("/api/events", tags=["Monitoring"], status_code=202)
async def receive_event(event: IncomingEvent):
    """
    Accept a security event from any connected source.
    The event is immediately persisted and queued for async AI analysis.
    Returns the event_id so the caller can track state via WebSocket.
    """
    event_dict = event.model_dump(exclude_none=False)
    event_id = await mon.collect_event(event_dict)
    return {
        "accepted": True,
        "event_id": event_id,
        "message": "Event received and queued for analysis.",
    }


@app.post("/api/events/test", tags=["Monitoring"], status_code=202)
async def generate_test_events(request: GenerateTestEventsRequest):
    """
    Generate controlled test/demo security events for development and demonstration.
    These events are clearly marked _test=True and do NOT represent real attacks.
    """
    event_ids = []
    for _ in range(request.count):
        event = mon.get_test_event()
        event_id = await mon.collect_event(event)
        event_ids.append(event_id)
    return {
        "generated": len(event_ids),
        "event_ids": event_ids,
        "note": "These are test/demo events generated for development purposes only.",
    }


# ── WebSocket real-time stream ─────────────────────────────────────────────────
@app.websocket("/ws/events")
async def websocket_events(websocket: WebSocket):
    """
    Real-time event state stream.
    Every state transition (RECEIVED → ANALYZING → … → COMPLETED) is pushed here.
    """
    await mon.manager.connect(websocket)
    # Send current monitoring state on connect so the client has immediate context
    try:
        await websocket.send_text(
            __import__("json").dumps({
                "type": "connected",
                "monitoring_status": {
                    "events_received": mon.state.events_received,
                    "events_processed": mon.state.events_processed,
                    "threats_detected": mon.state.threats_detected,
                    "uptime": mon.state.uptime,
                },
            })
        )
        while True:
            # Keep the connection alive; client can send pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        mon.manager.disconnect(websocket)
    except Exception:
        try:
            mon.manager.disconnect(websocket)
        except ValueError:
            pass


# ── Incidents ──────────────────────────────────────────────────────────────────
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
    """Run the full AI pipeline synchronously on a security event."""
    event_dict = request.event.model_dump()
    if not event_dict.get("timestamp"):
        event_dict["timestamp"] = datetime.utcnow().isoformat()
    try:
        incident = orchestrator.run_pipeline(event_dict)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return incident


@app.post("/api/incidents/{incident_id}/approve", tags=["Incidents"])
def approve_incident(incident_id: str, request: ApprovalRequest):
    incident = orchestrator.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if incident["human_approval"] != "pending":
        raise HTTPException(status_code=400, detail="Incident already actioned")
    return orchestrator.approve_incident(incident_id, request.notes or "")


@app.post("/api/incidents/{incident_id}/reject", tags=["Incidents"])
def reject_incident(incident_id: str, request: ApprovalRequest):
    incident = orchestrator.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if incident["human_approval"] != "pending":
        raise HTTPException(status_code=400, detail="Incident already actioned")
    return orchestrator.reject_incident(incident_id, request.notes or "")


# ── Agents ─────────────────────────────────────────────────────────────────────
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


# ── Demo ───────────────────────────────────────────────────────────────────────
@app.post("/api/demo/run", tags=["Demo"])
def run_demo():
    """Run the built-in demo scenario synchronously (existing dashboard button)."""
    event = {**_DEMO_EVENT_TEMPLATE, "timestamp": datetime.utcnow().isoformat()}
    try:
        incident = orchestrator.run_pipeline(event)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return {
        "message": "Demo incident created successfully",
        "incident": incident,
    }


# ── Reports ────────────────────────────────────────────────────────────────────
@app.post("/api/reports/generate", tags=["Reports"])
def create_report(request: ReportRequest):
    return generate_report(
        incident_id=request.incident_id if not request.include_all else None
    )
