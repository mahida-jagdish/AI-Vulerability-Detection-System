import logging
from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

_INSECURE_JWT_SECRET = "change-me-in-env"  # noqa: S105


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    app_name: str = "ExploitronAI"
    environment: str = "dev"
    database_url: str = "postgresql+psycopg://postgres:postgres@postgres:5432/exploitronai"
    redis_url: str = "redis://redis:6379/0"
    jwt_secret: str = "change-me-in-env"
    jwt_algorithm: str = "HS256"
    access_token_expire_seconds: int = 3600
    admin_username: str = "admin"
    admin_password: str = "admin123"
    reports_dir: str = "/app/reports"
    scan_timeout_minutes: int = 20
    max_active_scans: int = 1
    allowed_authorized_domains: str = "*"
    lab_allowed_cidrs: str = "127.0.0.0/8,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,::1/128"
    ollama_base_url: str = "http://ollama:11434"
    ollama_model: str = "llama3.1:8b"
    cors_allow_origins: str = "http://localhost:3000"
    scope_default_mode: Literal["authorized", "lab"] = "authorized"

    def allowed_domains_list(self) -> list[str]:
        if self.allowed_authorized_domains.strip() == "*":
            return ["*"]
        return [d.strip().lower() for d in self.allowed_authorized_domains.split(",") if d.strip()]

    def lab_cidr_list(self) -> list[str]:
        return [c.strip() for c in self.lab_allowed_cidrs.split(",") if c.strip()]

    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]

    @model_validator(mode="after")
    def _warn_insecure_defaults(self) -> "Settings":
        if self.jwt_secret == _INSECURE_JWT_SECRET:
            if self.environment not in {"dev", "development", "test"}:
                raise ValueError(
                    "JWT_SECRET is set to the insecure default value. "
                    "Set a strong secret in your .env file before running in production."
                )
            logger.warning(
                "⚠️  JWT_SECRET is the insecure default. This is fine for development "
                "but MUST be changed before production deployment."
            )
        if self.admin_password == "admin123" and self.environment not in {"dev", "development", "test"}:  # noqa: S105
            logger.warning(
                "⚠️  ADMIN_PASSWORD is still the default 'admin123'. Change it before production deployment."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
