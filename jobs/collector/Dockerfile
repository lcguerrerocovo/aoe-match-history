FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN ./node_modules/.bin/tsc

COPY migrations/ ./migrations/

USER node

CMD ["node", "dist/index.js"]
