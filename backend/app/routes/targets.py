from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.dependencies import get_db
from app.models import Finding, ScanJob, User
from app.schemas import TargetListItemResponse, FindingSummary

router = APIRouter(prefix="/targets", tags=["targets"])


@router.get("", response_model=list[TargetListItemResponse])
def get_targets(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[TargetListItemResponse]:
    # Group by target_host to get unique targets
    # For each, we want last_scanned, scan_count, and aggregated finding summary
    
    unique_hosts = db.query(ScanJob.target_host).distinct().all()
    results = []
    
    for (host,) in unique_hosts:
        scans = db.query(ScanJob).filter(ScanJob.target_host == host).all()
        scan_ids = [s.id for s in scans]
        
        last_scanned = max(s.created_at for s in scans)
        scan_count = len(scans)
        
        findings = db.query(Finding).filter(Finding.scan_id.in_(scan_ids)).all()
        summary = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
        
        # Deduplicate findings by title per target to get a more accurate attack surface overview
        seen_titles = set()
        for f in findings:
            if f.title not in seen_titles:
                sev = (f.severity or "info").lower()
                summary[sev] = summary.get(sev, 0) + 1
                seen_titles.add(f.title)
                
        results.append(
            TargetListItemResponse(
                target_host=host,
                last_scanned=last_scanned,
                scan_count=scan_count,
                finding_summary=FindingSummary(**summary)
            )
        )
        
    # Sort by descending severity priority
    results.sort(
        key=lambda x: (
            x.finding_summary.critical,
            x.finding_summary.high,
            x.finding_summary.medium,
            x.finding_summary.low
        ),
        reverse=True
    )
    return results
