from collections.abc import Iterable


def deduplicate_findings(findings: Iterable[dict]) -> list[dict]:
    seen: set[tuple[str, str, str, str, str]] = set()
    output: list[dict] = []
    for finding in findings:
        key = (
            finding.get("title", "").strip().lower(),
            (finding.get("endpoint") or "").strip().lower(),
            finding.get("tool_source", "").strip().lower(),
            finding.get("severity", "").strip().lower(),
            (finding.get("parameter") or "").strip().lower(),  # prevent collapsing same vuln on different params
        )
        if key in seen:
            continue
        seen.add(key)
        output.append(finding)
    return output

