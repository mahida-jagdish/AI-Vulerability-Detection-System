from typing import Any

OWASP_TOP_10_2021 = {
    "A01": "Broken Access Control",
    "A02": "Cryptographic Failures",
    "A03": "Injection",
    "A04": "Insecure Design",
    "A05": "Security Misconfiguration",
    "A06": "Vulnerable and Outdated Components",
    "A07": "Identification and Authentication Failures",
    "A08": "Software and Data Integrity Failures",
    "A09": "Security Logging and Monitoring Failures",
    "A10": "Server-Side Request Forgery",
}

_CWE_TO_OWASP = {
    "CWE-79": "A03",
    "CWE-89": "A03",
    "CWE-78": "A03",
    "CWE-22": "A01",
    "CWE-862": "A01",
    "CWE-284": "A01",
    "CWE-319": "A02",
    "CWE-326": "A02",
    "CWE-327": "A02",
    "CWE-693": "A05",
    "CWE-16": "A05",
    "CWE-1104": "A06",
    "CWE-798": "A07",
    "CWE-287": "A07",
    "CWE-829": "A08",
    "CWE-918": "A10",
}

_KEYWORD_TO_OWASP = [
    ("xss", "A03"),
    ("sql injection", "A03"),
    ("command injection", "A03"),
    ("directory traversal", "A01"),
    ("authorization", "A01"),
    ("access control", "A01"),
    ("https", "A02"),
    ("tls", "A02"),
    ("cipher", "A02"),
    ("header", "A05"),
    ("misconfiguration", "A05"),
    ("server banner", "A05"),
    ("outdated", "A06"),
    ("version disclosure", "A06"),
    ("login", "A07"),
    ("authentication", "A07"),
    ("integrity", "A08"),
    ("logging", "A09"),
    ("monitoring", "A09"),
    ("ssrf", "A10"),
    ("ffuf", "A05"),
    ("hidden path", "A01"),
    ("hakrawler", "A05"),
    ("trufflehog", "A07"),
    ("wpscan", "A06"),
    ("wordpress", "A06"),
]

def infer_owasp_category(
    *,
    title: str | None = None,
    description: str | None = None,
    cwe_id: str | None = None,
    tool_source: str | None = None,
) -> str:
    if cwe_id:
        mapped = _CWE_TO_OWASP.get(cwe_id.upper())
        if mapped:
            return f"{mapped}: {OWASP_TOP_10_2021[mapped]}"

    text = " ".join(filter(None, [title or "", description or "", tool_source or ""])).lower()
    for keyword, owasp_id in _KEYWORD_TO_OWASP:
        if keyword in text:
            return f"{owasp_id}: {OWASP_TOP_10_2021[owasp_id]}"

    return "A05: Security Misconfiguration"


def default_verification_steps(finding: dict[str, Any]) -> str:
    endpoint = finding.get("endpoint") or finding.get("target") or "target endpoint"
    tool = finding.get("tool_source") or "scanner"
    title = finding.get("title") or "finding"
    return (
        f"1. Run the same {tool} check against {endpoint}. "
        f"2. Confirm `{title}` appears in tool output and response evidence. "
        "3. Apply remediation and re-run the same check to verify risk reduction."
    )

