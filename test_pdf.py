import sys
import os
sys.path.append(os.path.abspath("backend"))

from app.services.reporting import _build_pdf

test_findings = [
    {
        "title": "Missing HSTS Header",
        "severity": "medium",
        "description": "The site does not force HTTPS.",
        "endpoint": "https://example.com"
    },
    {
        "title": "SQL Injection in Login",
        "severity": "critical",
        "description": "The username field is vulnerable to SQL injection.",
        "endpoint": "https://example.com/api/login"
    },
    {
        "title": "Information Disclosure",
        "severity": "info",
        "description": "Server header discloses Nginx version.",
        "endpoint": "https://example.com"
    },
    {
        "title": "Stored Cross-Site Scripting (XSS)",
        "severity": "high",
        "description": "The comments section reflects script tags without sanitization.",
        "endpoint": "https://example.com/comments"
    }
]

output_path = "backend/test_report.pdf"
_build_pdf(output_path, "test-scan-123", "https://example.com", test_findings)
print("PDF built successfully at", output_path)
