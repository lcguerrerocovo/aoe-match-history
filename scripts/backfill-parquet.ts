#!/usr/bin/env npx tsx

/**
 * One-time script: Convert match_raw pg_dump to Parquet files in GCS.
 *
 * Reads directly from a pg_dump custom-format file using pg_restore to
 * stream COPY data — no database restore needed.
 *
 * Usage:
 *   # Download dump from GCS first:
 *   gsutil cp gs://aoe2-site-backups/pg/match_raw_2026-03-23.dump /tmp/match_raw.dump
 *
 *   # Run:
 *   BUCKET=aoe2-site-backups \
 *   npx tsx scripts/backfill-parquet.ts /tmp/match_raw.dump
 *
 * Output: Parquet files in gs://BUCKET/raw-matches/backfill/
 */

import { spawn } from 'child_process';
import * as readline from 'readline';
import { ParquetSchema, ParquetWriter } from '@dsnp/parquetjs';
import { Storage } from '@google-cloud/storage';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const PARQUET_SCHEMA = new ParquetSchema({
  match_id:        { type: 'INT64' },
  map_id:          { type: 'INT32', optional: true },
  map_name:        { type: 'UTF8', optional: true },
  match_type_id:   { type: 'INT32', optional: true },
  start_time:      { type: 'TIMESTAMP_MILLIS', optional: true },
  completion_time: { type: 'TIMESTAMP_MILLIS', optional: true },
  duration:        { type: 'INT32', optional: true },
  max_players:     { type: 'INT32', optional: true },
  player_count:    { type: 'INT32' },
  winning_team:    { type: 'INT32', optional: true },
  raw_json:        { type: 'UTF8' },
});

const ROWS_PER_FILE = 50000;

interface RawJson {
  id: number;
  startgametime: number;
  completiontime: number;
  matchtype_id: number;
  mapname: string;
  maxplayers: number;
  matchhistoryreportresults: Array<{ resulttype: number; teamid: number; profile_id: number }>;
  [key: string]: unknown;
}

async function main() {
  const dumpPath = process.argv[2];
  const bucket = process.env.BUCKET || 'aoe2-site-backups';

  if (!dumpPath) {
    console.error('Usage: npx tsx scripts/backfill-parquet.ts <dump-file>');
    process.exit(1);
  }

  if (!fs.existsSync(dumpPath)) {
    console.error(`Dump file not found: ${dumpPath}`);
    process.exit(1);
  }

  console.log(`Reading dump: ${dumpPath}`);
  console.log(`Target bucket: gs://${bucket}/raw-matches/backfill/`);

  const storage = new Storage();

  // Stream COPY data from pg_restore
  const pgRestore = spawn('pg_restore', ['--data-only', '-f', '-', dumpPath], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderrOutput = '';
  pgRestore.stderr.on('data', (chunk: Buffer) => {
    stderrOutput += chunk.toString();
  });

  const rl = readline.createInterface({ input: pgRestore.stdout });

  let inCopyBlock = false;
  let totalRows = 0;
  let batchRows: Array<{ matchId: number; raw: RawJson; rawStr: string }> = [];
  let fileIndex = 0;

  for await (const line of rl) {
    // Detect COPY block start
    if (line.startsWith('COPY ') && line.includes('match_raw')) {
      inCopyBlock = true;
      console.log('Found COPY block for match_raw');
      continue;
    }

    // End of COPY block
    if (inCopyBlock && line === '\\.') {
      inCopyBlock = false;
      // Flush remaining rows
      if (batchRows.length > 0) {
        await writeBatch(storage, bucket, batchRows, fileIndex);
        totalRows += batchRows.length;
        fileIndex++;
        batchRows = [];
      }
      break;
    }

    if (!inCopyBlock) continue;

    // Parse COPY line: match_id \t raw_json \t version \t created_at
    const tabIdx = line.indexOf('\t');
    if (tabIdx === -1) continue;

    const matchId = Number(line.substring(0, tabIdx));
    const rest = line.substring(tabIdx + 1);
    const secondTab = rest.indexOf('\t');
    const rawStr = secondTab === -1 ? rest : rest.substring(0, secondTab);

    try {
      const raw: RawJson = JSON.parse(rawStr);
      batchRows.push({ matchId, raw, rawStr });
    } catch {
      console.warn(`Skipping match_id ${matchId}: invalid JSON`);
      continue;
    }

    if (batchRows.length >= ROWS_PER_FILE) {
      await writeBatch(storage, bucket, batchRows, fileIndex);
      totalRows += batchRows.length;
      fileIndex++;
      console.log(`Progress: ${totalRows} rows written to ${fileIndex} files`);
      batchRows = [];
    }
  }

  // Wait for pg_restore to exit
  await new Promise<void>((resolve, reject) => {
    pgRestore.on('close', (code) => {
      if (code !== 0 && totalRows === 0) {
        reject(new Error(`pg_restore exited with code ${code}: ${stderrOutput}`));
      } else {
        resolve();
      }
    });
  });

  console.log(`Done. ${totalRows} rows written to ${fileIndex} Parquet files in gs://${bucket}/raw-matches/backfill/`);
}

async function writeBatch(
  storage: Storage,
  bucket: string,
  rows: Array<{ matchId: number; raw: RawJson; rawStr: string }>,
  fileIndex: number,
): Promise<void> {
  const localPath = path.join(os.tmpdir(), `backfill-${fileIndex}.parquet`);
  const writer = await ParquetWriter.openFile(PARQUET_SCHEMA, localPath);

  for (const { matchId, raw, rawStr } of rows) {
    const duration = raw.completiontime > 0 && raw.startgametime > 0
      ? raw.completiontime - raw.startgametime : null;

    await writer.appendRow({
      match_id: matchId,
      map_id: null,
      map_name: raw.mapname || null,
      match_type_id: raw.matchtype_id ?? null,
      start_time: raw.startgametime > 0 ? new Date(raw.startgametime * 1000) : null,
      completion_time: raw.completiontime > 0 ? new Date(raw.completiontime * 1000) : null,
      duration,
      max_players: raw.maxplayers ?? null,
      player_count: raw.matchhistoryreportresults?.length ?? 0,
      winning_team: null,
      raw_json: rawStr,
    });
  }

  await writer.close();

  const stats = fs.statSync(localPath);
  const gcsPath = `raw-matches/backfill/part-${String(fileIndex).padStart(4, '0')}.parquet`;

  console.log(`Uploading ${gcsPath} (${rows.length} rows, ${(stats.size / 1024 / 1024).toFixed(1)}MB)`);

  await storage.bucket(bucket).upload(localPath, {
    destination: gcsPath,
    metadata: { contentType: 'application/x-parquet' },
  });

  fs.unlinkSync(localPath);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
