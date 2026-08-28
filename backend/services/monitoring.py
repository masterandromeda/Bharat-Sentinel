"""
BharatSentinel — Real-Time Security Monitoring Engine

Responsibilities:
  - Accept raw security events via POST /api/events
  - Persist each event to the security_events table
  - Queue every event for async AI processing
  - Stream state transitions to WebSocket clients
  - Track runtime counters (events received / processed / threats detected)
  - Expose /api/monitoring/status with real values
  - Provide a controlled test-event generator for dev/demo use

Design constraints:
  - All I/O is async; no blocking calls in the event loop
  - AI agent pipeline is CPU/network-bound, so it runs in a thread-pool executor
  - WebSocket broadcasts are best-effort (a slow/disconnected client never blocks processing)
  - This module never claims to monitor the public internet;
    it processes events submitted by connected sources only
"""

from __future__ import annotations

import asyncio
import json
import logging
import random
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Event state labels
# ─────────────────────────────────────────────────────────────────────────────
class EventState:
    RECEIVED       = "RECEIVED"
    ANALYZING      = "ANALYZING"
    INVESTIGATING  = "INVESTIGATING"
    RISK_ASSESSMENT = "RISK_ASSESSMENT"
    INCIDENT_CREATED = "INCIDENT_CREATED"
    COMPLETED      = "COMPLETED"
    ERROR          = "ERROR"


