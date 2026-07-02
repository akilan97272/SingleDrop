# ══════════════════════════════════════════════
#  Stage 1 — Build the frontend
# ══════════════════════════════════════════════
FROM node:20-alpine AS frontend

WORKDIR /build

# Install dependencies first (layer-cached unless package.json changes)
COPY SingleDrop-dev/package*.json ./
RUN npm install

# Copy source and build
COPY SingleDrop-dev/ ./
RUN npm run build


# ══════════════════════════════════════════════
#  Stage 2 — Python / FastAPI backend
# ══════════════════════════════════════════════
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY app/ ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]