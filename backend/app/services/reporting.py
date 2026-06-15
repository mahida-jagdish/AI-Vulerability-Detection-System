import hashlib
import html
import json
import os
from datetime import datetime
from typing import Any

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from app.config import get_settings


def _summary(findings: list[dict[str, Any]]) -> dict[str, int]:
    summary = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for finding in findings:
        sev = (finding.get("severity") or "info").lower()
        summary[sev] = summary.get(sev, 0) + 1
    return summary


def _owasp_summary(findings: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for finding in findings:
        category = finding.get("owasp_category") or "Unclassified"
        counts[category] = counts.get(category, 0) + 1
    return dict(sorted(counts.items(), key=lambda x: x[0]))


def _safe_text(value: str | None, limit: int = 1800) -> str:
    text = (value or "").strip()
    if len(text) <= limit:
        return text
    return f"{text[:limit]} ...[truncated]"


def _build_html(scan_id: str, target_url: str, findings: list[dict[str, Any]]) -> str:
    severity = _summary(findings)
    owasp = _owasp_summary(findings)
    cards = "".join(
        [
            f"<li><strong>{html.escape(k)}</strong>: {v}</li>"
            for k, v in [
                ("Critical", severity["critical"]),
                ("High", severity["high"]),
                ("Medium", severity["medium"]),
                ("Low", severity["low"]),
                ("Info", severity["info"]),
            ]
        ]
    )
    owasp_rows = "".join([f"<li><strong>{html.escape(k)}</strong>: {v}</li>" for k, v in owasp.items()])
    finding_blocks: list[str] = []
    for idx, finding in enumerate(findings, start=1):
        finding_blocks.append(
            f"""
<section class="finding">
  <h3>{idx}. [{html.escape((finding.get("severity") or "info").upper())}] {html.escape(finding.get("title", ""))}</h3>
  <p><strong>Tool:</strong> {html.escape(finding.get("tool_source", ""))}</p>
  <p><strong>Endpoint:</strong> {html.escape(finding.get("endpoint") or target_url)}</p>
  <p><strong>OWASP:</strong> {html.escape(finding.get("owasp_category") or "N/A")}</p>
  <p><strong>CWE:</strong> {html.escape(str(finding.get("cwe_id") or "N/A"))}</p>
  <p><strong>CVSS:</strong> {html.escape(str(finding.get("cvss_score") or "N/A"))}</p>
  <p><strong>Description:</strong> {html.escape(finding.get("description") or "")}</p>
  <p><strong>Evidence:</strong></p>
  <pre>{html.escape(_safe_text(finding.get("evidence"), 2200))}</pre>
  <p><strong>Tool Output:</strong></p>
  <pre>{html.escape(_safe_text(finding.get("raw_reference"), 2200))}</pre>
  <p><strong>Remediation:</strong> {html.escape(finding.get("remediation") or "Review security controls and patch accordingly.")}</p>
  <p><strong>Verification Steps (Non-Exploit):</strong> {html.escape(finding.get("verification_steps") or "")}</p>
</section>
"""
        )

    return f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>ExploitronAI Report {scan_id}</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 20px; color: #0f172a; }}
    h1, h2 {{ margin-bottom: 6px; }}
    .meta {{ margin-bottom: 20px; font-size: 14px; }}
    .cards, .owasp {{ margin: 0 0 20px 0; padding-left: 18px; }}
    .finding {{ border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; margin-bottom: 14px; }}
    pre {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; overflow: auto; white-space: pre-wrap; }}
    p {{ margin: 6px 0; }}
  </style>
</head>
<body>
  <h1>ExploitronAI Vulnerability Report</h1>
  <div class="meta">
    <p><strong>Scan ID:</strong> {html.escape(scan_id)}</p>
    <p><strong>Target:</strong> {html.escape(target_url)}</p>
    <p><strong>Generated:</strong> {datetime.utcnow().isoformat()}Z</p>
  </div>

  <h2>Severity Summary</h2>
  <ul class="cards">{cards}</ul>

  <h2>OWASP Top 10 Coverage</h2>
  <ul class="owasp">{owasp_rows or "<li>None</li>"}</ul>

  <h2>Detailed Findings</h2>
  {''.join(finding_blocks) if finding_blocks else "<p>No findings recorded.</p>"}
