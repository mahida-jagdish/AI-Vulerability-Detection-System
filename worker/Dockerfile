FROM kalilinux/kali-rolling

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    python3-pip \
    ca-certificates \
    curl \
    wget \
    nikto \
    nmap \
    whatweb \
    sqlmap \
    && (apt-get install -y --no-install-recommends wafw00f || true) \
    && (apt-get install -y --no-install-recommends subfinder || true) \
    && (apt-get install -y --no-install-recommends testssl.sh || true) \
    && rm -rf /var/lib/apt/lists/*

# Install dalfox - active XSS scanner (pre-built binary, no Go compiler needed)
RUN DALFOX_VERSION=$(curl -s https://api.github.com/repos/hahwul/dalfox/releases/latest | grep '"tag_name"' | sed -E 's/.*"v([^"]+)".*/\1/' 2>/dev/null || echo "2.10.4") \
    && wget -qO /tmp/dalfox.tar.gz "https://github.com/hahwul/dalfox/releases/download/v${DALFOX_VERSION}/dalfox_linux_amd64.tar.gz" \
    && tar -xzf /tmp/dalfox.tar.gz -C /usr/local/bin dalfox \
    && chmod +x /usr/local/bin/dalfox \
    && rm /tmp/dalfox.tar.gz \
    || echo "dalfox install failed, will be skipped during scans"

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY backend /app

CMD ["celery", "-A", "app.celery_app.celery_app", "worker", "--loglevel=info", "--concurrency=1"]
