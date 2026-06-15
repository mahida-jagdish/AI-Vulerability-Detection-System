from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.celery_app import celery_app
from app.config import get_settings
from app.dependencies import get_db
from app.models import Finding, ScanEvent, ScanJob, User
from app.schemas import (
    CancelResponse,
    EventResponse,
    FindingResponse,
    FindingsResponse,
    FindingSummary,
    ScanCreateRequest,
    ScanCreateResponse,
    ScanDetailResponse,
    ScanListItemResponse,
)
from app.services.audit import write_audit_log
from app.services.scope import normalize_and_validate_target
from app.tasks.scan_tasks import run_scan

router = APIRouter(prefix="/scans", tags=["scans"])
settings = get_settings()
ACTIVE_STATUSES = {"queued", "running", "analyzing"}


@router.post("", response_model=ScanCreateResponse)
def create_scan(
    payload: ScanCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ScanCreateResponse:
    active = db.query(func.count(ScanJob.id)).filter(ScanJob.status.in_(ACTIVE_STATUSES)).scalar() or 0
    if active >= settings.max_active_scans:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Only {settings.max_active_scans} active scan is allowed at a time",
        )
    normalized_url, host, resolved_ips = normalize_and_validate_target(
        str(payload.target_url), payload.scope_mode, payload.authorization_ack
    )
    scan = ScanJob(
        target_url=normalized_url,
        target_host=host,
        scope_mode=payload.scope_mode,
        authorization_ack=payload.authorization_ack,
        advanced_mode=payload.advanced_mode,
        generate_poc=payload.generate_poc,
        ai_instructions=payload.ai_instructions,
        notes=payload.notes,
        status="queued",
        progress=0,
        requested_by_user_id=user.id,
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    result = run_scan.delay(scan.id)
    scan.celery_task_id = result.id
    db.commit()

    db.add(ScanEvent(scan_id=scan.id, stage="queued", message="Scan job queued.", tool="queue", percent=0))
    db.commit()

    write_audit_log(
        db,
        action="scan.created",
        actor=user,
        scan_id=scan.id,
        ip_address=request.client.host if request.client else None,
        details={
            "target_url": normalized_url,
            "scope_mode": payload.scope_mode,
            "resolved_ips": resolved_ips,
        },
    )
    return ScanCreateResponse(scan_id=scan.id, status=scan.status, created_at=scan.created_at)


@router.get("", response_model=list[ScanListItemResponse])
def list_scans(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ScanListItemResponse]:
    scans = db.query(ScanJob).order_by(ScanJob.created_at.desc()).all()
    
    results = []
    for scan in scans:
        summary = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
        for f in scan.findings:
            sev = (f.severity or "info").lower()
            summary[sev] = summary.get(sev, 0) + 1
            
        results.append(
            ScanListItemResponse(
                id=scan.id,
                target_url=scan.target_url,
                target_host=scan.target_host,
                status=scan.status,
                progress=scan.progress,
                created_at=scan.created_at,
                finished_at=scan.finished_at,
                finding_summary=FindingSummary(**summary),
            )
        )
    return results


@router.get("/{scan_id}", response_model=ScanDetailResponse)
def get_scan(
    scan_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ScanDetailResponse:
    scan = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")
    events = (
        db.query(ScanEvent)
        .filter(ScanEvent.scan_id == scan_id)
        .order_by(ScanEvent.timestamp.asc(), ScanEvent.id.asc())
        .all()
    )
    return ScanDetailResponse(
        scan_id=scan.id,
        status=scan.status,
        progress=scan.progress,
        started_at=scan.started_at,
        finished_at=scan.finished_at,
        events=[
            EventResponse(
                timestamp=e.timestamp,
                stage=e.stage,
                message=e.message,
                tool=e.tool,
                percent=e.percent,
            )
            for e in events
        ],
    )


@router.get("/{scan_id}/findings", response_model=FindingsResponse)
def get_findings(
    scan_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> FindingsResponse:
    scan = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")
    rows = db.query(Finding).filter(Finding.scan_id == scan_id).all()
    summary = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for row in rows:
        sev = (row.severity or "info").lower()
        summary[sev] = summary.get(sev, 0) + 1

    return FindingsResponse(
        scan_id=scan_id,
        summary=FindingSummary(**summary),
        findings=[
            FindingResponse(
                id=f.id,
                title=f.title,
                description=f.description,
                severity=f.severity,
                confidence=f.confidence,
                target=f.target,
                endpoint=f.endpoint,
                parameter=f.parameter,
                evidence=f.evidence,
                tool_source=f.tool_source,
                raw_reference=f.raw_reference,
                cwe_id=f.cwe_id,
                cvss_score=f.cvss_score,
                cvss_vector=f.cvss_vector,
                owasp_category=f.owasp_category,
                remediation=f.remediation,
                verification_steps=f.verification_steps,
                poc_steps=f.poc_steps,
                references=f.references,
            )
            for f in rows
        ],
    )


@router.post("/{scan_id}/cancel", response_model=CancelResponse)
def cancel_scan(
    scan_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CancelResponse:
    scan = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")
    if scan.status in {"completed", "failed", "timeout", "cancelled"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Scan is already terminal")
    scan.status = "cancelled"
    scan.finished_at = scan.finished_at or datetime.utcnow()
    db.add(ScanEvent(scan_id=scan.id, stage="cancelled", message="Scan cancelled by admin.", tool="queue", percent=scan.progress))
    db.commit()
    if scan.celery_task_id:
        celery_app.control.revoke(scan.celery_task_id, terminate=True, signal="SIGTERM")
    write_audit_log(
        db,
        action="scan.cancelled",
        actor=user,
        scan_id=scan.id,
        ip_address=request.client.host if request.client else None,
        details={"reason": "manual cancel"},
    )
    return CancelResponse(scan_id=scan.id, status="cancelled")
