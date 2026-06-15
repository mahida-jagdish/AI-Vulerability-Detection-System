from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_password_hash, verify_password
from app.config import get_settings
from app.dependencies import get_db
from app.models import User
from app.schemas import LoginRequest, TokenResponse
from app.services.audit import write_audit_log

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


class RegisterRequest(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if len(v) > 64:
            raise ValueError("Username too long")
        if not v.replace("_", "").replace("-", "").replace(".", "").isalnum():
            raise ValueError("Username can only contain letters, numbers, underscores, hyphens, dots")
        return v.lower()

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        write_audit_log(
            db,
            action="auth.login_failed",
            actor=None,
            details={"username": payload.username},
            ip_address=request.client.host if request.client else None,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(user.username)
    write_audit_log(
        db,
        action="auth.login_success",
        actor=user,
        details={"username": user.username},
        ip_address=request.client.host if request.client else None,
    )
    return TokenResponse(access_token=token, expires_in=settings.access_token_expire_seconds)


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
    user = User(
        username=payload.username,
        password_hash=get_password_hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    write_audit_log(
        db,
        action="auth.register",
        actor=user,
        details={"username": user.username},
        ip_address=request.client.host if request.client else None,
    )
    token = create_access_token(user.username)
    return TokenResponse(access_token=token, expires_in=settings.access_token_expire_seconds)
