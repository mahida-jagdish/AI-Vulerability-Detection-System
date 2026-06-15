from fastapi import APIRouter, Depends
from sqlalchemy import distinct, func, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.dependencies import get_db
from app.models import Finding, ScanJob, User
from app.schemas import DashboardStatsResponse, FindingSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> DashboardStatsResponse:
    total_scans = db.query(func.count(ScanJob.id)).scalar() or 0
    active_scans = (
        db.query(func.count(ScanJob.id))
        .filter(ScanJob.status.in_(["queued", "running", "analyzing"]))
        .scalar() or 0
    )
    total_targets = db.query(func.count(func.distinct(ScanJob.target_host))).scalar() or 0

    # Deduplicated finding count: count each unique (target_host, title, severity, parameter)
    # combination only ONCE, regardless of how many times the same URL was re-scanned.
    # A subquery selects one row per unique (target_host, title, severity, parameter) grouping,
    # then the outer query groups by severity and counts.
    dedup_subq = (
        select(
            ScanJob.target_host,
            Finding.title,
            Finding.severity,
            Finding.parameter,
        )
        .join(Finding, Finding.scan_id == ScanJob.id)
        .group_by(
            ScanJob.target_host,
            Finding.title,
            Finding.severity,
            Finding.parameter,
        )
        .subquery("dedup_findings")
    )

    severity_counts = (
        db.query(dedup_subq.c.severity, func.count())
        .group_by(dedup_subq.c.severity)
        .all()
    )

    summary = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for severity, count in severity_counts:
        sev = (severity or "info").lower()
        if sev in summary:
            summary[sev] += count
        else:
            summary["info"] += count

    return DashboardStatsResponse(
        total_scans=total_scans,
        active_scans=active_scans,
        total_targets=total_targets,
        finding_summary=FindingSummary(**summary),
    )
