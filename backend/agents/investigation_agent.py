import json
import logging
from backend.services.ai_service import call_llm

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a cybersecurity Investigation Agent.
Given a security event and threat detection result, investigate and return a JSON object with EXACTLY these fields:
{
  "incident_summary": "clear 2-3 sentence summary of what happened",
  "root_cause": "most likely root cause with supporting reasoning",
  "evidence": ["specific evidence item 1", "specific evidence item 2", "..."],
  "attack_pattern": "MITRE ATT&CK technique name and ID if applicable",
  "recommended_action": "numbered list of specific remediation steps"
}
Use all available structured fields (source_ip, failed_attempts, location, target_user) as evidence.
Be specific and actionable. Reference concrete details from the event."""


def _rule_based_fallback(event: dict, threat: dict) -> dict:
    threat_type = threat.get("threat_type", "Unknown Threat")
    severity    = threat.get("severity", "medium")
    description = event.get("description", "")
    # Accept both target_user and user fields
    target_user = event.get("target_user") or event.get("user") or "Unknown User"
    location    = event.get("location", "Unknown Location")
    source_ip   = event.get("source_ip", "Unknown IP")
    failed      = event.get("failed_attempts")
    event_type  = event.get("event_type", "N/A")

    # Build evidence list from concrete facts
    evidence = []
    if source_ip and source_ip != "Unknown IP":
        evidence.append(f"Source IP: {source_ip}")
    if location and location != "Unknown Location":
        evidence.append(f"Login origin: {location} (outside expected geography)")
    if target_user and target_user != "Unknown User":
        evidence.append(f"Targeted account: {target_user}")
    if failed is not None:
        evidence.append(f"Failed authentication attempts: {failed}")
    evidence.append(f"Event classification: {event_type}")
    evidence.append(f"Threat detection confidence: {threat.get('confidence', 'N/A')}%")
    if description:
        # Add first 120 chars of description as contextual evidence
        short_desc = description[:120].rstrip()
        if short_desc:
            evidence.append(f"Event context: {short_desc}")

    failed_str = f" with {failed} failed attempts" if failed is not None else ""
    return {
        "incident_summary": (
            f"A {severity}-severity {threat_type} was detected targeting the account '{target_user}'. "
            f"The activity originated from IP {source_ip} ({location}){failed_str}. "
            f"This pattern is consistent with an external actor attempting unauthorised access."
        ),
        "root_cause": (
            "Most likely cause: stolen or guessed credentials used in an automated brute-force "
            "or credential stuffing attack. The account may have been discovered through a data "
            "breach or publicly exposed login portal."
        ),
        "evidence": evidence,
        "attack_pattern": "MITRE ATT&CK T1110 — Brute Force (sub-techniques: T1110.001 Password Guessing, T1110.004 Credential Stuffing)",
        "recommended_action": (
            "1. Immediately lock or suspend the targeted account.\n"
            "2. Block source IP " + (source_ip if source_ip != "Unknown IP" else "range") + " at the perimeter firewall.\n"
            "3. Enable or enforce multi-factor authentication on all admin accounts.\n"
            "4. Audit login history for the past 48 hours for signs of successful access.\n"
            "5. Reset credentials for the targeted account and any shared credentials.\n"
            "6. Notify the account owner and security operations team."
        ),
    }


def run(event: dict, threat_result: dict) -> dict:
    """Run investigation on a detected threat."""
    user_prompt = (
        "Security Event:\n" + json.dumps(event, indent=2) + "\n\n"
        "Threat Detection Result:\n" + json.dumps(threat_result, indent=2) + "\n\n"
        "Investigate and return JSON."
    )
    fallback = _rule_based_fallback(event, threat_result)
    result = call_llm(SYSTEM_PROMPT, user_prompt, fallback)
    logger.info(f"Investigation: summary_len={len(result.get('incident_summary',''))} evidence_count={len(result.get('evidence',[]))}")
    return result
