from app.services.dedup import deduplicate_findings


def test_deduplicate_findings_removes_duplicates() -> None:
    findings = [
        {"title": "Missing HSTS header", "endpoint": "https://a", "tool_source": "header-check", "severity": "medium"},
        {"title": "Missing HSTS header", "endpoint": "https://a", "tool_source": "header-check", "severity": "medium"},
        {"title": "Missing CSP header", "endpoint": "https://a", "tool_source": "header-check", "severity": "medium"},
    ]
    deduped = deduplicate_findings(findings)
    assert len(deduped) == 2

