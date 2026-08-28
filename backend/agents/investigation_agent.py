import json
import logging
from backend.services.ai_service import call_llm

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a cybersecurity Investigation Agent.
Given a security event and threat detection result, investigate and return a JSON object with EXACTLY these fields:
{
  "incident_summary": "clear 2-3 sentence summary of what happened",
  "root_cause": "most likely root cause with supporting reasoning",
  "evidence": ["specific evidence item 1", "specific evidence item 2"],
  "attack_pattern": "MITRE ATT&CK technique name and ID if applicable",
  "recommended_action": "numbered list of specific remediation steps"
}
Rules:
- Use ALL structured fields (source_ip, failed_attempts, location, target_user) as concrete evidence.
- Reference specific values from the event (IP addresses, usernames, counts) in your response.
- The recommended_action must be a numbered list of actionable steps.
- Return ONLY the JSON object, no markdown, no explanation outside the JSON."""


def run(event: dict, threat_result: dict) -> dict:
    """
    Run investigation via Azure OpenAI.
    Raises RuntimeError if credentials are not configured or the call fails.
    """
    user_prompt = (
        "Security Event:\n" + json.dumps(event, indent=2)
        + "\n\nThreat Detection Result:\n" + json.dumps(threat_result, indent=2)
        + "\n\nInvestigate and return the JSON assessment."
    )
    result = call_llm(SYSTEM_PROMPT, user_prompt)
    logger.info(
        f"[InvestigationAgent] summary_len={len(result.get('incident_summary', ''))}  "
        f"evidence_count={len(result.get('evidence', []))}"
    )
    return result
