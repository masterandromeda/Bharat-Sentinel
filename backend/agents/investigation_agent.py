import json
import logging
from backend.services.ai_service import call_llm

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a cybersecurity Investigation Agent.
Given a security event and threat detection result, investigate and return a JSON object with exactly these fields:
{
  "incident_summary": "clear summary of the incident",
  "root_cause": "most likely root cause",
  "evidence": ["evidence item 1", "evidence item 2"],
  "attack_pattern": "name or description of attack pattern",
  "recommended_action": "specific recommended remediation action"
}
Be specific and actionable."""


def _rule_based_fallback(event: dict, threat: dict) -> dict:
    threat_type = threat.get("threat_type", "Unknown Threat")
    severity = threat.get("severity", "medium")
    description = event.get("description", "")
    target_user = event.get("target_user", "Unknown User")
    location = event.get("location", "Unknown Location")
    source_ip = event.get("source_ip", "Unknown IP")

    evidence = []
    if source_ip and source_ip != "Unknown IP":
        evidence.append(f"Source IP: {source_ip}")
    if location and location != "Unknown Location":
        evidence.append(f"Unusual login location: {location}")
    if target_user and target_user != "Unknown User":
        evidence.append(f"Targeted account: {target_user}")
    evidence.append(f"Event type: {event.get('event_type', 'N/A')}")
    evidence.append(f"Confidence score: {threat.get('confidence', 'N/A')}%")

    return {
        "incident_summary": (
            f"A {severity}-severity {threat_type} incident was detected targeting '{target_user}'. "
            f"The event originated from {source_ip} ({location}). {description}"
        ),
        "root_cause": (
            "Likely unauthorized access attempt using stolen or guessed credentials. "
            "Possible credential stuffing or brute-force attack from an external actor."
        ),
        "evidence": evidence,
        "attack_pattern": "MITRE ATT&CK T1110 - Brute Force / T1078 - Valid Accounts",
        "recommended_action": (
            "1. Temporarily lock the targeted account. "
            "2. Block the suspicious source IP. "
            "3. Require multi-factor authentication. "
            "4. Review access logs for the past 24 hours. "
            "5. Notify the account owner."
        ),
    }


def run(event: dict, threat_result: dict) -> dict:
    """Run investigation on detected threat."""
    user_prompt = (
        f"Security Event:\n{json.dumps(event, indent=2)}\n\n"
        f"Threat Detection Result:\n{json.dumps(threat_result, indent=2)}\n\n"
        "Investigate and return JSON."
    )
    fallback = _rule_based_fallback(event, threat_result)
    result = call_llm(SYSTEM_PROMPT, user_prompt, fallback)
    logger.info(f"Investigation result: {result}")
    return result
