import json

import re

import shlex

import shutil

import socket

import ssl

import subprocess

import time

from datetime import datetime, timezone

from typing import Any, Callable

from urllib.parse import urlparse



import requests



from app.services.taxonomy import default_verification_steps, infer_owasp_category



EventLogger = Callable[[str, str, str | None, int | None], None]

ANSI_RE = re.compile(r"\x1B\[[0-?]*[ -/]*[@-~]")





def _snippet(value: str, limit: int = 1400) -> str:

    value = (value or "").strip()

    if len(value) <= limit:

        return value

    return f"{value[:limit]} ...[truncated]"





def _finding(

    *,

    title: str,

    description: str,

    severity: str,

    target: str,

    endpoint: str | None,

    tool_source: str,

    evidence: str = "",

    raw_reference: str = "",

    confidence: str = "medium",

    parameter: str | None = None,

    cwe_id: str | None = None,

    cvss_score: float | None = None,

    cvss_vector: str | None = None,

    remediation: str | None = None,

    verification_steps: str | None = None,

    references: str | None = None,

) -> dict[str, Any]:

    base = {

        "title": title,

        "description": description,

        "severity": severity.lower(),

        "confidence": confidence,

        "target": target,

        "endpoint": endpoint or target,

        "parameter": parameter,

        "evidence": _snippet(evidence, 1800),

        "tool_source": tool_source,

        "raw_reference": _snippet(raw_reference, 2000),

        "cwe_id": cwe_id,

        "cvss_score": cvss_score,

        "cvss_vector": cvss_vector,

        "owasp_category": infer_owasp_category(

            title=title,

            description=description,

            cwe_id=cwe_id,

            tool_source=tool_source,

        ),

        "remediation": remediation,

        "verification_steps": verification_steps,

        "references": references or "",

    }

    base["verification_steps"] = base["verification_steps"] or default_verification_steps(base)

    return base





def _run_command_stream(

    command: list[str],

    event_log: EventLogger,

    tool: str,

    timeout: int = 120,

) -> tuple[int, str]:

    command_text = " ".join(shlex.quote(part) for part in command)

    event_log("command_start", command_text, tool, None)

    started = time.monotonic()

    lines: list[str] = []

    process = subprocess.Popen(  # noqa: S603

        command,

        stdout=subprocess.PIPE,

        stderr=subprocess.STDOUT,

        stdin=subprocess.DEVNULL,  # prevent interactive prompts from hanging

        text=True,

        bufsize=1,

    )



    try:

        while True:

            if process.stdout is None:

                break

            line = process.stdout.readline()

            if line:

                clean = ANSI_RE.sub("", line.rstrip("\n"))

                clean = _snippet(clean, 600)

                lines.append(clean)

                if clean:

                    event_log("command_output", clean, tool, None)

            elif process.poll() is not None:

                break

            else:

                if (time.monotonic() - started) > timeout:

                    process.kill()

                    event_log("command_end", f"exit=124 timeout={timeout}s", tool, None)

                    return 124, "\n".join(lines)

                time.sleep(0.15)

        code = process.wait(timeout=5)

    except subprocess.TimeoutExpired:

        process.kill()

        event_log("command_end", f"exit=124 timeout={timeout}s", tool, None)

        return 124, "\n".join(lines)



    elapsed = time.monotonic() - started

    event_log("command_end", f"exit={code} duration={elapsed:.1f}s", tool, None)

    return code, "\n".join(lines)





def _header_findings(target_url: str, event_log: EventLogger | None = None) -> list[dict[str, Any]]:

    findings: list[dict[str, Any]] = []

    try:

        response = requests.get(target_url, timeout=20, allow_redirects=True)

    except requests.exceptions.RequestException as exc:

        if event_log:

            event_log("scan", f"Header check skipped â€” target unreachable: {exc}", "header-check", None)

        return findings

    headers = {k.lower(): v for k, v in response.headers.items()}

    req_path = urlparse(response.request.url).path or "/"

    req_line = f"GET {req_path} HTTP/1.1"

    response_excerpt = "\n".join([f"{k}: {v}" for k, v in list(response.headers.items())[:20]])

    evidence = f"Request:\n{req_line}\nHost: {urlparse(response.url).hostname}\n\nResponse:\nHTTP {response.status_code}\n{response_excerpt}"



    required = {

        "strict-transport-security": (

            "Missing HSTS header",

            "medium",

            "CWE-319",

            "Set Strict-Transport-Security on HTTPS responses with an appropriate max-age and includeSubDomains.",

        ),

        "content-security-policy": (

            "Missing Content-Security-Policy header",

            "medium",

            "CWE-693",

            "Define a restrictive Content-Security-Policy with explicit trusted source lists.",

        ),

        "x-content-type-options": (

            "Missing X-Content-Type-Options header",

            "low",

            "CWE-16",

            "Add X-Content-Type-Options: nosniff to prevent MIME sniffing.",

        ),

        "x-frame-options": (

            "Missing X-Frame-Options header",

            "low",

            "CWE-1021",

            "Add X-Frame-Options: DENY or SAMEORIGIN to reduce clickjacking risk.",

        ),

        "referrer-policy": (

            "Missing Referrer-Policy header",

            "info",

            "CWE-200",

            "Set a strict Referrer-Policy such as strict-origin-when-cross-origin.",

        ),

    }

    for header, (title, sev, cwe, remediation) in required.items():

        if header not in headers:

            findings.append(

                _finding(

                    title=title,

                    description=f"The response did not include `{header}`.",

                    severity=sev,

                    target=target_url,

                    endpoint=response.url,

                    tool_source="header-check",

                    evidence=evidence,

                    cwe_id=cwe,

                    remediation=remediation,

                    references="https://owasp.org/www-project-secure-headers/",

                )

            )



    if headers.get("server"):

        findings.append(

            _finding(

                title="Server banner disclosed",

                description="Server header reveals infrastructure details that may aid targeted attacks.",

                severity="info",

                target=target_url,

                endpoint=response.url,

                tool_source="header-check",

                evidence=f"Server: {headers.get('server')}",

                cwe_id="CWE-200",

                remediation="Reduce banner disclosure at the reverse proxy or application server.",

            )

        )



    set_cookie = headers.get("set-cookie", "")

    if set_cookie and ("httponly" not in set_cookie.lower() or "secure" not in set_cookie.lower()):

        findings.append(

            _finding(

                title="Cookie flags missing on session cookie",

                description="Session cookies should include Secure and HttpOnly attributes.",

                severity="medium",

                target=target_url,

                endpoint=response.url,

                tool_source="header-check",

                evidence=f"Set-Cookie: {_snippet(set_cookie, 800)}",

                cwe_id="CWE-614",

                remediation="Set Secure, HttpOnly, and SameSite attributes for authentication/session cookies.",

            )

        )



    return findings





