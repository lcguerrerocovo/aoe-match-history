FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

COPY migrations/ ./migrations/

USER node

CMD ["node", "dist/index.js"]
