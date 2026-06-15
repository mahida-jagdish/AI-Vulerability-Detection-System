from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl

Severity = Literal["critical", "high", "medium", "low", "info"]
ScanStatus = Literal["queued", "running", "analyzing", "completed", "failed", "timeout", "cancelled"]
ScopeMode = Literal["authorized", "lab"]


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class ScanCreateRequest(BaseModel):
    target_url: HttpUrl
    scope_mode: ScopeMode
    authorization_ack: bool
    advanced_mode: bool = False
    generate_poc: bool = False
    ai_instructions: str | None = None
    notes: str | None = None


class ScanCreateResponse(BaseModel):
    scan_id: str
    status: ScanStatus
    created_at: datetime


class EventResponse(BaseModel):
    timestamp: datetime
    stage: str
    message: str
    tool: str | None = None
    percent: int | None = None


class ScanDetailResponse(BaseModel):
    scan_id: str
    status: ScanStatus
    progress: int = Field(ge=0, le=100)
    advanced_mode: bool = False
    generate_poc: bool = False
    ai_instructions: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    events: list[EventResponse]


class FindingResponse(BaseModel):
    id: str
    title: str
    description: str
    severity: Severity
    confidence: str
    target: str
    endpoint: str | None = None
    parameter: str | None = None
    evidence: str | None = None
    tool_source: str
    raw_reference: str | None = None
    cwe_id: str | None = None
    cvss_score: float | None = None
    cvss_vector: str | None = None
    owasp_category: str | None = None
    remediation: str | None = None
    verification_steps: str | None = None
    poc_steps: str | None = None
    references: str | None = None


class FindingSummary(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0


class FindingsResponse(BaseModel):
    scan_id: str
    summary: FindingSummary
    findings: list[FindingResponse]


class CancelResponse(BaseModel):
    scan_id: str
    status: Literal["cancelled"]


class ScanListItemResponse(BaseModel):
    id: str
    target_url: str
    target_host: str
    status: ScanStatus
    progress: int
    created_at: datetime
    finished_at: datetime | None = None
    finding_summary: FindingSummary


class TargetListItemResponse(BaseModel):
    target_host: str
    last_scanned: datetime
    scan_count: int
    finding_summary: FindingSummary


class DashboardStatsResponse(BaseModel):
    total_scans: int
    active_scans: int
    total_targets: int
    finding_summary: FindingSummary
