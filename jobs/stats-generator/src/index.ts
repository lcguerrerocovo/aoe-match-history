import pino from 'pino';
import { generateStats } from './stats.js';

const log = pino({ name: 'stats-generator' });

async function main(): Promise<void> {
  log.info('Starting stats generator');
  await generateStats();
  log.info('Stats generator complete');
}

main().catch((err) => {
  log.fatal(err, 'Unhandled error in stats generator');
  process.exit(1);
});
