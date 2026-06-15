from datetime import datetime

from celery import states
from celery.exceptions import SoftTimeLimitExceeded
from sqlalchemy.orm import Session

from app.celery_app import celery_app
from app.database import SessionLocal
from app.models import AuditLog, Finding, ReportArtifact, ScanEvent, ScanJob
from app.services.ai import enrich_findings_with_ollama
from app.services.ai_config import get_ai_config
from app.services.dedup import deduplicate_findings
from app.services.reporting import generate_report_artifacts
from app.services.scanner import run_safe_scan


def _event(
    scan_id: str,
    stage: str,
    message: str,
    tool: str | None = None,
    percent: int | None = None,
) -> None:
    """Write a scan event using its own short-lived, isolated DB session.

    CRITICAL: This function must NOT share a session with any other thread.
    When scanner tools run in parallel (via ThreadPoolExecutor), each thread
    calls this function. They all need independent sessions so a DB error in
    one thread does not roll back another thread's writes.
    """
    db = SessionLocal()
    try:
        db.add(
            ScanEvent(
                scan_id=scan_id,
                stage=stage,
                message=message,
                tool=tool,
                percent=percent,
            )
        )
        db.commit()
    except Exception:  # noqa: BLE001
        db.rollback()
    finally:
        db.close()


def _update_status(
    db: Session,
    job: ScanJob,
    status: str,
    progress: int | None = None,
    error: str | None = None,
) -> None:
    previous_status = job.status
    job.status = status
    if progress is not None:
        job.progress = progress
    if error:
        job.error_message = error
    if status == "running" and not job.started_at:
        job.started_at = datetime.utcnow()
    if status in {"completed", "failed", "timeout", "cancelled"}:
        job.finished_at = datetime.utcnow()
    db.add(
        AuditLog(
            actor_user_id=None,
            action="scan.status_changed",
            scan_id=job.id,
            details=f'{{"from":"{previous_status}","to":"{status}","progress":{job.progress}}}',
        )
    )
    db.commit()


@celery_app.task(name="app.tasks.scan_tasks.run_scan", bind=True)
def run_scan(self, scan_id: str) -> str:
    db = SessionLocal()
    try:
        job = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
        if not job:
            self.update_state(state=states.FAILURE, meta={"error": "Scan job not found"})
            return "missing"
        if job.status == "cancelled":
            return "cancelled"

        _update_status(db, job, "running", 5)
        _event(scan_id, "start", "Scan worker accepted job.", "worker", 5)

        # Pass a thread-safe event logger — each call opens+closes its own session
        def thread_safe_event_log(stage: str, message: str, tool: str | None, percent: int | None) -> None:
            _event(scan_id, stage, message, tool, percent)

        findings = run_safe_scan(
            job.target_url,
            event_log=thread_safe_event_log,
            advanced_mode=job.advanced_mode,
        )

        # Refresh job from DB since worker threads may have progressed time
        db.expire(job)
        job = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
        if job and job.status == "cancelled":
            return "cancelled"

        _update_status(db, job, "analyzing", 85)
        _event(scan_id, "analyzing", "Enriching findings and generating PoC steps with AI model.", "ollama", 90)

        findings = deduplicate_findings(findings)

        # Load AI provider config from DB (user-configurable: Ollama / OpenRouter / OpenAI)
        ai_config = get_ai_config(db)
        if job.generate_poc:
            findings = enrich_findings_with_ollama(findings, ai_config=ai_config, ai_instructions=job.ai_instructions)
        else:
            _event(scan_id, "analyzing", "Skipping AI PoC enrichment based on scan settings.", "system", 92)

        db.query(Finding).filter(Finding.scan_id == job.id).delete()
        db.commit()
        for finding in findings:
            db.add(
                Finding(
                    scan_id=job.id,
                    title=finding.get("title", "Unnamed finding"),
                    description=finding.get("description", ""),
                    severity=finding.get("severity", "info"),
                    confidence=finding.get("confidence", "medium"),
                    target=finding.get("target", job.target_url),
                    endpoint=finding.get("endpoint"),
                    parameter=finding.get("parameter"),
                    evidence=finding.get("evidence"),
                    tool_source=finding.get("tool_source", "unknown"),
                    raw_reference=finding.get("raw_reference"),
                    cwe_id=finding.get("cwe_id"),
                    cvss_score=finding.get("cvss_score"),
                    cvss_vector=finding.get("cvss_vector"),
                    owasp_category=finding.get("owasp_category"),
                    remediation=finding.get("remediation"),
                    verification_steps=finding.get("verification_steps"),
                    poc_steps=finding.get("poc_steps"),
                    references=finding.get("references"),
                )
            )
        db.commit()

        _event(scan_id, "report", "Generating JSON, HTML, and PDF report artifacts.", "reporting", 95)
        try:
            paths = generate_report_artifacts(job.id, job.target_url, findings)
            report = db.query(ReportArtifact).filter(ReportArtifact.scan_id == job.id).first()
            if not report:
                report = ReportArtifact(scan_id=job.id, **paths)
                db.add(report)
            else:
                report.json_path = paths["json_path"]
                report.html_path = paths["html_path"]
                report.pdf_path = paths["pdf_path"]
                report.checksum = paths["checksum"]
            db.commit()
        except Exception as report_exc:  # noqa: BLE001
            _event(scan_id, "report", f"Report generation warning: {report_exc}", "reporting", 97)

        _event(scan_id, "complete", "Scan and report generation completed.", "worker", 100)
        _update_status(db, job, "completed", 100)
        return "completed"

    except SoftTimeLimitExceeded:
        try:
            job = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
        except Exception:  # noqa: BLE001
            db.close()
            db = SessionLocal()
            job = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
        if job:
            _event(scan_id, "timeout", "Scan exceeded time limit and was stopped.", "worker", job.progress)
            _update_status(db, job, "timeout", job.progress, error="Scan timeout reached")
        return "timeout"

    except Exception as exc:  # noqa: BLE001
        try:
            job = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
            if job:
                if job.status == "cancelled":
                    return "cancelled"
                _event(scan_id, "error", f"Scan failed: {exc}", "worker", job.progress)
                _update_status(db, job, "failed", job.progress, error=str(exc))
        except Exception:  # noqa: BLE001
            pass
        raise

    finally:
        db.close()
