import os

from sqlalchemy.orm import Session

from app.auth import get_password_hash
from app.config import get_settings
from app.models import User


def ensure_reports_dir() -> None:
    settings = get_settings()
    os.makedirs(settings.reports_dir, exist_ok=True)


def ensure_admin_user(db: Session) -> None:
    settings = get_settings()
    existing = db.query(User).filter(User.username == settings.admin_username).first()
    if existing:
        return
    admin = User(username=settings.admin_username, password_hash=get_password_hash(settings.admin_password))
    db.add(admin)
    db.commit()