</body>
</html>"""


from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

def _build_pdf(path: str, scan_id: str, target_url: str, findings: list[dict[str, Any]]) -> None:
    severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    
    # Sort findings by severity
    sorted_findings = sorted(
        findings, 
        key=lambda f: severity_order.get((f.get("severity") or "info").lower(), 5)
    )

    doc = SimpleDocTemplate(
        path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        name="ReportTitle",
        parent=styles["Heading1"],
        fontSize=20,
        spaceAfter=20,
        textColor=colors.darkblue
    )
    
    section_style = ParagraphStyle(
        name="SectionHeader",
        parent=styles["Heading2"],
        fontSize=14,
        spaceBefore=15,
        spaceAfter=10,
        textColor=colors.darkslategray
    )

    normal_style = styles["Normal"]
    
    # Severity Colors
    sev_colors = {
        "critical": colors.red,
        "high": colors.orangered,
        "medium": colors.orange,
        "low": colors.dodgerblue,
        "info": colors.dimgray
    }

    elements = []

    # Title & Metadata
    elements.append(Paragraph("ExploitronAI Vulnerability Report", title_style))
    elements.append(Paragraph(f"<b>Scan ID:</b> {html.escape(scan_id)}", normal_style))
    elements.append(Paragraph(f"<b>Target:</b> {html.escape(target_url)}", normal_style))
    elements.append(Paragraph(f"<b>Generated:</b> {datetime.utcnow().isoformat()}Z", normal_style))
    elements.append(Spacer(1, 20))

    # Summaries
    severity = _summary(sorted_findings)
    elements.append(Paragraph("Severity Summary", section_style))
    
    summary_data = [
        ["Severity", "Count"],
        ["Critical", severity["critical"]],
        ["High", severity["high"]],
        ["Medium", severity["medium"]],
        ["Low", severity["low"]],
        ["Info", severity["info"]]
    ]
    summary_table = Table(summary_data, colWidths=[100, 100])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 1, colors.silver),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 20))

    # Detailed Findings
    elements.append(Paragraph("Detailed Findings", section_style))
    
    if not sorted_findings:
        elements.append(Paragraph("No findings were discovered during this scan.", normal_style))
    
    for idx, finding in enumerate(sorted_findings, 1):
        sev = (finding.get("severity") or "info").lower()
        color = sev_colors.get(sev, colors.black)
        
        finding_title_style = ParagraphStyle(
            name=f"FindingTitle_{idx}",
            parent=styles["Heading3"],
            fontSize=12,
            spaceBefore=10,
            spaceAfter=5,
            textColor=color
        )
        
        title_text = f"{idx}. [{sev.upper()}] {html.escape(finding.get('title') or 'Unnamed Finding')}"
        elements.append(Paragraph(title_text, finding_title_style))
        
        details = [
            f"<b>Endpoint:</b> {html.escape(finding.get('endpoint') or target_url)}",
            f"<b>Tool:</b> {html.escape(finding.get('tool_source') or 'N/A')} | <b>OWASP:</b> {html.escape(finding.get('owasp_category') or 'N/A')}",
            f"<b>Description:</b> {html.escape(finding.get('description') or 'N/A')}",
            f"<b>Remediation:</b> {html.escape(finding.get('remediation') or 'N/A')}",
            f"<b>Verification:</b> {html.escape(finding.get('verification_steps') or 'N/A')}"
        ]
        
        for detail in details:
            elements.append(Paragraph(detail, normal_style))
            elements.append(Spacer(1, 4))
            
        elements.append(Spacer(1, 10))

    # Build PDF
    doc.build(elements)


def generate_report_artifacts(scan_id: str, target_url: str, findings: list[dict[str, Any]]) -> dict[str, str]:
    settings = get_settings()
    report_dir = os.path.join(settings.reports_dir, scan_id)
    os.makedirs(report_dir, exist_ok=True)
    report_metadata = {
        "Report Generated By": "ExploitronAI Advanced Assessment Platform",
        "Confidentiality": "Strictly Confidential - Authorized Personnel Only"
    }

    markdown = []
    markdown.append(f"# {target_url} - Security Assessment Report")
    markdown.append(f"**Date:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    markdown.append(f"**Scan ID:** `{scan_id}`")
    markdown.append("\n---\n")
    
    markdown.append("### Executive Summary")
    markdown.append("This report outlines the security posture of the target application as discovered by the ExploitronAI intelligence engine. It comprises both automated enumeration and AI-assisted vulnerability analysis.")
    markdown.append("\n---\n")

    json_payload = {
        "scan_id": scan_id,
        "target_url": target_url,
        "generated_at": f"{datetime.utcnow().isoformat()}Z",
        "severity_summary": _summary(findings),
        "owasp_summary": _owasp_summary(findings),
        "findings": findings,
    }

    json_path = os.path.join(report_dir, "report.json")
    html_path = os.path.join(report_dir, "report.html")
    pdf_path = os.path.join(report_dir, "report.pdf")

    with open(json_path, "w", encoding="utf-8") as handle:
        json.dump(json_payload, handle, indent=2)

    with open(html_path, "w", encoding="utf-8") as handle:
        handle.write(_build_html(scan_id, target_url, findings))

    try:
        _build_pdf(pdf_path, scan_id, target_url, findings)
    except Exception as exc:  # noqa: BLE001
        # Fallback: write a minimal one-page PDF so the artifact path still exists
        import traceback
        fallback_canvas = canvas.Canvas(pdf_path, pagesize=letter)
        fallback_canvas.setFont("Helvetica", 12)
        fallback_canvas.drawString(40, 750, "ExploitronAI Vulnerability Report")
        fallback_canvas.drawString(40, 730, f"Scan ID: {scan_id}")
        fallback_canvas.drawString(40, 710, f"Target: {target_url}")
        fallback_canvas.drawString(40, 690, "PDF generation encountered an error. See JSON/HTML report.")
        fallback_canvas.drawString(40, 670, f"Error: {str(exc)[:120]}")
        fallback_canvas.save()

    checksum = hashlib.sha256(json.dumps(json_payload, sort_keys=True).encode("utf-8")).hexdigest()
    return {"json_path": json_path, "html_path": html_path, "pdf_path": pdf_path, "checksum": checksum}

