import json
import logging
from datetime import datetime
from backend.orchestrator.orchestrator import list_incidents

logger = logging.getLogger(__name__)


def generate_report(incident_id: str = None) -> dict:
    """Generate an audit/summary report for one or all incidents."""
    incidents = list_incidents()

    if incident_id:
        incidents = [i for i in incidents if i["id"] == incident_id]

    total = len(incidents)
    critical = sum(1 for i in incidents if i.get("risk_level") == "critical")
    high = sum(1 for i in incidents if i.get("risk_level") == "high")
    approved = sum(1 for i in incidents if i.get("human_approval") == "approved")
    rejected = sum(1 for i in incidents if i.get("human_approval") == "rejected")
    pending = sum(1 for i in incidents if i.get("human_approval") == "pending")

    severity_breakdown = {}
    for inc in incidents:
        sev = inc.get("severity", "unknown")
        severity_breakdown[sev] = severity_breakdown.get(sev, 0) + 1

    avg_risk = (
        round(sum(i.get("risk_score", 0) for i in incidents) / total, 1)
        if total > 0 else 0
    )

    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "total_incidents": total,
        "critical_incidents": critical,
        "high_incidents": high,
        "average_risk_score": avg_risk,
        "approval_summary": {
            "approved": approved,
            "rejected": rejected,
            "pending": pending,
        },
        "severity_breakdown": severity_breakdown,
        "incidents": incidents,
    }
