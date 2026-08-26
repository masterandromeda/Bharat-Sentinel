import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

NOTION_API_KEY = os.getenv("NOTION_API_KEY", "")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID", "")

_notion_available = False

try:
    import httpx
    _httpx_available = True
except ImportError:
    _httpx_available = False

NOTION_VERSION = "2022-06-28"


def _is_configured() -> bool:
    return bool(NOTION_API_KEY and NOTION_DATABASE_ID)


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
    }


def create_incident_page(incident: dict, investigation: dict) -> Optional[str]:
    """Create a new page in the Notion incidents database."""
    if not _is_configured():
        logger.info("Notion not configured — skipping page creation.")
        return None
    if not _httpx_available:
        logger.warning("httpx not installed — cannot call Notion API.")
        return None

    evidence = investigation.get("evidence", [])
    evidence_text = "\n".join(f"• {e}" for e in evidence) if evidence else "N/A"

    payload = {
        "parent": {"database_id": NOTION_DATABASE_ID},
        "properties": {
            "Incident ID": {"title": [{"text": {"content": incident["id"][:8]}}]},
            "Threat Type": {"rich_text": [{"text": {"content": incident.get("threat_type", "")}}]},
            "Severity": {"select": {"name": incident.get("severity", "medium").capitalize()}},
            "Risk Score": {"number": float(incident.get("risk_score", 0))},
            "Status": {"select": {"name": "Awaiting Approval"}},
            "Human Approval": {"select": {"name": "Pending"}},
            "Timestamp": {"date": {"start": incident.get("created_at", "")}},
        },
        "children": [
            _heading("Investigation Summary"),
            _paragraph(incident.get("investigation_summary", "")),
            _heading("Root Cause"),
            _paragraph(incident.get("root_cause", "")),
            _heading("Evidence"),
            _paragraph(evidence_text),
            _heading("Attack Pattern"),
            _paragraph(investigation.get("attack_pattern", "")),
            _heading("Recommendation"),
            _paragraph(incident.get("recommendation", "")),
            _heading("Business Impact"),
            _paragraph(incident.get("business_impact", "")),
        ],
    }

    try:
        import httpx
        with httpx.Client(timeout=10) as client:
            response = client.post(
                "https://api.notion.com/v1/pages",
                headers=_headers(),
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            page_id = data.get("id")
            logger.info(f"Notion page created: {page_id}")
            return page_id
    except Exception as e:
        logger.error(f"Failed to create Notion page: {e}")
        return None


def update_incident_status(incident: dict) -> bool:
    """Update the status and human approval on an existing Notion page."""
    page_id = incident.get("notion_page_id")
    if not page_id or not _is_configured():
        return False
    if not _httpx_available:
        return False

    approval = incident.get("human_approval", "pending").capitalize()
    status = incident.get("status", "open").replace("_", " ").title()

    payload = {
        "properties": {
            "Status": {"select": {"name": status}},
            "Human Approval": {"select": {"name": approval}},
        }
    }

    try:
        import httpx
        with httpx.Client(timeout=10) as client:
            response = client.patch(
                f"https://api.notion.com/v1/pages/{page_id}",
                headers=_headers(),
                json=payload,
            )
            response.raise_for_status()
            logger.info(f"Notion page {page_id} updated to status={status}")
            return True
    except Exception as e:
        logger.error(f"Failed to update Notion page: {e}")
        return False


def _heading(text: str) -> dict:
    return {
        "object": "block",
        "type": "heading_2",
        "heading_2": {"rich_text": [{"type": "text", "text": {"content": text}}]},
    }


def _paragraph(text: str) -> dict:
    return {
        "object": "block",
        "type": "paragraph",
        "paragraph": {"rich_text": [{"type": "text", "text": {"content": text or ""}}]},
    }
