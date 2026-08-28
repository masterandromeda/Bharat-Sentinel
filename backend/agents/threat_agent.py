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
- Use ALL structured fields (source_ip, failed_attempts, location, event_type, target_user) in your analysis.
- Only mark as critical if there is strong evidence of active compromise.
- Be specific: name the attack pattern (brute-force, credential stuffing, phishing, lateral movement, etc.).
- confidence reflects how certain you are given the available evidence.
- Return ONLY the JSON object, no markdown, no explanation outside the JSON."""


def run(event: dict) -> dict:
    """
    Run threat detection via Azure OpenAI.
    Raises RuntimeError if credentials are not configured or the call fails.
    """
    user_prompt = (
        "Analyze this security event and return the JSON assessment:\n"
        + json.dumps(event, indent=2)
    )
    result = call_llm(SYSTEM_PROMPT, user_prompt)
    logger.info(
        f"[ThreatAgent] type={result.get('threat_type')}  "
        f"severity={result.get('severity')}  conf={result.get('confidence')}"
    )
    return result
