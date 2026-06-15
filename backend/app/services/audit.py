import json
from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog, User


def write_audit_log(
    db: Session,
    action: str,
    actor: User | None = None,
    scan_id: str | None = None,
    ip_address: str | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    row = AuditLog(
        actor_user_id=actor.id if actor else None,
        action=action,
        scan_id=scan_id,
        details=json.dumps(details or {}),
        ip_address=ip_address,
    )
    db.add(row)
    db.commit()