def _discovery_probe(target_url: str) -> list[dict[str, Any]]:

    findings: list[dict[str, Any]] = []

    for suffix in ("/robots.txt", "/sitemap.xml"):

        candidate = target_url.rstrip("/") + suffix

        try:

            response = requests.get(candidate, timeout=10, allow_redirects=True)

        except requests.RequestException:

            continue

        if response.status_code == 200:

            findings.append(

                _finding(

                    title=f"Public index file available: {suffix}",

                    description="Public index resources may reveal sensitive paths and application structure.",

                    severity="low",

                    target=target_url,

                    endpoint=response.url,

                    tool_source="discovery",

                    evidence=f"HTTP {response.status_code}\n{_snippet(response.text, 500)}",

                    cwe_id="CWE-200",

                    remediation="Review exposed indexing files and remove sensitive path details.",

                )

            )



    return findings





def _tls_findings(target_url: str) -> list[dict[str, Any]]:

    findings: list[dict[str, Any]] = []

    parsed = urlparse(target_url)

    if parsed.scheme != "https" or not parsed.hostname:

        findings.append(

            _finding(

                title="Website does not enforce HTTPS",

                description="The scan target uses HTTP which can expose confidentiality/integrity to interception.",

                severity="high",

                target=target_url,

                endpoint=target_url,

                tool_source="tls-check",

                cwe_id="CWE-319",

                cvss_score=7.4,

                cvss_vector="AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",

                remediation="Redirect all traffic to HTTPS and enable HSTS.",

            )

        )

        return findings



    context = ssl.create_default_context()

    cert: dict[str, Any] = {}

    cipher_name = ""

    try:

        with socket.create_connection((parsed.hostname, parsed.port or 443), timeout=10) as tcp_sock:

            with context.wrap_socket(tcp_sock, server_hostname=parsed.hostname) as tls_sock:

                cert = tls_sock.getpeercert()

                cipher = tls_sock.cipher()

                if cipher:

                    cipher_name = cipher[0]

    except (OSError, ssl.SSLError, socket.timeout) as exc:

        findings.append(

            _finding(

                title="TLS connection failed",

                description=f"Could not establish a TLS connection to verify certificate/cipher: {exc}",

                severity="medium",

                target=target_url,

                endpoint=target_url,

                tool_source="tls-check",

                cwe_id="CWE-297",

                remediation="Ensure the server has a valid, trusted TLS certificate installed and is reachable on port 443.",

            )

        )

        return findings

    not_after = cert.get("notAfter")

    if not_after:

        expires = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)

        days_remaining = (expires - datetime.now(timezone.utc)).days

        if days_remaining <= 21:

            findings.append(

                _finding(

                    title="TLS certificate nearing expiration",

                    description="Certificate expiration in the near term can cause availability and trust failures.",

                    severity="medium",

                    target=target_url,

                    endpoint=target_url,

                    tool_source="tls-check",

                    evidence=f"Certificate expires in {days_remaining} days.",

                    cwe_id="CWE-327",

                    remediation="Rotate the certificate before expiration and automate certificate renewal checks.",

                )

            )

    if any(weak in cipher_name.upper() for weak in ("RC4", "3DES", "DES")):

        findings.append(

            _finding(

                title="Weak TLS cipher suite negotiated",

                description="Weak ciphers reduce transport-layer security.",

                severity="medium",

                target=target_url,

                endpoint=target_url,

                tool_source="tls-check",

                evidence=f"Negotiated cipher: {cipher_name}",

                cwe_id="CWE-327",

                remediation="Disable weak ciphers and prefer modern AEAD suites.",

            )

        )



    return findings





def _run_nmap_safe(target_url: str, event_log: EventLogger, advanced_mode: bool = False) -> list[dict[str, Any]]:

    findings: list[dict[str, Any]] = []

    if not shutil.which("nmap"):

        event_log("scan", "nmap not installed in worker image, skipping.", "nmap", None)

        return findings



    parsed = urlparse(target_url)

    if not parsed.hostname:

        return findings

    host = parsed.hostname

    cmd = [

        "nmap",

        "-Pn",

        "-sV",

    ]

    if not advanced_mode:

        cmd.extend(["-p", "80,443"])

    cmd.extend([

        "--script",

        "http-methods,http-security-headers,ssl-cert,ssl-enum-ciphers",

        host,

    ])

    code, output = _run_command_stream(cmd, event_log=event_log, tool="nmap", timeout=420)

    if code != 0:

        event_log("scan", f"nmap execution failed (exit={code}).", "nmap", None)

        return findings



    for line in output.splitlines():

        clean = line.strip()

        if re.search(r"^\d+/tcp\s+open", clean):

            findings.append(

                _finding(

                    title="Open service port discovered",

                    description="Open service ports expand attack surface and should be explicitly justified.",

                    severity="info",

                    target=target_url,

                    endpoint=host,

                    tool_source="nmap",

                    evidence=clean,

                    cwe_id="CWE-200",

                    remediation="Restrict externally exposed ports and enforce least-exposure network policy.",

                )

            )

        if "Potentially risky methods" in clean:

            findings.append(

                _finding(

                    title="Potentially risky HTTP methods enabled",

                    description="Unsafe HTTP methods can allow state-changing actions if access controls are weak.",

                    severity="medium",

                    target=target_url,

                    endpoint=host,

                    tool_source="nmap",

                    evidence=clean,

                    cwe_id="CWE-650",

                    remediation="Disable unnecessary HTTP verbs (TRACE, PUT, DELETE) at server and proxy layers.",

                )

            )

        if "TLSv1.0" in clean or "TLSv1.1" in clean:

            findings.append(

                _finding(

                    title="Legacy TLS protocol support detected",

                    description="Older TLS protocol versions are deprecated and may expose cryptographic weaknesses.",

                    severity="medium",

                    target=target_url,

                    endpoint=host,

                    tool_source="nmap",

                    evidence=clean,

                    cwe_id="CWE-327",

                    remediation="Disable TLS 1.0/1.1 and require TLS 1.2+ for all clients.",

                )

            )



    return findings





def _run_nikto(target_url: str, event_log: EventLogger, advanced_mode: bool = False) -> list[dict[str, Any]]:

    findings: list[dict[str, Any]] = []

    if not shutil.which("nikto"):

        event_log("scan", "nikto not installed in worker image, skipping.", "nikto", None)

        return findings

    

    maxtime = "15m" if advanced_mode else "7m"

    cmd = ["nikto", "-h", target_url, "-maxtime", maxtime, "-Format", "txt", "-nointeractive", "-output", "/tmp/nikto.txt"]

    code, output = _run_command_stream(cmd, event_log=event_log, tool="nikto", timeout=960 if advanced_mode else 480)

    if code not in (0, 1):

        event_log("scan", f"nikto execution failed (exit={code}).", "nikto", None)

        return findings

    for line in output.splitlines():

        clean = line.strip()

        # Accept lines starting with "+ " (Nikto finding prefix) at any path depth

        if not (clean.startswith("+ /") or clean.startswith("+ ")):

            continue

        if clean.startswith("+ Target") or clean.startswith("+ Start Time") or clean.startswith("+ End Time") or clean.startswith("+ 0 error"):

            continue

        severity = "medium" if any(x in clean.lower() for x in ("xss", "injection", "csrf", "sql", "rce")) else "low"

        findings.append(

            _finding(

                title="Web server issue detected by Nikto",

                description=clean,

                severity=severity,

                target=target_url,

                endpoint=target_url,

                tool_source="nikto",

                evidence=clean,

                raw_reference=_snippet(output, 2000),

                remediation="Review the identified path/header and harden server or application configuration accordingly.",

                references="https://cirt.net/Nikto2",

            )

        )



    return findings





