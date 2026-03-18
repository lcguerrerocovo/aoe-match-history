import dotenv from 'dotenv';
dotenv.config();
import pino from 'pino';
import { Firestore } from '@google-cloud/firestore';

export const STEAM_API_KEY = process.env.STEAM_API_KEY;
export const RELIC_AUTH_STEAM_USER = process.env.RELIC_AUTH_STEAM_USER;
export const RELIC_AUTH_STEAM_PASS = process.env.RELIC_AUTH_STEAM_PASS;

// Meilisearch configuration
export const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST;
export const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY;

// Ensure MEILISEARCH_HOST has protocol
export const MEILISEARCH_URL = MEILISEARCH_HOST && !MEILISEARCH_HOST.startsWith('http')
  ? `http://${MEILISEARCH_HOST}`
  : MEILISEARCH_HOST || 'http://localhost:7700'; // fallback for development

// Endpoint of Python APM function (HTTP trigger)
export const APM_API_URL = process.env.APM_API_URL || process.env.APM_FN_URL || 'https://us-central1-aoe2-site.cloudfunctions.net/aoe2-apm-processor';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined
});

export const log = logger.child({ module: 'Proxy' });

// Log environment info
log.info({
  NODE_ENV: process.env.NODE_ENV,
  MEILISEARCH_HOST,
  MEILISEARCH_URL,
  MEILISEARCH_HOST_TYPE: typeof MEILISEARCH_HOST,
  MEILISEARCH_URL_TYPE: typeof MEILISEARCH_URL,
  FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST
}, 'Environment configuration');

// Duration of artificial latency in milliseconds (set via env or default 1500ms)
export const SIMULATE_LATENCY_MS = process.env.SIMULATE_LATENCY_MS ? parseInt(process.env.SIMULATE_LATENCY_MS, 10) : 1500;

// Initialize Firestore client
let firestoreDb: Firestore | null = null;

export function getFirestoreClient(): Firestore {
  if (!firestoreDb) {
    firestoreDb = new Firestore();
    log.info('Firestore client initialized with default credentials');
  }
  return firestoreDb;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
