import os
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Try to import OpenAI; fall back gracefully
try:
    from openai import AzureOpenAI, OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY", "")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

_client = None


def get_client():
    global _client
    if _client:
        return _client
    if not OPENAI_AVAILABLE:
        return None
    if AZURE_OPENAI_KEY and AZURE_OPENAI_ENDPOINT:
        _client = AzureOpenAI(
            api_key=AZURE_OPENAI_KEY,
            azure_endpoint=AZURE_OPENAI_ENDPOINT,
            api_version="2024-02-01",
        )
    elif OPENAI_API_KEY:
        _client = OpenAI(api_key=OPENAI_API_KEY)
    return _client


def call_llm(system_prompt: str, user_prompt: str, fallback: dict) -> dict:
    """Call LLM and parse JSON response; return fallback if unavailable."""
    client = get_client()
    if not client:
        logger.info("No LLM client configured — using rule-based fallback.")
        return fallback

    model = AZURE_OPENAI_DEPLOYMENT if (AZURE_OPENAI_KEY and AZURE_OPENAI_ENDPOINT) else "gpt-4o-mini"
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        logger.warning(f"LLM call failed: {e} — using fallback.")
        return fallback