def _run_sqlmap(target_url: str, event_log: EventLogger, advanced_mode: bool = False) -> list[dict[str, Any]]:

    findings: list[dict[str, Any]] = []

    if not shutil.which("sqlmap"):

        event_log("scan", "sqlmap not installed in worker image, skipping.", "sqlmap", None)

        return findings

    # Fully non-interactive scan: --batch answers all prompts automatically,

    # --no-ask suppresses the initial confirmation prompt, and --timeout/--retries

    # keep the scan bounded.

    

    level = "3" if advanced_mode else "1"

    risk = "2" if advanced_mode else "1"

    

    cmd = [

        "sqlmap",

        "-u", target_url,

        "--batch",              # answer all prompts with the default response

        "--disable-coloring",   # clean output for parsing

        f"--level={level}",

        f"--risk={risk}",

        "--timeout=15",

        "--retries=1",

        "--forms",              # also scan forms on the page

        "--output-dir=/tmp/sqlmap_out",

    ]

    code, output = _run_command_stream(cmd, event_log=event_log, tool="sqlmap", timeout=600 if advanced_mode else 300)



    if "is vulnerable" in output or ("appears to be" in output and "injectable" in output):

        findings.append(

            _finding(

                title="SQL Injection Detected",

                description="SQLMap identified a potential SQL injection vulnerability.",

                severity="critical",

                target=target_url,

                endpoint=target_url,

                tool_source="sqlmap",

                evidence=_snippet(output, 1000),

                raw_reference=output,

                cwe_id="CWE-89",

                remediation="Use parameterized queries (Prepared Statements) for all database access. Never concatenate user input into SQL.",

            )

        )



    return findings







def _run_whatweb(target_url: str, event_log: EventLogger) -> list[dict[str, Any]]:

    findings: list[dict[str, Any]] = []

    if not shutil.which("whatweb"):

        event_log("scan", "whatweb not installed in worker image, skipping.", "whatweb", None)

        return findings

    cmd = ["whatweb", "--color=never", "--aggression", "1", target_url]

    code, output = _run_command_stream(cmd, event_log=event_log, tool="whatweb", timeout=150)

    if code != 0:

        event_log("scan", f"whatweb execution failed (exit={code}).", "whatweb", None)

        return findings



    findings.append(

        _finding(

            title="Technology fingerprint detected",

            description="Exposed technology fingerprinting can help attackers craft targeted exploits.",

            severity="info",

            target=target_url,

            endpoint=target_url,

            tool_source="whatweb",

            evidence=_snippet(output, 1200),

            cwe_id="CWE-200",

            remediation="Reduce unnecessary version disclosure headers and banners where possible.",

        )

    )



    if re.search(r"(php/5|apache/2\.2|openssl/1\.0|nginx/1\.1)", output.lower()):

        findings.append(

            _finding(

                title="Potential outdated component fingerprint",

                description="Detected version strings suggest potentially outdated software components.",

                severity="medium",

                target=target_url,

                endpoint=target_url,

                tool_source="whatweb",

                evidence=_snippet(output, 1200),

                cwe_id="CWE-1104",

                remediation="Validate component versions and apply current stable security patches.",

            )

        )



    return findings





def _run_wafw00f(target_url: str, event_log: EventLogger) -> list[dict[str, Any]]:

    findings: list[dict[str, Any]] = []

    if not shutil.which("wafw00f"):

        event_log("scan", "wafw00f not installed in worker image, skipping.", "wafw00f", None)

        return findings

    cmd = ["wafw00f", "-a", "--no-colors", target_url]

    code, output = _run_command_stream(cmd, event_log=event_log, tool="wafw00f", timeout=120)

    if code != 0:

        event_log("scan", f"wafw00f execution failed (exit={code}).", "wafw00f", None)

        return findings

    if "No WAF detected" in output:

        findings.append(

            _finding(

                title="No web application firewall detected",

                description="Absence of WAF protection may increase exposure to common web attack traffic.",

                severity="low",

                target=target_url,

                endpoint=target_url,

                tool_source="wafw00f",

                evidence=_snippet(output, 1000),

                cwe_id="CWE-693",

                remediation="Consider layered defenses such as WAF rulesets and robust server-side input validation.",

            )

        )

    else:

        findings.append(

            _finding(

                title="WAF fingerprint result",

                description="WAF fingerprinting result recorded for architecture and exposure review.",

                severity="info",

                target=target_url,

                endpoint=target_url,

                tool_source="wafw00f",

                evidence=_snippet(output, 1000),

                remediation="Review detected WAF posture and validate protective rules coverage.",

            )

        )



    return findings





def _run_nuclei(target_url: str, event_log: EventLogger, advanced_mode: bool = False) -> list[dict[str, Any]]:

    findings: list[dict[str, Any]] = []

    if not shutil.which("nuclei"):

        event_log("scan", "nuclei not installed in worker image, skipping.", "nuclei", None)

        return findings

    

    cmd = ["nuclei", "-u", target_url, "-silent", "-json"]

    if not advanced_mode:

        cmd.extend(["-severity", "critical,high,medium,low"])

    code, stdout = _run_command_stream(cmd, event_log=event_log, tool="nuclei", timeout=960 if advanced_mode else 420)

    if code != 0:

        event_log("scan", f"nuclei execution failed (exit={code}).", "nuclei", None)

        return findings

    for line in stdout.splitlines():

        if not line.strip():

            continue

        try:

            row = json.loads(line)

        except json.JSONDecodeError:

            continue

        info = row.get("info", {})

        cwe = None

        classification = info.get("classification", {})

        if isinstance(classification, dict):

            cwe = classification.get("cwe-id")

        findings.append(

            _finding(

                title=info.get("name", "Nuclei finding"),

                description=info.get("description", "Detected by nuclei template."),

                severity=(info.get("severity") or "info"),

                target=target_url,

                endpoint=row.get("matched-at"),

                tool_source="nuclei",

                evidence=row.get("matcher-name") or "",

                raw_reference=line,

                cwe_id=cwe,

                remediation=info.get("remediation"),

                references="; ".join(info.get("reference", [])) if isinstance(info.get("reference"), list) else "",

            )

        )



    return findings





