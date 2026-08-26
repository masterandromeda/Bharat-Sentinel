import json
import logging
from backend.services.ai_service import call_llm

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a cybersecurity Threat Detection Agent.
Analyze security events and return a JSON object with exactly these fields:
{
  "threat_detected": true or false,
  "threat_type": "string describing the threat type",
  "severity": "low" or "medium" or "high" or "critical",
  "confidence": number between 0 and 100,
  "reason": "brief explanation"
}
Be precise and conservative. Only mark as critical if truly severe."""


def _rule_based_fallback(event: dict) -> dict:
    """Simple rule-based detection when LLM is unavailable."""
    description = (event.get("description") or "").lower()
    event_type = (event.get("event_type") or "").lower()

    # Detect brute-force / suspicious login
    if any(kw in description for kw in ["failed login", "multiple failed", "brute force", "unusual login", "suspicious login"]):
        return {
            "threat_detected": True,
            "threat_type": "Brute Force / Credential Attack",
            "severity": "high",
            "confidence": 82,
            "reason": "Multiple failed login attempts detected from unusual location/time, indicating a potential brute-force or credential stuffing attack.",
        }
    if any(kw in description for kw in ["malware", "ransomware", "virus"]):
        return {
            "threat_detected": True,
            "threat_type": "Malware Activity",
            "severity": "critical",
            "confidence": 90,
            "reason": "Malware-related activity detected in event description.",
        }
    if any(kw in description for kw in ["phishing", "spear phishing"]):
        return {
            "threat_detected": True,
            "threat_type": "Phishing Attempt",
            "severity": "medium",
            "confidence": 75,
            "reason": "Phishing indicators found in the event.",
        }
    return {
        "threat_detected": True,
        "threat_type": "Suspicious Activity",
        "severity": "medium",
        "confidence": 60,
        "reason": "Unclassified suspicious event detected.",
    }


def run(event: dict) -> dict:
    """Run threat detection on a security event."""
    user_prompt = f"Analyze this security event and return JSON:\n{json.dumps(event, indent=2)}"
    fallback = _rule_based_fallback(event)
    result = call_llm(SYSTEM_PROMPT, user_prompt, fallback)
    logger.info(f"Threat detection result: {result}")
    return result