# ─────────────────────────────────────────────────────────────────────────────
# Runtime counters — single process, in-memory
# ─────────────────────────────────────────────────────────────────────────────
class MonitoringState:
    """Singleton holding live counters for /api/monitoring/status."""

    def __init__(self) -> None:
        self.started_at: datetime = datetime.now(timezone.utc)
        self.events_received: int = 0
        self.events_processed: int = 0
        self.threats_detected: int = 0
        self.last_event_at: Optional[str] = None

    def record_received(self, ts: Optional[str] = None) -> None:
        self.events_received += 1
        self.last_event_at = ts or datetime.now(timezone.utc).isoformat()

    def record_processed(self, threat_detected: bool) -> None:
        self.events_processed += 1
        if threat_detected:
            self.threats_detected += 1

    @property
    def uptime(self) -> str:
        delta = datetime.now(timezone.utc) - self.started_at
        h, rem = divmod(int(delta.total_seconds()), 3600)
        m, s   = divmod(rem, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"


# Module-level singleton
state = MonitoringState()


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket connection manager
# ─────────────────────────────────────────────────────────────────────────────
class ConnectionManager:
    """Manages active WebSocket connections; broadcasts are fire-and-forget."""

    def __init__(self) -> None:
        self._connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.append(ws)
        logger.info(f"[WS] Client connected. Total connections: {len(self._connections)}")

    def disconnect(self, ws: WebSocket) -> None:
        self._connections.remove(ws)
        logger.info(f"[WS] Client disconnected. Remaining: {len(self._connections)}")

    async def broadcast(self, message: dict) -> None:
        """Send a message to all connected clients; silently drop dead connections."""
        if not self._connections:
            return
        payload = json.dumps(message)
        dead: list[WebSocket] = []
        for ws in list(self._connections):
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            try:
                self._connections.remove(ws)
            except ValueError:
                pass


manager = ConnectionManager()


# ─────────────────────────────────────────────────────────────────────────────
# Async event queue
# ─────────────────────────────────────────────────────────────────────────────
_event_queue: asyncio.Queue = asyncio.Queue()


async def enqueue(event: dict) -> None:
    """Put a raw event dict onto the processing queue."""
    await _event_queue.put(event)


# ─────────────────────────────────────────────────────────────────────────────
# DB helpers (called from thread-pool, so sync is fine here)
# ─────────────────────────────────────────────────────────────────────────────
def _persist_raw_event(event_id: str, event: dict, status: str) -> None:
    from backend.database.database import get_connection
    conn = get_connection()
    try:
        conn.execute(
            """INSERT OR REPLACE INTO security_events
               (id, source, event_type, source_ip, destination, username,
                message, raw_payload, status, received_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                event_id,
                event.get("source", "unknown"),
                event.get("event_type", "unknown"),
                event.get("source_ip"),
                event.get("destination"),
                event.get("username") or event.get("target_user") or event.get("user"),
                event.get("message") or event.get("description"),
                json.dumps(event),
                status,
                event.get("timestamp") or datetime.now(timezone.utc).isoformat(),
            ),
        )
        conn.commit()
    finally:
        conn.close()


def _update_event_status(event_id: str, status: str) -> None:
    from backend.database.database import get_connection
    conn = get_connection()
    try:
        conn.execute(
            "UPDATE security_events SET status = ? WHERE id = ?",
            (status, event_id),
        )
        conn.commit()
    finally:
        conn.close()


def _get_event_counts_from_db() -> dict:
    """Return persisted event/threat counts as a cross-restart fallback."""
    from backend.database.database import get_connection
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT COUNT(*) as total, "
            "SUM(CASE WHEN status='COMPLETED' THEN 1 ELSE 0 END) as processed "
            "FROM security_events"
        ).fetchone()
        threats = conn.execute(
            "SELECT COUNT(*) as cnt FROM incidents"
        ).fetchone()
        return {
            "total": row["total"] or 0,
            "processed": row["processed"] or 0,
            "threats": threats["cnt"] or 0,
        }
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# Background worker
# ─────────────────────────────────────────────────────────────────────────────
async def _process_event(event: dict, event_id: str) -> None:
    """
    Run one event through the full agent pipeline.
    All state transitions are broadcast over WebSocket.
    The AI pipeline runs in a thread-pool executor to avoid blocking the loop.
    """
    loop = asyncio.get_running_loop()

    async def push(evt_state: str, extra: Optional[dict] = None) -> None:
        msg = {
            "type": "event_update",
            "event_id": event_id,
            "state": evt_state,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        if extra:
            msg.update(extra)
        await manager.broadcast(msg)

    await push(EventState.ANALYZING)
    _update_event_status(event_id, EventState.ANALYZING)

    try:
        # Translate incoming event fields to the orchestrator's expected shape
        pipeline_event = _normalise_for_pipeline(event, event_id)

        # --- Threat Detection (in thread-pool) ---
        from backend.agents import threat_agent
        threat = await loop.run_in_executor(
            None, threat_agent.run, pipeline_event
        )
        await push(EventState.INVESTIGATING, {
            "threat_type": threat.get("threat_type"),
            "severity": threat.get("severity"),
        })
        _update_event_status(event_id, EventState.INVESTIGATING)

        # --- Investigation (in thread-pool) ---
        from backend.agents import investigation_agent
        investigation = await loop.run_in_executor(
            None, investigation_agent.run, pipeline_event, threat
        )
        await push(EventState.RISK_ASSESSMENT)
        _update_event_status(event_id, EventState.RISK_ASSESSMENT)

        # --- Risk Assessment (in thread-pool) ---
        from backend.agents import risk_agent
        risk = await loop.run_in_executor(
            None, risk_agent.run, threat, investigation
        )

        # --- Persist incident (in thread-pool) ---
        incident = await loop.run_in_executor(
            None, _persist_incident, pipeline_event, threat, investigation, risk
        )
        _update_event_status(event_id, EventState.INCIDENT_CREATED)

        await push(EventState.INCIDENT_CREATED, {
            "incident_id": incident["id"],
            "risk_score": incident["risk_score"],
            "risk_level": incident["risk_level"],
        })

        state.record_processed(threat_detected=threat.get("threat_detected", True))
        _update_event_status(event_id, EventState.COMPLETED)
        await push(EventState.COMPLETED, {"incident_id": incident["id"]})

        logger.info(
            f"[Monitor] event={event_id} completed — "
            f"incident={incident['id']} threat={incident['threat_type']} "
            f"risk={incident['risk_score']}"
        )

    except RuntimeError as e:
        # LLM not configured or API failure — expected in dev without credentials
        logger.warning(f"[Monitor] event={event_id} agent error: {e}")
        _update_event_status(event_id, EventState.ERROR)
        await push(EventState.ERROR, {"reason": str(e)})
        state.record_processed(threat_detected=False)

    except Exception as e:
        logger.exception(f"[Monitor] event={event_id} unexpected error: {e}")
        _update_event_status(event_id, EventState.ERROR)
        await push(EventState.ERROR, {"reason": f"Unexpected error: {type(e).__name__}"})
        state.record_processed(threat_detected=False)


def _normalise_for_pipeline(event: dict, event_id: str) -> dict:
    """Map incoming collector event fields to the pipeline's expected keys."""
    return {
        "event_type": event.get("event_type", "unknown"),
        "description": (
            event.get("message")
            or event.get("description")
            or f"Security event: {event.get('event_type','unknown')}"
        ),
        "source_ip": event.get("source_ip"),
        "target_user": (
            event.get("username")
            or event.get("target_user")
            or event.get("user")
        ),
        "location": event.get("location"),
        "timestamp": event.get("timestamp") or datetime.now(timezone.utc).isoformat(),
        "failed_attempts": event.get("failed_attempts"),
        "additional_context": {
            "source": event.get("source"),
            "destination": event.get("destination"),
            "event_id": event_id,
            **(event.get("additional_context") or {}),
        },
    }


def _persist_incident(
    event: dict,
    threat: dict,
    investigation: dict,
    risk: dict,
) -> dict:
    """Write the completed incident to SQLite (synchronous, called from executor)."""
    import uuid as _uuid
    from backend.database.database import get_connection
    now = datetime.now(timezone.utc).isoformat()
    incident_id = str(_uuid.uuid4())
    incident = {
        "id": incident_id,
        "threat_type": threat.get("threat_type", "Unknown"),
        "severity": threat.get("severity", "medium"),
        "confidence": float(threat.get("confidence", 0)),
        "investigation_summary": investigation.get("incident_summary", ""),
        "root_cause": investigation.get("root_cause", ""),
        "risk_score": float(risk.get("risk_score", 0)),
        "risk_level": risk.get("risk_level", "medium"),
        "business_impact": risk.get("business_impact", ""),
        "recommendation": risk.get("recommendation", ""),
        "status": "awaiting_approval",
        "human_approval": "pending",
        "notion_page_id": None,
        "raw_event": json.dumps(event),
        "created_at": now,
        "updated_at": now,
    }
    conn = get_connection()
    try:
        conn.execute(
            """INSERT INTO incidents
               (id, threat_type, severity, confidence, investigation_summary,
                root_cause, risk_score, risk_level, business_impact, recommendation,
                status, human_approval, notion_page_id, raw_event, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                incident["id"], incident["threat_type"], incident["severity"],
                incident["confidence"], incident["investigation_summary"],
                incident["root_cause"], incident["risk_score"], incident["risk_level"],
                incident["business_impact"], incident["recommendation"],
                incident["status"], incident["human_approval"],
                incident["notion_page_id"], incident["raw_event"],
                incident["created_at"], incident["updated_at"],
            ),
        )
        conn.commit()
    finally:
        conn.close()
    return incident


async def monitoring_worker() -> None:
    """
    Background coroutine — runs for the lifetime of the server.
    Pulls events from the queue and processes them one at a time.
    (For higher throughput, increase worker count in lifespan.)
    """
    logger.info("[Monitor] Worker started.")
    while True:
        try:
            event, event_id = await _event_queue.get()
            await _process_event(event, event_id)
            _event_queue.task_done()
        except asyncio.CancelledError:
            logger.info("[Monitor] Worker cancelled — shutting down.")
            break
        except Exception as e:
            logger.exception(f"[Monitor] Worker loop error: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# Public collector entry point
# ─────────────────────────────────────────────────────────────────────────────
async def collect_event(event: dict) -> str:
    """
    Receive a raw security event, persist it as RECEIVED, and queue for processing.
    Returns the event_id assigned to this event.
    """
    event_id = str(uuid.uuid4())
    ts = event.get("timestamp") or datetime.now(timezone.utc).isoformat()
    event["timestamp"] = ts          # normalise in-place

    state.record_received(ts)

    # Persist immediately so no event is lost even if the worker crashes
    _persist_raw_event(event_id, event, EventState.RECEIVED)

    # Broadcast RECEIVED state to WebSocket clients
    await manager.broadcast({
        "type": "event_update",
        "event_id": event_id,
        "state": EventState.RECEIVED,
        "event_type": event.get("event_type"),
        "source": event.get("source", "unknown"),
        "source_ip": event.get("source_ip"),
        "timestamp": ts,
    })

    # Queue for async processing
    await _event_queue.put((event, event_id))
    return event_id


# ─────────────────────────────────────────────────────────────────────────────
# Test event generator (development / demo only)
# ─────────────────────────────────────────────────────────────────────────────
_TEST_EVENT_TEMPLATES = [
    {
        "source": "auth-server-01",
        "event_type": "failed_login",
        "source_ip": "185.220.101.42",
        "destination": "web-portal",
        "username": "admin",
        "message": "Multiple failed login attempts from unusual geographic location",
        "failed_attempts": 14,
        "location": "Unknown — Eastern Europe",
        "_test": True,
    },
    {
        "source": "auth-server-02",
        "event_type": "brute_force",
        "source_ip": "45.155.205.105",
        "destination": "ssh-gateway",
        "username": "root",
        "message": "Rapid successive SSH authentication failures — possible brute-force",
        "failed_attempts": 47,
        "location": "Unknown — Russia",
        "_test": True,
    },
    {
        "source": "endpoint-agent",
        "event_type": "malware_detection",
        "source_ip": "10.0.0.88",
        "destination": "file-server-01",
        "username": "svc_backup",
        "message": "Ransomware-like file encryption activity detected on shared drive",
        "_test": True,
    },
    {
        "source": "waf-01",
        "event_type": "sql_injection_attempt",
        "source_ip": "103.21.244.0",
        "destination": "api-gateway",
        "username": None,
        "message": "SQL injection pattern detected in HTTP request body",
        "_test": True,
    },
    {
        "source": "ids-01",
        "event_type": "port_scan",
        "source_ip": "192.168.1.200",
        "destination": "internal-network",
        "username": None,
        "message": "Systematic port scan across internal subnet detected",
        "_test": True,
    },
    {
        "source": "dlp-agent",
        "event_type": "suspicious_data_access",
        "source_ip": "10.0.1.55",
        "destination": "hr-database",
        "username": "contractor_01",
        "message": "Unusually large data export from HR database outside business hours",
        "_test": True,
    },
    {
        "source": "email-gateway",
        "event_type": "phishing_attempt",
        "source_ip": "209.85.167.52",
        "destination": "mail-server",
        "username": "ceo@example.com",
        "message": "Spear-phishing email with malicious attachment targeting executive account",
        "_test": True,
    },
]


def get_test_event() -> dict:
    """Return a random test event with a fresh timestamp. Clearly marked _test=True."""
    template = random.choice(_TEST_EVENT_TEMPLATES)
    event = dict(template)
    event["timestamp"] = datetime.now(timezone.utc).isoformat()
    return event
