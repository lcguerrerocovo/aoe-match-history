import pino from "pino";
import { Database } from './db.js';
import { Collector } from './collector.js';
import { updateSearchIndex } from './searchIndexUpdater.js';

const logger = pino({ name: "match-collector" });

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const archiveBucket = process.env.RAW_ARCHIVE_BUCKET || 'aoe2-site-backups';

  logger.info({ archiveBucket }, "Starting match collector");

  const db = new Database(databaseUrl);
  const collector = new Collector(db, archiveBucket);

  let processedProfiles: number[] = [];
  try {
    processedProfiles = await collector.run();
  } finally {
    // Best-effort PG -> Meilisearch incremental update (Issue #2). Runs before
    // db.close() since it needs PG; never throws (a Meilisearch outage must not
    // break match ingestion).
    if (processedProfiles.length > 0) {
      await updateSearchIndex(db, processedProfiles, logger.child({ module: 'searchIndexUpdater' }));
    }
    try {
      await db.close();
    } catch {
      // DB may never have connected
    }
  }

  logger.info("Match collector finished");
}

main().catch((err) => {
  logger.fatal(err, "Unhandled error in match collector");
  process.exit(1);
});
