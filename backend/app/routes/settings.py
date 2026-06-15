"""
Settings API route — manages runtime AI provider configuration.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.dependencies import get_db
from app.models import User
from app.services.ai_config import get_ai_config, save_ai_config

router = APIRouter()


class AISettingsPayload(BaseModel):
    provider: str = "ollama"    # ollama | openrouter | openai
    api_key: str = ""
    model: str = "llama3.1:8b"


class AISettingsResponse(BaseModel):
    provider: str
    api_key_set: bool
    model: str


@router.get("/settings/ai", response_model=AISettingsResponse)
def get_ai_settings(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    config = get_ai_config(db)
    return AISettingsResponse(
        provider=config["ai_provider"],
        api_key_set=bool(config.get("ai_api_key")),
        model=config["ai_model"],
    )


@router.post("/settings/ai", response_model=AISettingsResponse)
def update_ai_settings(
    payload: AISettingsPayload,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    save_ai_config(db, payload.provider, payload.api_key, payload.model)
    return AISettingsResponse(
        provider=payload.provider,
        api_key_set=bool(payload.api_key),
        model=payload.model,
    )
