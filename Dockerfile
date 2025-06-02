# === Stage 1: UI Builder ===
FROM --platform=linux/amd64 node:20.11.1-slim AS ui-builder

WORKDIR /app/ui

RUN apt-get update && apt-get install -y libc6 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY ui/package*.json ./
RUN rm -f package-lock.json && \
    npm install --legacy-peer-deps --registry=https://registry.npmjs.org/ --no-audit --no-fund

COPY ui/ ./
RUN npm run build


# === Stage 2: Python 3.11-slim + gsutil (no venv) ===
FROM python:3.11-slim

WORKDIR /app

# 1) Install Cloud SDK (gcloud + gsutil)
RUN apt-get update && \
    apt-get install -y curl apt-transport-https ca-certificates gnupg && \
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" \
      | tee /etc/apt/sources.list.d/google-cloud-sdk.list && \
    curl -s https://packages.cloud.google.com/apt/doc/apt-key.gpg \
      | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg && \
    apt-get update && \
    apt-get install -y google-cloud-cli && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# 2) Install Python dependencies globally
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3) Copy application code + built UI assets
COPY . .
COPY --from=ui-builder /app/ui/dist /app/site

# 4) Copy + chmod the entrypoint/deploy scripts
COPY entrypoint.sh /entrypoint.sh
COPY deploy_site.sh /app/deploy_site.sh
RUN chmod +x /entrypoint.sh /app/deploy_site.sh

# 5) Cleanup apt caches (just in case)
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# 6) Launch entrypoint
CMD ["/bin/sh", "/entrypoint.sh"]