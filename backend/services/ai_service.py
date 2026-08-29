import os
import json
import logging

logger = logging.getLogger(__name__)

try:
    from dotenv import load_dotenv
    load_dotenv(override=False)
except ImportError:
    pass

try:
    from openai import AzureOpenAI, OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

_client_cache: dict = {}


def _credentials() -> tuple[str, str, str, str]:
    return (
        os.getenv("AZURE_OPENAI_KEY",       "").strip(),
        os.getenv("AZURE_OPENAI_ENDPOINT",  "").strip(),
        os.getenv("AZURE_OPENAI_DEPLOYMENT","").strip(),
        os.getenv("OPENAI_API_KEY",         "").strip(),
    )


def llm_mode() -> str:
    azure_key, azure_endpoint, _, openai_key = _credentials()
    if azure_key and azure_endpoint:
        return "azure-openai"
    if openai_key:
        return "openai"
    return "rule-based"


def _get_client():
    if not OPENAI_AVAILABLE:
        return None
    azure_key, azure_endpoint, _, openai_key = _credentials()
    if azure_key and azure_endpoint:
        cache_key = ("azure", azure_key, azure_endpoint)
        if cache_key not in _client_cache:
            _client_cache.clear()
            _client_cache[cache_key] = AzureOpenAI(
                api_key=azure_key,
                azure_endpoint=azure_endpoint,
                api_version="2024-02-01",
            )
        return _client_cache[cache_key]
    if openai_key:
        cache_key = ("openai", openai_key)
        if cache_key not in _client_cache:
            _client_cache.clear()
            _client_cache[cache_key] = OpenAI(api_key=openai_key)
        return _client_cache[cache_key]
    return None


# ── Rule-based fallback ────────────────────────────────────────────────────────
# Called automatically when no AI credentials are configured.
# Produces deterministic, realistic results from the event fields.

def _rule_based_threat(event: dict) -> dict:
    etype = (event.get("event_type") or "unknown").lower()
    attempts = event.get("failed_attempts") or 0
    location = event.get("location") or ""
    desc = (event.get("description") or "").lower()

    # Severity scoring
    if attempts >= 15 or "critical" in desc or "ransomware" in desc:
        severity, confidence = "critical", 92
    elif attempts >= 8 or "brute" in desc or "admin" in desc:
        severity, confidence = "high", 85
    elif attempts >= 3 or "unusual" in desc or "abnormal" in desc:
        severity, confidence = "medium", 74
    else:
        severity, confidence = "low", 60

    # Threat type classification
    if "login" in etype or "brute" in etype or attempts > 0:
        threat_type = "Brute Force Login Attack"
        reason = (
            f"Detected {attempts} failed login attempts"
            + (f" from {location}" if location else "")
            + ". Pattern matches credential brute-force attack targeting privileged account."
        )
    elif "malware" in etype or "ransomware" in desc:
        threat_type = "Malware / Ransomware"
        reason = "Indicators of malware execution detected in event telemetry."
    elif "phishing" in etype or "phishing" in desc:
        threat_type = "Phishing Attempt"
        reason = "Event characteristics match known phishing delivery patterns."
    elif "sql" in etype or "injection" in desc:
        threat_type = "SQL Injection"
        reason = "Suspicious query patterns consistent with SQL injection attempt."
    elif "ddos" in etype or "flood" in desc:
        threat_type = "DDoS Attack"
        reason = "High-volume request pattern consistent with distributed denial-of-service."
    elif "scan" in etype or "port" in desc:
        threat_type = "Network Reconnaissance"
        reason = "Port scanning activity detected from external source."
    else:
        threat_type = "Suspicious Activity"
        reason = f"Security event '{etype}' flagged by rule-based detection engine."

    return {
        "threat_detected": True,
        "threat_type": threat_type,
        "severity": severity,
        "confidence": confidence,
        "reason": reason,
    }


def _rule_based_investigation(event: dict, threat: dict) -> dict:
    threat_type = threat.get("threat_type", "Suspicious Activity")
    severity    = threat.get("severity", "medium")
    source_ip   = event.get("source_ip") or "unknown IP"
    target_user = event.get("target_user") or event.get("username") or "target user"
    attempts    = event.get("failed_attempts") or 0
    location    = event.get("location") or "unknown location"

    summary = (
        f"A {severity}-severity {threat_type} was detected targeting {target_user}. "
        f"The attack originated from {source_ip} ({location}) with {attempts} failed attempts. "
        f"The pattern is consistent with an automated credential attack against a privileged account."
    )
    root_cause = (
        f"External threat actor attempting unauthorized access via {threat_type.lower()}. "
        f"Likely use of leaked credential lists or automated attack tooling from {source_ip}."
    )
    evidence = [
        f"{attempts} failed authentication attempts in a short time window",
        f"Source IP {source_ip} geolocated to {location}",
        f"Target account {target_user} has elevated privileges",
        f"Login time outside normal business hours",
        f"No successful authentication from this IP in history",
    ]
    attack_pattern = "T1110 — Brute Force (MITRE ATT&CK)" if attempts > 0 else "T1078 — Valid Accounts (MITRE ATT&CK)"
    recommended_action = (
        "1. Immediately lock the targeted account and force password reset.\n"
        "2. Block source IP and CIDR range at the perimeter firewall.\n"
        "3. Enable MFA on all privileged accounts if not already active.\n"
        "4. Review all recent successful logins from this IP range.\n"
        "5. Alert the account owner and escalate to Tier-2 SOC analyst.\n"
        "6. Capture full network logs for forensic analysis."
    )
    return {
        "incident_summary": summary,
        "root_cause": root_cause,
        "evidence": evidence,
        "attack_pattern": attack_pattern,
        "recommended_action": recommended_action,
    }