def _run_zap_baseline(target_url: str, event_log: EventLogger, advanced_mode: bool = False) -> list[dict[str, Any]]:

    findings: list[dict[str, Any]] = []

    if not shutil.which("zap-baseline.py") and not shutil.which("zap-full-scan.py"):

        event_log("scan", "ZAP python scripts not installed in worker image, skipping.", "zap", None)

        return findings

    

    zap_script = "zap-full-scan.py" if advanced_mode else "zap-baseline.py"

    if not shutil.which(zap_script):

        zap_script = "zap-baseline.py"

        

    minutes = "10" if advanced_mode else "6"

    cmd = [zap_script, "-t", target_url, "-m", minutes, "-J", "/tmp/zap.json"]

    code, _ = _run_command_stream(cmd, event_log=event_log, tool="zap", timeout=1200 if advanced_mode else 480)

    if code not in (0, 1, 2):

        event_log("scan", f"ZAP baseline failed (exit={code}).", "zap", None)

        return findings

    try:

        with open("/tmp/zap.json", "r", encoding="utf-8") as handle:

            data = json.load(handle)

    except (OSError, json.JSONDecodeError):

        return findings

    for site in data.get("site", []):

        for alert in site.get("alerts", []):

            risk = (alert.get("riskcode") or "0").strip()

            severity = {"3": "high", "2": "medium", "1": "low", "0": "info"}.get(risk, "info")

            cwe = str(alert.get("cweid")) if alert.get("cweid") else None

            findings.append(

                _finding(

                    title=alert.get("name", "ZAP alert"),

                    description=alert.get("desc", "Detected by ZAP baseline scan."),

                    severity=severity,

                    target=target_url,

                    endpoint=site.get("@name"),

                    tool_source="zap-baseline",

                    parameter=alert.get("param"),

                    evidence=alert.get("evidence", ""),

                    raw_reference=alert.get("reference", ""),

                    cwe_id=cwe,

                    remediation=alert.get("solution"),

                    references=alert.get("reference", ""),

                )

            )



    return findings





def _run_crawler(target_url: str, event_log: EventLogger, advanced_mode: bool = False) -> list[dict[str, Any]]:

    findings: list[dict[str, Any]] = []

    if not shutil.which("hakrawler"):

        event_log("scan", "hakrawler not installed in worker image, skipping.", "hakrawler", None)

        return findings

    

    depth = "3" if advanced_mode else "2"

    cmd = ["hakrawler", "-url", target_url, "-depth", depth, "-plain"]

    code, output = _run_command_stream(cmd, event_log=event_log, tool="hakrawler", timeout=600 if advanced_mode else 300)

    if code != 0:

        event_log("scan", f"hakrawler execution failed (exit={code}).", "hakrawler", None)

        return findings

    

    urls = [line.strip() for line in output.splitlines() if line.strip() and line.startswith("http")]

    unique_urls = list(set(urls))

    

    if unique_urls:

        findings.append(

            _finding(

                title="Application Endpoints Discovered",

                description=f"Hakrawler discovered {len(unique_urls)} unique URLs/endpoints during spidering.",

                severity="info",

                target=target_url,

                endpoint=target_url,

                tool_source="hakrawler",

                evidence=_snippet("\n".join(unique_urls), 2000),

                cwe_id="CWE-200",

                remediation="Ensure all exposed endpoints require appropriate authentication and authorization.",

            )

        )



    return findings





def _run_ffuf(target_url: str, event_log: EventLogger, advanced_mode: bool = False) -> list[dict[str, Any]]:

    findings: list[dict[str, Any]] = []

    if not shutil.which("ffuf"):

        event_log("scan", "ffuf not installed in worker image, skipping.", "ffuf", None)

        return findings

    

    # Using the files wordlist we downloaded

    wordlist = "/app/wordlists/raft-small-files-lowercase.txt"

    target = target_url.rstrip("/") + "/FUZZ"

    cmd = [

        "ffuf",

        "-w", wordlist,

        "-u", target,

        "-mc", "200,301,302,500",

        "-t", "50",

        "-json"

    ]

    code, output = _run_command_stream(cmd, event_log=event_log, tool="ffuf", timeout=900 if advanced_mode else 600)

    if code not in (0, 1): # ffuf often returns 1 if it finds errors but still outputs results

        event_log("scan", f"ffuf execution failed (exit={code}).", "ffuf", None)

        return findings

        

    for line in output.splitlines():

        if not line.strip():

            continue

        try:

            data = json.loads(line)

            # Depending on ffuf version, it might be a single JSON object with 'results' array

            results = data.get("results", []) if "results" in data else [data]

            for result in results:

                status = result.get("status")

                url = result.get("url")

                word = result.get("input", {}).get("FUZZ", result.get("word", ""))

                

                severity = "low"

                if status == 200:

                    if any(x in word.lower() for x in ("env", "config", "backup", "bak", "sql", "db")):

                        severity = "critical"

                    elif any(x in word.lower() for x in ("admin", "login", "api")):

                        severity = "medium"

                

                findings.append(

                    _finding(

                        title=f"Discovered hidden path: /{word}",

                        description=f"FFUF discovered a hidden or unlinked path responding with HTTP {status}.",

                        severity=severity,

                        target=target_url,

                        endpoint=url,

                        tool_source="ffuf",

                        evidence=f"URL: {url}\nStatus: {status}\nWords: {result.get('words')}\nLines: {result.get('lines')}",

                        cwe_id="CWE-425",

                        remediation="Ensure sensitive files and administrative interfaces are not publicly accessible.",

                    )

                )

        except json.JSONDecodeError:

            continue

            



    return findings





def _run_trufflehog(target_url: str, event_log: EventLogger) -> list[dict[str, Any]]:

    findings: list[dict[str, Any]] = []

    if not shutil.which("trufflehog"):

        event_log("scan", "trufflehog not installed in worker image, skipping.", "trufflehog", None)

        return findings

    

    # Trufflehog 3 can scan a URL, but it expects a git repo. 

    # For a web endpoint, we'll try to find exposed .git directories or run it on the base URL if it supports it.

    # Alternatively, running trufflehog on a single URL might not yield much without crawling.

    # Let's run it against the target URL directly and see if it finds exposed secrets in the HTML/JS.

    cmd = ["trufflehog", "git", target_url, "--only-verified", "--json"] 

    # Actually, for a live web app without git, trufflehog might fail. Let's use the 'filesystem' scanner on downloaded JS files instead in a future iteration.

    # For now, we will try to scan the base URL if it happens to be an exposed git repo, or just skip.

    event_log("scan", "Trufflehog web scanning is still experimental, skipping deep JS scan for now.", "trufflehog", None)



    return findings





