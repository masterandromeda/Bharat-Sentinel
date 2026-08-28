import json
import logging
from backend.services.ai_service import call_llm

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a cybersecurity Threat Detection Agent.
Analyze the security event below and return a JSON object with EXACTLY these fields:
{
  "threat_detected": true or false,
  "threat_type": "string describing the threat type",
  "severity": "low" or "medium" or "high" or "critical",
  "confidence": number between 0 and 100,
  "reason": "one or two sentence explanation citing specific event details"
}
Rules:
- Use the structured fields (source_ip, failed_attempts, location, event_type) to inform your analysis.
- Only mark as critical if there is strong evidence of active compromise.
- Be specific: name the attack pattern (e.g. brute-force, credential stuffing, phishing, lateral movement).
- confidence reflects how certain you are given the available evidence."""


def _rule_based_fallback(event: dict) -> dict:
    """
    Deterministic rule-based classification used when no LLM is configured.
    Inspects both free-text description and structured fields.
    """
    description = (event.get("description") or "").lower()
    event_type  = (event.get("event_type")  or "").lower()
    failed      = event.get("failed_attempts") or 0
    source_ip   = event.get("source_ip", "")
    location    = (event.get("location") or "").lower()

    # --- Brute-force / credential attack ---
    brute_keywords = [
        "failed login", "multiple failed", "brute force", "brute-force",
        "unusual login", "suspicious login", "credential", "password spray",
    ]
    is_login_event = event_type in ("login", "suspicious_login", "auth", "authentication")
    has_brute_signal = any(kw in description for kw in brute_keywords)
    has_many_failures = isinstance(failed, (int, float)) and failed >= 5
    from_unusual = any(kw in location for kw in ["unknown", "eastern europe", "china", "russia", "tor", "vpn"])

    if has_brute_signal or (is_login_event and has_many_failures):
        severity = "critical" if (failed >= 20 or (has_many_failures and from_unusual)) else "high"
        return {
            "threat_detected": True,
            "threat_type": "Brute Force / Credential Attack",
            "severity": severity,
            "confidence": 88 if has_many_failures else 75,
            "reason": (
                f"Login event with {failed or 'multiple'} failed attempts"
                + (f" from {source_ip}" if source_ip else "")
                + (f" ({event.get('location')})" if event.get("location") else "")
                + ". Pattern matches credential brute-force or stuffing attack."
            ),
        }

    # --- Malware / ransomware ---
    if any(kw in description for kw in ["malware", "ransomware", "virus", "trojan", "worm", "encrypt"]):
        return {
            "threat_detected": True,
            "threat_type": "Malware / Ransomware Activity",
            "severity": "critical",
            "confidence": 91,
            "reason": "Malware or ransomware indicators detected in the event.",
        }

    # --- Phishing ---
    if any(kw in description for kw in ["phishing", "spear phishing", "spearphish"]):
        return {
            "threat_detected": True,
            "threat_type": "Phishing Attempt",
            "severity": "medium",
            "confidence": 78,
            "reason": "Phishing indicators detected in the event.",
        }

    # --- Data exfiltration ---
    if any(kw in description for kw in ["exfil", "data transfer", "large upload", "unusual outbound"]):
        return {
            "threat_detected": True,
            "threat_type": "Potential Data Exfiltration",
            "severity": "high",
            "confidence": 72,
            "reason": "Abnormal outbound data transfer pattern detected.",
        }

    # --- Privilege escalation ---
    if any(kw in description for kw in ["privilege", "escalat", "admin access", "sudo", "root"]):
        return {
            "threat_detected": True,
            "threat_type": "Privilege Escalation Attempt",
            "severity": "high",
            "confidence": 70,
            "reason": "Privilege escalation indicators detected.",
        }

    # --- Generic suspicious login event ---
    if is_login_event:
        return {
            "threat_detected": True,
            "threat_type": "Suspicious Authentication Event",
            "severity": "medium",
            "confidence": 62,
            "reason": (
                f"Suspicious {event_type} event"
                + (f" from {source_ip}" if source_ip else "")
                + ". Insufficient data for precise classification; treat as medium priority."
            ),
        }

    # --- Generic fallback ---
    return {
        "threat_detected": True,
        "threat_type": "Suspicious Activity",
        "severity": "medium",
        "confidence": 55,
        "reason": "Unclassified event with suspicious characteristics. Manual review recommended.",
    }


def run(event: dict) -> dict:
    """Run threat detection on a security event."""
    user_prompt = (
        "Analyze this security event and return JSON:\n"
        + json.dumps(event, indent=2)
    )
    fallback = _rule_based_fallback(event)
    result = call_llm(SYSTEM_PROMPT, user_prompt, fallback)
    logger.info(f"Threat detection: {result.get('threat_type')} / {result.get('severity')} / conf={result.get('confidence')}")
    return result
