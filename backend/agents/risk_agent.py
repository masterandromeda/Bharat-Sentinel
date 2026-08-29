import json
import logging
from backend.services.ai_service import call_llm, _rule_based_risk

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a cybersecurity Risk Assessment Agent.
Given threat detection and investigation results, assess the risk and return a JSON object with EXACTLY these fields:
{
  "risk_score": number between 0 and 100,
  "risk_level": "low" or "medium" or "high" or "critical",
  "business_impact": "2-3 sentence description of potential business impact specific to this threat",
  "recommendation": "clear numbered recommendation for the security team"
}
Rules:
- risk_score must reflect the severity, confidence, and business context from the inputs.
- business_impact must be specific to the threat type and affected asset, not generic.
- recommendation must be actionable and numbered.
- Return ONLY the JSON object, no markdown, no explanation outside the JSON."""


def run(threat_result: dict, investigation_result: dict) -> dict:
    user_prompt = (
        "Threat Detection Result:\n" + json.dumps(threat_result, indent=2)
        + "\n\nInvestigation Result:\n" + json.dumps(investigation_result, indent=2)
        + "\n\nAssess the risk and return the JSON assessment."
    )
    result = call_llm(SYSTEM_PROMPT, user_prompt)
    # Ensure required fields — fallback if LLM/parsing produced empty/zero result
    if not result.get("risk_score") and result.get("risk_score") != 0:
        result = _rule_based_risk(threat_result, investigation_result)
    elif result.get("risk_score") == 0:
        # A zero score from fallback JSON parsing issue — recalculate
        recalc = _rule_based_risk(threat_result, investigation_result)
        if not result.get("risk_level") or not result.get("business_impact"):
            result = recalc
        else:
            result["risk_score"] = recalc["risk_score"]
    logger.info(
        f"[RiskAgent] score={result.get('risk_score')}  level={result.get('risk_level')}"
    )
    return result
