# ExploitronAI: AI-Assisted Web Security Audit Platform

ExploitronAI is a college-project full-stack platform for **authorized** web vulnerability assessments.
It runs scanning workloads in a **Kali Linux Docker worker** and generates dashboard + JSON + PDF reports.

## Safety scope

- Non-destructive checks only.
- No automated exploit execution.
- No brute-force workflows.
- Use only on systems you own or have written permission to test.

## Stack

- Frontend: Next.js + Tailwind (`frontend`)
- API: FastAPI (`backend`)
- Queue: Celery + Redis
- Data: PostgreSQL
- AI analysis: Ollama local model
- Scanner runtime: Kali Docker worker (`worker`)

## Features

- Admin login and JWT auth.
- Scan request API and UI flow.
- Scope modes: `authorized` and `lab`.
- Concurrency control: one active scan.
- 20-minute task timeout (Celery).
- Findings normalization + deduplication.
- OWASP Top 10 category mapping per finding.
- Ollama enrichment for remediation/CWE/CVSS hints.
- Non-exploit reproducible verification steps for each finding.
- JSON/PDF report generation.
- Audit logs for auth, scan actions, and report downloads.

## Quick start

1. Copy env file:
```powershell
Copy-Item .env.example .env
```
2. Start services:
```powershell
docker compose up --build
```
3. Pull the Ollama model (first run):
```powershell
docker compose exec ollama ollama pull llama3.1:8b
```
4. Open:
- Frontend: `http://localhost:3000`
- API docs: `http://localhost:8000/docs`

Default admin credentials come from `.env`:
- Username: `admin`
- Password: `admin123`

## API endpoints

- `POST /api/v1/auth/login`
- `POST /api/v1/scans`
- `GET /api/v1/scans/{scan_id}`
- `GET /api/v1/scans/{scan_id}/findings`
- `POST /api/v1/scans/{scan_id}/cancel`
- `GET /api/v1/reports/{scan_id}.json`
- `GET /api/v1/reports/{scan_id}.pdf`

## Notes on tools in Kali worker

The worker executes safe checks. It attempts:
- security header checks
- TLS checks
- nmap safe script profile
- whatweb fingerprinting
- wafw00f detection
- ZAP baseline (if `zap-baseline.py` exists)
- nuclei (if installed)
- nikto (if installed)
- testssl (if installed)

If a tool is unavailable, the scan records an event and continues.
