import ipaddress
import socket
from urllib.parse import urlparse, urlunparse

from fastapi import HTTPException, status

from app.config import get_settings

BLOCKED_IPS = {
    "169.254.169.254",  # AWS metadata
    "169.254.170.2",  # ECS metadata
    "100.100.100.200",  # Alibaba metadata
}
BLOCKED_HOSTNAMES = {"metadata.google.internal", "metadata"}


def _resolve_host_ips(hostname: str) -> list[str]:
    try:
        results = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to resolve target host") from exc
    ips: set[str] = set()
    for item in results:
        ip = item[4][0]
        ips.add(ip)
    return sorted(ips)


def _is_private_or_loopback(ip: str) -> bool:
    addr = ipaddress.ip_address(ip)
    return addr.is_private or addr.is_loopback or addr.is_link_local


def _host_matches_allowed(host: str, allowed_domains: list[str]) -> bool:
    if "*" in allowed_domains:
        return True
    host = host.lower()
    for domain in allowed_domains:
        if host == domain or host.endswith(f".{domain}"):
            return True
    return False


def normalize_and_validate_target(target_url: str, scope_mode: str, authorization_ack: bool) -> tuple[str, str, list[str]]:
    settings = get_settings()
    parsed = urlparse(target_url.strip())
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only http and https schemes are allowed")
    if not parsed.hostname:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target URL must include a hostname")
    host = parsed.hostname.lower()
    if host in BLOCKED_HOSTNAMES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target hostname is blocked by policy")

    normalized_url = urlunparse((parsed.scheme, parsed.netloc, parsed.path or "/", parsed.params, parsed.query, ""))
    resolved_ips = _resolve_host_ips(host)
    if any(ip in BLOCKED_IPS for ip in resolved_ips):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target IP is blocked by policy")

    if scope_mode == "authorized":
        if not authorization_ack:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Authorization acknowledgement is required for authorized scope scans",
            )
        allowed_domains = settings.allowed_domains_list()
        if not _host_matches_allowed(host, allowed_domains):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Target domain is not in allowlist")
        if any(_is_private_or_loopback(ip) for ip in resolved_ips):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Private/internal addresses are not allowed in authorized mode",
            )
    elif scope_mode == "lab":
        if not resolved_ips or not all(_is_private_or_loopback(ip) for ip in resolved_ips):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lab mode accepts only private/loopback targets",
            )
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid scope mode")

    return normalized_url, host, resolved_ips