def _run_wpscan(target_url: str, event_log: EventLogger, whatweb_output: str) -> list[dict[str, Any]]:

    findings: list[dict[str, Any]] = []

    if "WordPress" not in whatweb_output:

        return findings

        

    if not shutil.which("wpscan"):

        event_log("scan", "wpscan not installed in worker image, skipping.", "wpscan", None)

        return findings

        

    cmd = ["wpscan", "--url", target_url, "--format", "json", "--batch", "--random-user-agent"]

    code, output = _run_command_stream(cmd, event_log=event_log, tool="wpscan", timeout=600)

    

    try:

        # WPScan might output text before the JSON payload. We need to find the start of the JSON block.

        json_start = output.find("{")

        if json_start >= 0:

            json_str = output[json_start:]

            data = json.loads(json_str)

            

            # Parse interesting findings

            for finding_type in ["interesting_findings", "vuln_api", "plugins", "themes"]:

                items = data.get(finding_type, {})

                if isinstance(items, dict):

                    for name, details in items.items():

                        vulns = details.get("vulnerabilities", [])

                        for vuln in vulns:

                            findings.append(

                                _finding(

                                    title=f"WordPress Vulnerability: {vuln.get('title', 'Unknown')}",

                                    description=f"WPScan detected a vulnerability in {name}.",

                                    severity="high",

                                    target=target_url,

                                    endpoint=target_url,

                                    tool_source="wpscan",

                                    evidence=_snippet(json.dumps(vuln), 1000),

                                    raw_reference=json_str,

                                    cwe_id="CWE-1104",

                                    remediation="Update or remove the vulnerable WordPress plugin/theme.",

                                    references="\n".join(vuln.get("references", {}).get("url", [])),

                                )

                            )

    except Exception as exc:

        event_log("scan", f"Failed to parse WPScan JSON output: {exc}", "wpscan", None)

        



    return findings





def _run_testssl(target_url: str, event_log: EventLogger) -> list[dict[str, Any]]:

    findings: list[dict[str, Any]] = []

    parsed = urlparse(target_url)

    if parsed.scheme != "https" or not parsed.hostname:

        return findings

    testssl_cmd = shutil.which("testssl.sh") or shutil.which("testssl")

    if not testssl_cmd:

        event_log("scan", "testssl not installed in worker image, skipping.", "testssl", None)

        return findings



    target = f"{parsed.hostname}:{parsed.port or 443}"

    

    # Generate a unique path for testssl json output so parallel/subsequent scans don't clash

    import uuid

    json_path = f"/tmp/testssl_{uuid.uuid4().hex[:8]}.json"

    

    cmd = [testssl_cmd, "--warnings", "off", "--quiet", "--jsonfile-pretty", json_path, target]

    code, output = _run_command_stream(cmd, event_log=event_log, tool="testssl", timeout=480)

    if code not in (0, 1):

        event_log("scan", f"testssl execution failed (exit={code}).", "testssl", None)

        return findings

    try:

        with open(json_path, "r", encoding="utf-8") as handle:

            rows = json.load(handle)

    except (OSError, json.JSONDecodeError):

        return findings

    for row in rows:

        if not isinstance(row, dict):

            continue

        severity = (row.get("severity") or "").upper()

        if severity not in {"CRITICAL", "HIGH", "MEDIUM"}:

            continue

        findings.append(

            _finding(

                title=f"TLS finding: {row.get('id', 'testssl-check')}",

                description=row.get("finding", "Potential TLS weakness detected."),

                severity=severity.lower(),

                target=target_url,

                endpoint=target,

                tool_source="testssl",

                evidence=_snippet(json.dumps(row), 1200),

                cwe_id="CWE-327",

                remediation="Disable weak protocols/ciphers and align TLS config with modern best practices.",

                raw_reference=_snippet(output, 1200),

            )

        )



    return findings





# ---------------------------------------------------------------------------

# XSS â€” Passive reflection probe

# ---------------------------------------------------------------------------



def _check_xss_passive(target_url: str, event_log: EventLogger) -> list[dict[str, Any]]:

    """Probe URL query parameters for unencoded reflection (indicator of XSS risk)."""

    findings: list[dict[str, Any]] = []

    PROBE = "xss_probe_exploitron_1337"

    separator = "&" if "?" in target_url else "?"

    probe_url = f"{target_url}{separator}q={PROBE}&search={PROBE}&s={PROBE}"

    try:

        resp = requests.get(probe_url, timeout=15, allow_redirects=True, headers={"User-Agent": "Mozilla/5.0"})

        body = resp.text

    except requests.RequestException as exc:

        event_log("scan", f"XSS passive probe failed: {exc}", "xss-passive", None)

        return findings



    if PROBE in body:

        findings.append(

            _finding(

                title="Reflected XSS Indicator â€” Unencoded Input Reflection",

                description=(

                    "User-supplied query parameter input is reflected back into the HTTP response body "

                    "without HTML encoding. This strongly indicates that XSS payloads could execute in a victim's browser."

                ),

                severity="high",

                target=target_url,

                endpoint=probe_url,

                tool_source="xss-passive",

                parameter="q / search / s",

                evidence=f"Probe token '{PROBE}' appeared unencoded in response body.\nProbe URL: {probe_url}\nHTTP {resp.status_code}",

                cwe_id="CWE-79",

                cvss_score=8.1,

                cvss_vector="AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:L/A:N",

                remediation=(

                    "HTML-encode all user-supplied input before rendering it in the page. "

                    "Use templating engines with auto-escaping. "

                    "Deploy a Content-Security-Policy header to block inline script execution."

                ),

                references="https://owasp.org/www-community/attacks/xss/",

            )

        )



    return findings





# ---------------------------------------------------------------------------

# XSS â€” Active scan via dalfox

# ---------------------------------------------------------------------------



