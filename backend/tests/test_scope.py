import pytest
from fastapi import HTTPException

from app.services import scope


def test_authorized_mode_rejects_private_target(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(scope, "_resolve_host_ips", lambda host: ["127.0.0.1"])
    with pytest.raises(HTTPException):
        scope.normalize_and_validate_target("http://localhost:8080", "authorized", True)


def test_lab_mode_accepts_private_target(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(scope, "_resolve_host_ips", lambda host: ["192.168.1.2"])
    normalized, host, ips = scope.normalize_and_validate_target("http://lab.local", "lab", False)
    assert normalized.startswith("http://lab.local")
    assert host == "lab.local"
    assert ips == ["192.168.1.2"]

