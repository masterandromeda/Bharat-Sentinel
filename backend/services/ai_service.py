import os
import json
import logging

logger = logging.getLogger(__name__)

# Load .env file if present — must happen before any credential reads.
# python-dotenv is already in requirements.txt.
try:
    from dotenv import load_dotenv
    load_dotenv(override=False)  # don't override real env vars already set
except ImportError:
    pass  # python-dotenv not installed; rely on real environment variables

try:
    from openai import AzureOpenAI, OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# Module-level client cache keyed by credential tuple.
# Rebuilt automatically whenever credentials change.
_client_cache: dict = {}


def _credentials() -> tuple[str, str, str, str]:
    """Read all AI credentials fresh from the environment each call."""
    return (
        os.getenv("AZURE_OPENAI_KEY",      "").strip(),
        os.getenv("AZURE_OPENAI_ENDPOINT", "").strip(),
        os.getenv("AZURE_OPENAI_DEPLOYMENT","").strip(),
        os.getenv("OPENAI_API_KEY",        "").strip(),
    )


def llm_mode() -> str:
    """Return a human-readable label for the current AI backend."""
    azure_key, azure_endpoint, _, openai_key = _credentials()
    if azure_key and azure_endpoint:
        return "azure-openai"
    if openai_key:
        return "openai"
    return "rule-based"


def _get_client():
    """
    Build and cache an OpenAI SDK client for the configured provider.
    Returns None when no credentials are available.
    """
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


def call_llm(system_prompt: str, user_prompt: str) -> dict:
    """
    Call the configured LLM (Azure OpenAI or OpenAI) and return parsed JSON.

    Raises RuntimeError when:
    - No credentials are configured
    - The SDK is not installed
    - The API call fails
    - The response is not valid JSON

    Callers are responsible for handling the error.
    """
    if not OPENAI_AVAILABLE:
        raise RuntimeError(
            "openai SDK is not installed. Run: pip install openai"
        )

    client = _get_client()
    if client is None:
        raise RuntimeError(
            "Azure OpenAI credentials not configured. "
            "Set AZURE_OPENAI_KEY and AZURE_OPENAI_ENDPOINT environment variables "
            "(or OPENAI_API_KEY for OpenAI)."
        )

    azure_key, _, deployment, _ = _credentials()
    model = (deployment or "gpt-4") if azure_key else "gpt-4o-mini"

    logger.info(f"Calling LLM: backend={llm_mode()}  model={model}")

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
    try:
        result = json.loads(raw)
    except json.JSONDecodeError as e:
        raise RuntimeError(
            f"LLM returned non-JSON content. JSONDecodeError: {e}\nRaw response: {raw[:300]}"
        ) from e

    logger.info(f"LLM ({model}) returned valid JSON with keys: {list(result.keys())}")
    return result
