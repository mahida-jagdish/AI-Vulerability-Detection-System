import json
import time
from typing import Any

import requests

from app.config import get_settings
from app.services.taxonomy import default_verification_steps, infer_owasp_category
from app.services.poc import generate_poc_steps


def _fallback_enrich(finding: dict[str, Any]) -> dict[str, Any]:
    title = finding.get("title", "").lower()
    if "tls" in title or "https" in title:
        finding["cwe_id"] = finding.get("cwe_id") or "CWE-319"
        finding["cvss_score"] = finding.get("cvss_score") or 7.4
        finding["cvss_vector"] = finding.get("cvss_vector") or "AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N"
        finding["remediation"] = finding.get("remediation") or "Enforce HTTPS for all pages and enable HSTS."
    elif "content-security-policy" in title:
        finding["cwe_id"] = finding.get("cwe_id") or "CWE-693"
        finding["remediation"] = finding.get("remediation") or "Add a strict Content-Security-Policy tuned to your asset sources."
    elif "x-frame-options" in title:
        finding["cwe_id"] = finding.get("cwe_id") or "CWE-1021"
        finding["remediation"] = finding.get("remediation") or "Set X-Frame-Options to DENY or SAMEORIGIN."
    else:
        finding["remediation"] = finding.get("remediation") or "Apply secure-by-default configuration and validate with a retest."
    finding["owasp_category"] = finding.get("owasp_category") or infer_owasp_category(
        title=finding.get("title"),
        description=finding.get("description"),
        cwe_id=finding.get("cwe_id"),
        tool_source=finding.get("tool_source"),
    )
    finding["verification_steps"] = finding.get("verification_steps") or default_verification_steps(finding)
    # Always generate PoC if not already set
    finding["poc_steps"] = finding.get("poc_steps") or generate_poc_steps(finding)
    return finding


def _call_with_retry(fn, retries: int = 2, delay: float = 3.0):
    """Call fn() up to retries+1 times, sleeping delay seconds between attempts."""
    last_exc: Exception | None = None
    for attempt in range(retries + 1):
        try:
            return fn()
        except (requests.Timeout, requests.ConnectionError) as exc:
            last_exc = exc
            if attempt < retries:
                time.sleep(delay)
    raise last_exc  # type: ignore[misc]


def _call_ollama(prompt: str, model: str, base_url: str) -> str:
    def _do():
        response = requests.post(
            f"{base_url}/api/generate",
            json={"model": model, "prompt": prompt, "stream": False, "format": "json"},
            timeout=90,
        )
        response.raise_for_status()
        return response.json().get("response", "[]")
    return _call_with_retry(_do)


def _call_openrouter(prompt: str, model: str, api_key: str) -> str:
    def _do():
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://exploitronai.local",
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
            },
            timeout=90,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    return _call_with_retry(_do)


def _call_openai(prompt: str, model: str, api_key: str) -> str:
    def _do():
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
            },
            timeout=90,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    return _call_with_retry(_do)


def enrich_findings_with_ollama(
    findings: list[dict[str, Any]], 
    ai_config: dict | None = None,
    ai_instructions: str | None = None
) -> list[dict[str, Any]]:
    if not findings:
        return findings

    # Resolve AI config
    if ai_config is None:
        settings = get_settings()
        provider = "ollama"
        api_key = ""
        model = settings.ollama_model
        ollama_url = settings.ollama_base_url
    else:
        provider = ai_config.get("ai_provider", "ollama")
        api_key = ai_config.get("ai_api_key", "")
        model = ai_config.get("ai_model", "llama3.1:8b")
        settings = get_settings()
        ollama_url = settings.ollama_base_url

    # Truncate per-finding large fields before serializing to preserve all finding entries
    _FIELD_LIMIT = 400
    slim_findings = [
        {
            **{k: v for k, v in f.items() if k not in ("evidence", "raw_reference", "poc_steps", "verification_steps")},
            "evidence": (f.get("evidence") or "")[:_FIELD_LIMIT],
        }
        for f in findings
    ]

    prompt = (
        "You are a web security report assistant and expert bug-bounty hunter. "
        "For each finding in the JSON array, return a JSON array with same length and keys: "
        "index, remediation, cwe_id, cvss_score, cvss_vector, owasp_category, verification_steps, poc_steps. "
        "poc_steps must be detailed step-by-step reproduction instructions written like a professional bug-bounty hunter "
        "(include exact curl commands, payloads, expected outputs, and impact). "
    )

    if ai_instructions:
        prompt += (
            f"\n\nCRITICAL USER DIRECTIVES FOR THIS SCAN: {ai_instructions}\n"
            "You MUST heavily prioritize and align your analysis, severity scoring, and PoC generation around these constraints.\n"
        )

    prompt += (
        "Keep all values concise and technically accurate.\n\n"
        f"Findings:\n{json.dumps(slim_findings, ensure_ascii=True)}"
    )

    try:
        if provider == "ollama":
            model_payload = _call_ollama(prompt, model, ollama_url)
        elif provider == "openrouter":
            if not api_key:
                raise ValueError("OpenRouter API key not configured")
            model_payload = _call_openrouter(prompt, model, api_key)
        elif provider == "openai":
            if not api_key:
                raise ValueError("OpenAI API key not configured")
            model_payload = _call_openai(prompt, model, api_key)
        else:
            raise ValueError(f"Unknown AI provider: {provider}")

        parsed = json.loads(model_payload)
        if isinstance(parsed, dict):
            parsed = parsed.get("items", [])
        if not isinstance(parsed, list):
            raise ValueError("Invalid AI response format")

        for item in parsed:
            if not isinstance(item, dict):
                continue
            idx = item.get("index")
            if not isinstance(idx, int) or idx < 0 or idx >= len(findings):
                continue
            findings[idx]["remediation"] = item.get("remediation") or findings[idx].get("remediation")
            findings[idx]["cwe_id"] = item.get("cwe_id") or findings[idx].get("cwe_id")
            findings[idx]["cvss_score"] = item.get("cvss_score") or findings[idx].get("cvss_score")
            findings[idx]["cvss_vector"] = item.get("cvss_vector") or findings[idx].get("cvss_vector")
            findings[idx]["owasp_category"] = item.get("owasp_category") or findings[idx].get("owasp_category")
            findings[idx]["verification_steps"] = item.get("verification_steps") or findings[idx].get("verification_steps")
            findings[idx]["poc_steps"] = item.get("poc_steps") or findings[idx].get("poc_steps")
    except Exception:  # noqa: BLE001
        pass

    # Always run fallback enrichment to fill any missing fields (including poc_steps)
    return [_fallback_enrich(f.copy()) for f in findings]