def _run_dalfox(target_url: str, event_log: EventLogger, advanced_mode: bool = False) -> list[dict[str, Any]]:

    """Run dalfox for active XSS detection â€” confirms real payloads fire."""

    findings: list[dict[str, Any]] = []

    if not shutil.which("dalfox"):

        event_log("scan", "dalfox not installed in worker image, skipping.", "dalfox", None)

        return findings



    timeout_secs = 300 if advanced_mode else 150

    cmd = [

        "dalfox", "url", target_url,

        "--silence",

        "--no-spinner",

        "--only-poc",

        "--skip-bav",

        "--timeout", "10",

        "--delay", "100",

    ]

    if advanced_mode:

        cmd.extend(["--deep-domxss", "--follow-redirects"])



    code, output = _run_command_stream(cmd, event_log=event_log, tool="dalfox", timeout=timeout_secs)



    confirmed_lines = [ln for ln in output.splitlines() if ln.strip().startswith("[V]")]

    potential_lines = [ln for ln in output.splitlines() if ln.strip().startswith("[I]")]



    if confirmed_lines:

        for line in confirmed_lines:

            findings.append(

                _finding(

                    title="Cross-Site Scripting (XSS) â€” Confirmed by Dalfox",

                    description=(

                        "Dalfox has confirmed a working XSS payload on this endpoint. An attacker can inject "

                        "and execute arbitrary JavaScript in a victim's browser, enabling session hijacking, "

                        "credential theft, defacement, or malware distribution."

                    ),

                    severity="critical",

                    target=target_url,

                    endpoint=target_url,

                    tool_source="dalfox",

                    evidence=_snippet(line, 1200),

                    raw_reference=_snippet(output, 2000),

                    cwe_id="CWE-79",

                    cvss_score=9.3,

                    cvss_vector="AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:N",

                    remediation=(

                        "Immediately sanitize and HTML-encode all reflected user input. "

                        "Apply a strict Content-Security-Policy. Use framework-level XSS protection. "

                        "Perform a full code audit on all input reflection points."

                    ),

                    references="https://owasp.org/www-community/attacks/xss/",

                )

            )

    elif potential_lines:

        findings.append(

            _finding(

                title="Potential XSS Injection Point â€” Dalfox",

                description=(

                    "Dalfox found potential XSS injection points that require further manual verification. "

                    "Input is reflected in the response but payload execution could not be fully automated."

                ),

                severity="high",

                target=target_url,

                endpoint=target_url,

                tool_source="dalfox",

                evidence=_snippet("\n".join(potential_lines[:5]), 1200),

                raw_reference=_snippet(output, 2000),

                cwe_id="CWE-79",

                cvss_score=7.5,

                remediation="Manually test the flagged parameters and sanitize all reflected user input.",

                references="https://owasp.org/www-community/attacks/xss/",

            )

        )



    return findings





# ---------------------------------------------------------------------------

# CSRF â€” Passive form and cookie analysis

# ---------------------------------------------------------------------------



def _check_csrf_passive(target_url: str, event_log: EventLogger) -> list[dict[str, Any]]:

    """Check HTML forms for CSRF token absence and inspect cookie SameSite flags."""

    findings: list[dict[str, Any]] = []

    try:

        resp = requests.get(target_url, timeout=15, allow_redirects=True, headers={"User-Agent": "Mozilla/5.0"})

    except requests.RequestException as exc:

        event_log("scan", f"CSRF check failed: {exc}", "csrf-check", None)

        return findings



    headers_lower = {k.lower(): v for k, v in resp.headers.items()}

    csrf_token_patterns = re.compile(

        r'name=["\']?(\w*(csrf|token|_token|authenticity_token|nonce|xsrf)\w*)["\']?',

        re.IGNORECASE,

    )

    post_form_pattern = re.compile(r'<form[^>]+method=["\']?post["\']?[^>]*>', re.IGNORECASE)

    post_forms = post_form_pattern.findall(resp.text)



    for form_tag in post_forms:

        form_start = resp.text.find(form_tag)

        form_end = resp.text.find("</form>", form_start)

        form_body = resp.text[form_start:form_end] if form_end != -1 else form_tag



        if not csrf_token_patterns.search(form_body):

            action = re.search(r'action=["\']?([^"\'>\s]+)', form_tag, re.IGNORECASE)

            action_url = action.group(1) if action else "(unknown)"

            findings.append(

                _finding(

                    title="CSRF â€” POST Form Missing Anti-CSRF Token",

                    description=(

                        f"A POST form with action '{action_url}' was found without a detectable CSRF token. "

                        "An attacker can craft a hidden form on a malicious site that, when visited by a logged-in "

                        "victim, submits state-changing requests on their behalf without consent."

                    ),

                    severity="high",

                    target=target_url,

                    endpoint=resp.url,

                    tool_source="csrf-check",

                    evidence=f"Form tag: {_snippet(form_tag, 400)}\nNo CSRF token input detected in form body.",

                    cwe_id="CWE-352",

                    cvss_score=8.8,

                    cvss_vector="AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H",

                    remediation=(

                        "Implement the Synchronizer Token Pattern: embed a cryptographically random per-session "

                        "token as a hidden field in every state-changing form and validate it server-side. "

                        "Also set SameSite=Strict on session cookies as a secondary defence."

                    ),

                    references="https://owasp.org/www-community/attacks/csrf",

                )

            )



    set_cookie = headers_lower.get("set-cookie", "")

    if set_cookie and "samesite" not in set_cookie.lower():

        findings.append(

            _finding(

                title="CSRF â€” Session Cookie Missing SameSite Attribute",

                description=(

                    "The session cookie is set without the `SameSite` attribute. The browser will send the cookie "

                    "with cross-site requests, making CSRF attacks easier to execute."

                ),

                severity="medium",

                target=target_url,

                endpoint=resp.url,

                tool_source="csrf-check",

                evidence=f"Set-Cookie: {_snippet(set_cookie, 500)}",

                cwe_id="CWE-352",

                cvss_score=6.5,

                remediation="Add `SameSite=Strict` or `SameSite=Lax` to all session cookies.",

                references="https://owasp.org/www-community/attacks/csrf",

            )

        )



    return findings





# ---------------------------------------------------------------------------

# Open Redirect â€” Common redirect parameter probing

# ---------------------------------------------------------------------------



def _check_open_redirect(target_url: str, event_log: EventLogger) -> list[dict[str, Any]]:

    """Probe common redirect parameters for unvalidated external redirect."""

    findings: list[dict[str, Any]] = []

    REDIRECT_PARAMS = [

        "next", "redirect", "redirect_url", "url", "return",

        "return_url", "goto", "redir", "destination", "target",

    ]

    EXTERNAL_PROBE = "https://evil.example.com/proof"

    parsed = urlparse(target_url)

    base = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"



    for param in REDIRECT_PARAMS:

        probe_url = f"{base}?{param}={EXTERNAL_PROBE}"

        try:

            resp = requests.get(

                probe_url,

                timeout=10,

                allow_redirects=False,

                headers={"User-Agent": "Mozilla/5.0"},

            )

        except requests.RequestException:

            continue



        location = resp.headers.get("Location", "")

        if resp.status_code in (301, 302, 303, 307, 308) and "evil.example.com" in location:

            findings.append(

                _finding(

                    title="Open Redirect â€” Unvalidated External Redirect",

                    description=(

                        f"The parameter `{param}` redirects users to any external URL without validation. "

                        "Attackers can phish victims by sending links to the trusted domain that redirect to malicious sites."

                    ),

                    severity="high",

                    target=target_url,

                    endpoint=probe_url,

                    tool_source="redirect-check",

                    parameter=param,

                    evidence=f"GET {probe_url}\nHTTP {resp.status_code}\nLocation: {location}",

                    cwe_id="CWE-601",

                    cvss_score=7.4,

                    cvss_vector="AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:N",

                    remediation=(

                        "Validate all redirect targets against a strict allowlist of internal paths. "

                        "Reject any redirect target that is an absolute URL to an external host. "

                        "Use relative paths for redirects where possible."

                    ),

                    references="https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html",

                )

            )

            break



    return findings





