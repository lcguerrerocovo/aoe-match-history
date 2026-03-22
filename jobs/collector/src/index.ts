import pino from "pino";

const logger = pino({ name: "match-collector" });

async function main(): Promise<void> {
  logger.info("Starting match collector");

  // TODO: Initialize API client (Relic API)
  // TODO: Initialize database connection (PostgreSQL)
  // TODO: Run collection logic

  logger.info("Match collector finished");
}

main().catch((err) => {
  logger.fatal(err, "Unhandled error in match collector");
  process.exit(1);
});
