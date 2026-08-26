import uuid
import json
import logging
from datetime import datetime, timezone

from backend.agents import threat_agent, investigation_agent, risk_agent
from backend.database.database import get_connection

logger = logging.getLogger(__name__)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def run_pipeline(event: dict) -> dict:
    """
    Full agent pipeline:
    1. Threat Detection
    2. Investigation
    3. Risk Assessment
    4. Persist incident to SQLite
    5. Push to Notion (if configured)
    Returns the created incident record.
    """
    incident_id = str(uuid.uuid4())
    now = _now()

    # --- Step 1: Threat Detection ---
    logger.info(f"[{incident_id}] Running threat detection...")
    threat = threat_agent.run(event)

    # --- Step 2: Investigation ---
    logger.info(f"[{incident_id}] Running investigation...")
    investigation = investigation_agent.run(event, threat)

    # --- Step 3: Risk Assessment ---
    logger.info(f"[{incident_id}] Running risk assessment...")
    risk = risk_agent.run(threat, investigation)

    # --- Step 4: Persist to SQLite ---
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

    # --- Step 5: Notion ---
    try:
        from notion.notion_client import create_incident_page
        notion_page_id = create_incident_page(incident, investigation)
        if notion_page_id:
            _update_notion_id(incident_id, notion_page_id)
            incident["notion_page_id"] = notion_page_id
    except Exception as e:
        logger.warning(f"Notion integration skipped: {e}")

    logger.info(f"[{incident_id}] Pipeline complete. Status: awaiting_approval")
    return incident


def _update_notion_id(incident_id: str, notion_page_id: str):
    conn = get_connection()
    try:
        conn.execute(
            "UPDATE incidents SET notion_page_id = ?, updated_at = ? WHERE id = ?",
            (notion_page_id, _now(), incident_id),
        )
        conn.commit()
    finally:
        conn.close()


def approve_incident(incident_id: str, notes: str = "") -> dict:
    return _set_approval(incident_id, "approved", notes)


def reject_incident(incident_id: str, notes: str = "") -> dict:
    return _set_approval(incident_id, "rejected", notes)


def _set_approval(incident_id: str, approval: str, notes: str) -> dict:
    now = _now()
    status = "contained" if approval == "approved" else "rejected"
    conn = get_connection()
    try:
        conn.execute(
            "UPDATE incidents SET human_approval = ?, status = ?, updated_at = ? WHERE id = ?",
            (approval, status, now, incident_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
    finally:
        conn.close()

    if not row:
        raise ValueError(f"Incident {incident_id} not found")

    incident = dict(row)

    # Notify Notion
    try:
        from notion.notion_client import update_incident_status
        update_incident_status(incident)
    except Exception as e:
        logger.warning(f"Notion status update skipped: {e}")

    return incident


def get_incident(incident_id: str) -> dict | None:
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def list_incidents() -> list:
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM incidents ORDER BY created_at DESC").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
