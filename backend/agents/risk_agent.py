import json
import logging
from backend.services.ai_service import call_llm

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a cybersecurity Risk Assessment Agent.
Given threat detection and investigation results, assess the risk and return a JSON object with exactly these fields:
{
  "risk_score": number between 0 and 100,
  "risk_level": "low" or "medium" or "high" or "critical",
  "business_impact": "description of potential business impact",
  "recommendation": "clear recommendation for the security team"
}
Be objective and calibrated."""


_SEVERITY_BASE = {"low": 20, "medium": 45, "high": 72, "critical": 90}
_LEVEL_MAP = [(80, "critical"), (60, "high"), (35, "medium"), (0, "low")]


def _rule_based_fallback(threat: dict, investigation: dict) -> dict:
    severity = threat.get("severity", "medium")
    confidence = float(threat.get("confidence", 60))
    base = _SEVERITY_BASE.get(severity, 45)
    # Adjust score by confidence
    risk_score = round(base * (confidence / 100) + base * 0.2, 1)
    risk_score = min(risk_score, 100)

    risk_level = "low"
    for threshold, level in _LEVEL_MAP:
        if risk_score >= threshold:
            risk_level = level
            break

    threat_type = threat.get("threat_type", "Unknown Threat")

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "business_impact": (
            f"If unaddressed, this {threat_type} could lead to unauthorized data access, "
            "account compromise, and potential data breach. Organizations in healthcare, "
            "finance, or education face regulatory penalties and reputational damage."
        ),
        "recommendation": investigation.get(
            "recommended_action",
            "Immediately investigate and contain the incident. Apply the recommended remediation steps.",
        ),
    }


def run(threat_result: dict, investigation_result: dict) -> dict:
    """Run risk assessment on threat and investigation results."""
    user_prompt = (
        f"Threat Detection:\n{json.dumps(threat_result, indent=2)}\n\n"
        f"Investigation:\n{json.dumps(investigation_result, indent=2)}\n\n"
        "Assess risk and return JSON."
    )
    fallback = _rule_based_fallback(threat_result, investigation_result)
    result = call_llm(SYSTEM_PROMPT, user_prompt, fallback)
    logger.info(f"Risk assessment result: {result}")
    return result
