FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install required base dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    nmap \
    sqlmap \
    wget \
    && (apt-get install -y --no-install-recommends ruby-full || true) \
    && rm -rf /var/lib/apt/lists/*

# Install optional tools (failures are non-fatal)
RUN gem install wpscan 2>/dev/null || true

# Install ffuf (optional)
RUN curl -sL https://github.com/ffuf/ffuf/releases/download/v2.1.0/ffuf_2.1.0_linux_amd64.tar.gz \
    | tar xz -C /usr/local/bin ffuf 2>/dev/null || true

# Install hakrawler (optional)
RUN curl -sL https://github.com/hakluke/hakrawler/releases/download/v2.0/hakrawler_linux_amd64 \
    -o /usr/local/bin/hakrawler 2>/dev/null && chmod +x /usr/local/bin/hakrawler || true

# Install trufflehog (optional)
RUN curl -sL https://github.com/trufflesecurity/trufflehog/releases/download/v3.70.2/trufflehog_3.70.2_linux_amd64.tar.gz \
    | tar xz -C /usr/local/bin trufflehog 2>/dev/null || true

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY backend /app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
