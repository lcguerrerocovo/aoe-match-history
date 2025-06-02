FROM --platform=$BUILDPLATFORM node:20.11.1-alpine AS ui-builder

WORKDIR /app/ui
COPY ui/package*.json ./
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set strict-ssl false && \
    npm install --no-audit --no-fund --prefer-offline
COPY ui/ ./
RUN npm run build

FROM python:3.11-slim

# Install Node.js and npm
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install gsutil
RUN apt-get update && apt-get install -y \
    apt-transport-https \
    ca-certificates \
    gnupg \
    && echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list \
    && curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg add - \
    && apt-get update && apt-get install -y google-cloud-cli \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy application code
COPY . .

# Copy built React app to site directory
COPY --from=ui-builder /app/ui/dist /app/site

# Run the application
COPY entrypoint.sh /entrypoint.sh
COPY deploy_site.sh /app/deploy_site.sh
RUN chmod +x /entrypoint.sh /app/deploy_site.sh
CMD ["/bin/sh", "/entrypoint.sh"] 