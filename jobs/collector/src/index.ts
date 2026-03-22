import pino from "pino";
import { Database } from './db.js';
import { Collector } from './collector.js';

const logger = pino({ name: "match-collector" });

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  logger.info("Starting match collector");

  const db = new Database(databaseUrl);
  const collector = new Collector(db);

  try {
    await collector.run();
  } finally {
    await db.close();
  }

  logger.info("Match collector finished");
}

main().catch((err) => {
  logger.fatal(err, "Unhandled error in match collector");
  process.exit(1);
});
