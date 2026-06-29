# KosherPlay Selenium service — Python + headless Chromium.
# Deploy on any container host (Render / Railway / Fly.io). Run a SINGLE worker
# so the persistent browser session + global lock behave as designed.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    CHROME_BIN=/usr/bin/chromium \
    CHROMEDRIVER=/usr/bin/chromedriver \
    PORT=8000

# Chromium + matching driver from Debian, plus fonts (incl. Hebrew rendering).
RUN apt-get update && apt-get install -y --no-install-recommends \
        chromium chromium-driver \
        fonts-liberation fonts-dejavu-core ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .

EXPOSE 8000
# One worker (persistent browser), a few threads, long timeout (CRM ops are slow).
CMD ["sh", "-c", "gunicorn --workers 1 --threads 4 --timeout 180 --bind 0.0.0.0:${PORT} app:app"]