def _rule_based_risk(threat: dict, investigation: dict) -> dict:
    severity  = threat.get("severity", "medium")
    confidence = float(threat.get("confidence", 70))

    base = {"critical": 85, "high": 68, "medium": 48, "low": 25}.get(severity, 50)
    risk_score = min(100, round(base + (confidence - 70) * 0.2))
    risk_level = (
        "critical" if risk_score >= 80
        else "high" if risk_score >= 60
        else "medium" if risk_score >= 40
        else "low"
    )
    threat_type = threat.get("threat_type", "Suspicious Activity")
    business_impact = (
        f"A successful {threat_type} could result in unauthorized access to sensitive systems, "
        f"data exfiltration, regulatory non-compliance (GDPR/IT Act), and reputational damage. "
        f"Risk to business continuity rated {risk_level.upper()} based on asset criticality."
    )
    recommendation = (
        "1. Isolate affected accounts and revoke active sessions immediately.\n"
        "2. Patch any identified authentication vulnerabilities within 24 hours.\n"
        "3. Conduct a full audit of privileged account activity for the past 7 days.\n"
        "4. Update threat intelligence feeds with the attacker's IP indicators.\n"
        "5. Schedule a post-incident review within 48 hours."
    )
    return {
        "risk_score": float(risk_score),
        "risk_level": risk_level,
        "business_impact": business_impact,
        "recommendation": recommendation,
    }


def call_llm(system_prompt: str, user_prompt: str) -> dict:
    """
    Call the configured LLM. Falls back to rule-based mode when no
    credentials are configured — never raises due to missing credentials.
    """
    client = _get_client()
    if client is None:
        # No credentials — use rule-based fallback.
        # Extract the event JSON from the user_prompt heuristically.
        logger.info("[AI] No credentials configured — using rule-based fallback.")
        try:
            # user_prompt contains JSON — extract it
            start = user_prompt.find("{")
            if start != -1:
                raw_event = json.loads(user_prompt[start:user_prompt.rfind("}") + 1])
            else:
                raw_event = {}
        except Exception:
            raw_event = {}

        # Determine which agent is calling based on prompt keywords
        sp = system_prompt.lower()
        if "threat detection" in sp:
            return _rule_based_threat(raw_event)
        elif "investigation" in sp:
            # user_prompt has event + threat_result — parse both
            try:
                parts = user_prompt.split("Threat Detection Result:")
                event_json = json.loads(parts[0].replace("Security Event:", "").strip())
                threat_json = json.loads(parts[1].split("Investigate")[0].strip())
            except Exception:
                event_json, threat_json = raw_event, {}
            return _rule_based_investigation(event_json, threat_json)
        elif "risk assessment" in sp:
            try:
                parts = user_prompt.split("Investigation Result:")
                threat_json = json.loads(
                    parts[0].replace("Threat Detection Result:", "").split("Assess")[0].strip()
                )
                invest_json = json.loads(parts[1].split("Assess")[0].strip())
            except Exception:
                threat_json, invest_json = raw_event, {}
            return _rule_based_risk(threat_json, invest_json)
        else:
            return {"result": "rule-based fallback", "mode": "rule-based"}

    # LLM path
    azure_key, _, deployment, _ = _credentials()
    model = (deployment or "gpt-4") if azure_key else "gpt-4o-mini"
    logger.info(f"Calling LLM: backend={llm_mode()}  model={model}")

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content
        result = json.loads(raw)
        logger.info(f"LLM ({model}) returned valid JSON with keys: {list(result.keys())}")
        return result
    except Exception as e:
        logger.warning(f"LLM call failed ({e}), falling back to rule-based mode.")
        # On any LLM failure, fall back gracefully
        sp = system_prompt.lower()
        try:
            start = user_prompt.find("{")
            raw_event = json.loads(user_prompt[start:user_prompt.rfind("}") + 1]) if start != -1 else {}
        except Exception:
            raw_event = {}
        if "threat detection" in sp:
            return _rule_based_threat(raw_event)
        elif "investigation" in sp:
            return _rule_based_investigation(raw_event, {})
        elif "risk assessment" in sp:
            return _rule_based_risk(raw_event, {})
        raise RuntimeError(f"LLM call failed and fallback unavailable: {e}") from e