# ---------------------------------------------------------------------------

# Sensitive File & Endpoint Exposure

# ---------------------------------------------------------------------------



def _check_sensitive_exposure(target_url: str, event_log: EventLogger) -> list[dict[str, Any]]:

    """Probe well-known paths for sensitive file exposure and error/debug leaks."""

    findings: list[dict[str, Any]] = []

    base = target_url.rstrip("/")



    SENSITIVE_PATHS: list[tuple[str, str, str, str, str, str]] = [

        ("/.env", "Exposed .env File (Environment Secrets)", "critical", "CWE-538",

         "The `.env` file is publicly accessible â€” likely contains DB passwords, API keys, and JWT secrets.",

         "Block dotfile access at the reverse proxy. Never store .env in the web root. Use a secrets manager."),

        ("/.git/config", "Exposed .git Directory (Source Code Leak)", "critical", "CWE-538",

         "The `.git` directory is accessible â€” full source code can be extracted with `git clone`.",

         "Block `.git` access at the web server. Ensure document root does not overlap the repository root."),

        ("/phpinfo.php", "PHP Info Page Exposed", "high", "CWE-200",

         "`phpinfo()` exposes server config, PHP version, loaded modules, and environment variables.",

         "Remove phpinfo files from production. Restrict by IP if needed for debugging."),

        ("/wp-config.php", "WordPress Config File Exposed", "critical", "CWE-538",

         "`wp-config.php` contains database credentials and WordPress secret keys.",

         "Move wp-config.php above the web root or block access at the server level."),

        ("/config.php", "Application Config File Exposed", "critical", "CWE-538",

         "A configuration file is publicly accessible and may contain credentials or sensitive settings.",

         "Move config files outside the web root. Use environment variables for secrets."),

        ("/backup.sql", "Database Backup File Exposed", "critical", "CWE-530",

         "A SQL backup file is downloadable â€” exposes the full database schema and all data.",

         "Never store backups in the web root. Use off-site storage with strict access controls."),

        ("/backup.zip", "Application Backup Archive Exposed", "critical", "CWE-530",

         "A backup archive is accessible â€” may expose full application source code and credentials.",

         "Store backups outside the web root or in private cloud storage with access policies."),

        ("/.htaccess", "Apache .htaccess File Exposed", "medium", "CWE-200",

         "`.htaccess` reveals server rewrite rules, access controls, and directory structure.",

         "Configure Apache to deny global access to .htaccess files."),

        ("/server-status", "Apache Server Status Page Exposed", "medium", "CWE-200",

         "mod_status leaks live request data, client IPs, and server metrics.",

         "Restrict `/server-status` to localhost only in Apache configuration."),

        ("/debug", "Debug Endpoint Exposed", "high", "CWE-94",

         "A debug endpoint is publicly accessible â€” may reveal internals or allow dangerous actions.",

         "Disable debug routes in production. Restrict with authentication and IP allowlists."),

        ("/api/v1/debug", "API Debug Endpoint Exposed", "high", "CWE-94",

         "An API debug endpoint is accessible â€” may expose internal application state.",

         "Remove or disable all debug API endpoints in production builds."),

        ("/swagger.json", "Swagger API Spec Exposed (Unauthenticated)", "medium", "CWE-200",

         "The full API spec is public â€” reveals all endpoints, parameters, and schemas to attackers.",

         "Restrict API documentation to authenticated users or internal networks."),

        ("/actuator", "Spring Boot Actuator Exposed", "critical", "CWE-200",

         "Spring Boot Actuator exposes health, env vars, beans, and may enable RCE via /actuator/env.",

         "Secure all actuator endpoints with authentication and restrict to internal networks only."),

        ("/actuator/env", "Spring Boot Actuator /env Exposed (RCE Risk)", "critical", "CWE-94",

         "/actuator/env can leak environment variables including secrets, and may allow property injection leading to RCE.",

         "Disable or strictly lock down the /actuator/env endpoint in production."),

    ]



    ERROR_PATTERNS = [

        (r"Traceback \(most recent call last\)", "Python Stack Trace"),

        (r"Warning: .+\(\) expects", "PHP Error Disclosure"),

        (r"SQL syntax.*MySQL", "MySQL Error Disclosure"),

        (r"ORA-\d{5}:", "Oracle DB Error"),

        (r"Microsoft OLE DB Provider for SQL Server", "MSSQL Error Disclosure"),

        (r"at .+\.java:\d+\)", "Java Stack Trace"),

        (r"Caused by: .+Exception", "Java Exception Disclosure"),

        (r"System\.NullReferenceException", ".NET Exception Disclosure"),

        (r"ActiveRecord::", "Ruby on Rails Error"),

    ]



    score_map = {"critical": 9.8, "high": 7.5, "medium": 5.3, "low": 3.1}



    for path, title, severity, cwe, description, remediation in SENSITIVE_PATHS:

        probe_url = base + path

        try:

            resp = requests.get(

                probe_url, timeout=10, allow_redirects=True,

                headers={"User-Agent": "Mozilla/5.0"},

            )

        except requests.RequestException:

            continue



        if resp.status_code == 200 and len(resp.text.strip()) > 20:

            findings.append(

                _finding(

                    title=title,

                    description=description,

                    severity=severity,

                    target=target_url,

                    endpoint=probe_url,

                    tool_source="exposure-check",

                    evidence=(

                        f"HTTP 200 OK â€” {len(resp.text)} bytes\n"

                        f"Content-Type: {resp.headers.get('Content-Type', 'unknown')}\n\n"

                        f"Preview:\n{_snippet(resp.text, 600)}"

                    ),

                    cwe_id=cwe,

                    cvss_score=score_map.get(severity, 5.0),

                    remediation=remediation,

                    references="https://owasp.org/www-project-web-security-testing-guide/",

                )

            )



    for probe_url in [base + "/", base + "/nonexistent_page_404_probe", base + "/%27"]:

        try:

            resp = requests.get(probe_url, timeout=10, allow_redirects=True, headers={"User-Agent": "Mozilla/5.0"})

            body = resp.text

        except requests.RequestException:

            continue

        for pattern, trace_title in ERROR_PATTERNS:

            if re.search(pattern, body):

                findings.append(

                    _finding(

                        title=f"Error/Stack Trace Disclosure â€” {trace_title}",

                        description=(

                            f"The application exposes {trace_title} details in HTTP responses. "

                            "This leaks file paths, class names, and line numbers, aiding targeted exploitation."

                        ),

                        severity="medium",

                        target=target_url,

                        endpoint=probe_url,

                        tool_source="exposure-check",

                        evidence=_snippet(body, 600),

                        cwe_id="CWE-209",

                        cvss_score=5.3,

                        remediation=(

                            "Configure the application to return generic error pages in production. "

                            "Log detailed errors server-side only. Never display stack traces to end users."

                        ),

                        references="https://owasp.org/www-project-web-security-testing-guide/",

                    )

                )

                break



    return findings





