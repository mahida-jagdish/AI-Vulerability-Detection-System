"""
AI provider settings helper.

Reads AI provider configuration from the app_settings DB table with
fallback to environment variables / config.

Supported providers:
  - ollama  (local, no key)
  - openrouter  (https://openrouter.ai)
  - openai  (https://api.openai.com)
"""
from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models import AppSetting


AI_PROVIDER_KEY = "ai_provider"        # ollama | openrouter | openai
AI_API_KEY_KEY = "ai_api_key"          # API key (empty for ollama)
AI_MODEL_KEY = "ai_model"              # model name


DEFAULTS = {
    AI_PROVIDER_KEY: "ollama",
    AI_API_KEY_KEY: "",
    AI_MODEL_KEY: "llama3.1:8b",
}


def get_ai_config(db: Session) -> dict[str, str]:
    """Return AI provider config dict from the DB (or defaults)."""
    rows = db.query(AppSetting).filter(
        AppSetting.key.in_([AI_PROVIDER_KEY, AI_API_KEY_KEY, AI_MODEL_KEY])
    ).all()
    config = dict(DEFAULTS)
    for row in rows:
        if row.value is not None:
            config[row.key] = row.value
    return config


def save_ai_config(db: Session, provider: str, api_key: str, model: str) -> None:
    """Persist AI provider config to the DB."""
    for key, value in [
        (AI_PROVIDER_KEY, provider),
        (AI_API_KEY_KEY, api_key),
        (AI_MODEL_KEY, model),
    ]:
        row = db.query(AppSetting).filter(AppSetting.key == key).first()
        if row:
            row.value = value
        else:
            db.add(AppSetting(key=key, value=value))
    db.commit()


def get_ai_config_no_db() -> dict[str, str]:
    """Return AI config from env/settings (for use in worker tasks without DB access)."""
    from app.config import get_settings
    s = get_settings()
    return {
        AI_PROVIDER_KEY: "ollama",
        AI_API_KEY_KEY: "",
        AI_MODEL_KEY: s.ollama_model,
    }
