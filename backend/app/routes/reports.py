import os

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.dependencies import get_db
from app.models import ReportArtifact, ScanJob, User
from app.services.audit import write_audit_log

router = APIRouter(prefix="/reports", tags=["reports"])


def _get_report(db: Session, scan_id: str) -> tuple[ScanJob, ReportArtifact]:
    scan = db.query(ScanJob).filter(ScanJob.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found")
    report = db.query(ReportArtifact).filter(ReportArtifact.scan_id == scan_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not generated")
    return scan, report


@router.get("/{scan_id}.json")
def get_json_report(
    scan_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FileResponse:
    scan, report = _get_report(db, scan_id)
    if not os.path.exists(report.json_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="JSON report file missing")
    write_audit_log(
        db,
        action="report.download_json",
        actor=user,
        scan_id=scan.id,
        ip_address=request.client.host if request.client else None,
        details={"path": report.json_path},
    )
    return FileResponse(report.json_path, media_type="application/json", filename=f"{scan_id}.json")


@router.get("/{scan_id}.pdf")
def get_pdf_report(
    scan_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FileResponse:
    scan, report = _get_report(db, scan_id)
    if not os.path.exists(report.pdf_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDF report file missing")
    write_audit_log(
        db,
        action="report.download_pdf",
        actor=user,
        scan_id=scan.id,
        ip_address=request.client.host if request.client else None,
        details={"path": report.pdf_path},
    )
    return FileResponse(report.pdf_path, media_type="application/pdf", filename=f"{scan_id}.pdf")

