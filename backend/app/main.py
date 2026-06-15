import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine, SessionLocal
from app.routes.auth import router as auth_router
from app.routes.dashboard import router as dashboard_router
from app.routes.reports import router as reports_router
from app.routes.scans import router as scans_router
from app.routes.settings import router as settings_router
from app.routes.targets import router as targets_router
from app.services.init_admin import ensure_admin_user, ensure_reports_dir
from app.services.schema_patch import ensure_runtime_schema

logger = logging.getLogger(__name__)
settings = get_settings()

app = FastAPI(title=settings.app_name, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    if settings.jwt_secret == "change-me-in-env":  # noqa: S105
        logger.warning("⚠️  SECURITY: JWT_SECRET is still the insecure default. Set JWT_SECRET in .env!")
    if settings.admin_password == "admin123":  # noqa: S105
        logger.warning("⚠️  SECURITY: ADMIN_PASSWORD is still 'admin123'. Change it in .env!")
    Base.metadata.create_all(bind=engine)
    ensure_runtime_schema(engine)
    ensure_reports_dir()

    db = SessionLocal()
    try:
        ensure_admin_user(db)
    finally:
        db.close()


@app.get("/healthz")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
app.include_router(scans_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")
app.include_router(targets_router, prefix="/api/v1")