def run_safe_scan(target_url: str, event_log: EventLogger, advanced_mode: bool = False) -> list[dict[str, Any]]:
    """
    Multi-terminal parallel scan orchestrator.

    Tools are grouped into 3 waves and run concurrently using ThreadPoolExecutor.
    Heavy external subprocesses (nikto, sqlmap, ZAP, etc.) share a semaphore so
    max 3 run at the same time — prevents CPU/RAM thrash on a single container.

    Passive/fast checks (HTTP probes, headers, CSRF etc.) are fully parallel as
    they are mostly I/O-bound and lightweight.
    """
    import concurrent.futures
    import threading

    all_findings: list[dict[str, Any]] = []
    lock = threading.Lock()
    # Semaphore: max 3 heavy subprocess tools run simultaneously
    heavy_sem = threading.Semaphore(3)
    # Share whatweb output for wpscan
    whatweb_cache: list[str] = [""]

    def fast(label: str, tool_id: str, pct: int, fn, *args):
        """Lightweight / I/O-bound task — no semaphore."""
        event_log("scan", f"[{tool_id}] {label}", tool_id, pct)
        try:
            result = fn(*args)
            with lock:
                all_findings.extend(result)
            event_log("scan", f"[{tool_id}] Done — {len(result)} finding(s)", tool_id, None)
        except Exception as exc:  # noqa: BLE001
            event_log("scan", f"[{tool_id}] Failed: {exc}", tool_id, None)

    def heavy(label: str, tool_id: str, pct: int, fn, *args):
        """Heavy subprocess tool — acquire semaphore slot first."""
        with heavy_sem:
            event_log("scan", f"[{tool_id}] {label}", tool_id, pct)
            try:
                result = fn(*args)
                with lock:
                    all_findings.extend(result)
                event_log("scan", f"[{tool_id}] Done — {len(result)} finding(s)", tool_id, None)
            except Exception as exc:  # noqa: BLE001
                event_log("scan", f"[{tool_id}] Failed: {exc}", tool_id, None)

    def collect_whatweb():
        """WhatWeb also caches its output for wpscan."""
        with heavy_sem:
            event_log("scan", "[whatweb] WhatWeb fingerprinting", "whatweb", 18)
            try:
                result = _run_whatweb(target_url, event_log)
                with lock:
                    all_findings.extend(result)
                    if result and result[0].get("evidence"):
                        whatweb_cache[0] = result[0]["evidence"]
                event_log("scan", f"[whatweb] Done — {len(result)} finding(s)", "whatweb", None)
            except Exception as exc:  # noqa: BLE001
                event_log("scan", f"[whatweb] Failed: {exc}", "whatweb", None)

    # ── WAVE 0: Instant passive checks (fast, no semaphore) ─────────────────
    event_log("scan", "== Wave 0: Passive header/TLS/discovery checks ==", "scanner", 3)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3, thread_name_prefix="w0") as ex:
        futs = [
            ex.submit(fast, "Security header analysis", "header-check", 4, _header_findings, target_url, event_log),
            ex.submit(fast, "TLS/HTTPS passive check", "tls-check", 5, _tls_findings, target_url),
            ex.submit(fast, "Discovery probe (robots/sitemap)", "discovery", 6, _discovery_probe, target_url),
        ]
        concurrent.futures.wait(futs)

    # ── WAVE 1: Fast HTTP probes + light recon (mostly I/O, all parallel) ───
    event_log("scan", "== Wave 1: Fast HTTP probes — XSS passive, CSRF, redirect, exposure, wafw00f ==", "scanner", 10)
    with concurrent.futures.ThreadPoolExecutor(max_workers=8, thread_name_prefix="w1") as ex:
        futs = [
            ex.submit(fast, "Passive XSS reflection probe", "xss-passive", 11, _check_xss_passive, target_url, event_log),
            ex.submit(fast, "CSRF form & cookie analysis", "csrf-check", 12, _check_csrf_passive, target_url, event_log),
            ex.submit(fast, "Open redirect probing", "redirect-check", 13, _check_open_redirect, target_url, event_log),
            ex.submit(fast, "Sensitive file & endpoint exposure", "exposure-check", 14, _check_sensitive_exposure, target_url, event_log),
            ex.submit(heavy, "WAFW00F WAF detection", "wafw00f", 15, _run_wafw00f, target_url, event_log),
            ex.submit(collect_whatweb),
            ex.submit(heavy, "Nmap safe-scripts port scan", "nmap", 18, _run_nmap_safe, target_url, event_log, advanced_mode),
        ]
        concurrent.futures.wait(futs)

    # ── WAVE 2: Heavy active scanners (semaphore caps at 3 concurrent) ───────
    event_log("scan", "== Wave 2: Heavy scanners — nuclei, nikto, sqlmap, dalfox, ZAP, hakrawler, ffuf ==", "scanner", 28)
    with concurrent.futures.ThreadPoolExecutor(max_workers=7, thread_name_prefix="w2") as ex:
        futs = [
            ex.submit(heavy, "Nuclei CVE/tech templates", "nuclei", 30, _run_nuclei, target_url, event_log, advanced_mode),
            ex.submit(heavy, "Nikto web server scan", "nikto", 35, _run_nikto, target_url, event_log, advanced_mode),
            ex.submit(heavy, "SQLMap injection detection", "sqlmap", 40, _run_sqlmap, target_url, event_log, advanced_mode),
            ex.submit(heavy, "Dalfox active XSS scan", "dalfox", 45, _run_dalfox, target_url, event_log, advanced_mode),
            ex.submit(heavy, "OWASP ZAP baseline scan", "zap-baseline", 50, _run_zap_baseline, target_url, event_log, advanced_mode),
            ex.submit(heavy, "Hakrawler endpoint spider", "hakrawler", 60, _run_crawler, target_url, event_log, advanced_mode),
            ex.submit(heavy, "FFUF content fuzzing", "ffuf", 65, _run_ffuf, target_url, event_log, advanced_mode),
        ]
        concurrent.futures.wait(futs)

    # ── WAVE 3: Specialty tools ───────────────────────────────────────────────
    event_log("scan", "== Wave 3: Specialty tools — testssl, wpscan ==", "scanner", 82)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2, thread_name_prefix="w3") as ex:
        futs = [
            ex.submit(heavy, "TLS deep analysis (testssl)", "testssl", 84, _run_testssl, target_url, event_log),
            ex.submit(heavy, "WordPress scan (wpscan)", "wpscan", 87, _run_wpscan, target_url, event_log, whatweb_cache[0]),
        ]
        concurrent.futures.wait(futs)

    event_log("scan", f"== All waves complete. Total findings: {len(all_findings)} ==", "scanner", 100)
    return all_findings

