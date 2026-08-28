import os
import json
import logging

logger = logging.getLogger(__name__)

try:
    from openai import AzureOpenAI, OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# Module-level client cache — keyed by the credential values in use.
# Rebuilt automatically if environment variables change between requests.
_client_cache: dict = {}


def _get_client():
    """
    Return a configured OpenAI/AzureOpenAI client, or None if no credentials
    are set. Reads environment variables fresh on every call so that a .env
    file loaded after startup is respected.
    """
    if not OPENAI_AVAILABLE:
        return None

    azure_key      = os.getenv("AZURE_OPENAI_KEY", "").strip()
    azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "").strip()
    openai_key     = os.getenv("OPENAI_API_KEY", "").strip()

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


def llm_mode() -> str:
    """Return a human-readable description of the current AI backend."""
    azure_key  = os.getenv("AZURE_OPENAI_KEY", "").strip()
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    if azure_key:
        return "azure-openai"
    if openai_key:
        return "openai"
    return "rule-based"


def call_llm(system_prompt: str, user_prompt: str, fallback: dict) -> dict:
    """
    Call the configured LLM and parse JSON response.
    Returns fallback (rule-based result) if no LLM is configured.
    Never raises — always returns a valid dict.
    """
    client = _get_client()
    if client is None:
        logger.info("No LLM credentials configured — using rule-based analysis.")
        return fallback

    azure_key    = os.getenv("AZURE_OPENAI_KEY", "").strip()
    deployment   = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4").strip() or "gpt-4"
    model        = deployment if azure_key else "gpt-4o-mini"

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
        content = response.choices[0].message.content
        result = json.loads(content)
        logger.info(f"LLM ({model}) returned valid JSON.")
        return result
    except json.JSONDecodeError as e:
        logger.warning(f"LLM returned non-JSON response: {e}. Using rule-based fallback.")
        return fallback
    except Exception as e:
        logger.warning(f"LLM call failed ({type(e).__name__}: {e}). Using rule-based fallback.")
        return fallback
