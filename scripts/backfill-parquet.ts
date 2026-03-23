#!/usr/bin/env npx tsx

/**
 * One-time script: Convert match_raw pg_dump to Parquet files in GCS.
 *
 * Prerequisites:
 *   1. Restore the dump to a temp table on the VM:
 *      pg_restore -h localhost -U collector -d aoe2_matches \
 *        --no-owner --data-only --table=match_raw \
 *        /path/to/match_raw_2026-03-23.dump
 *      (or create a temp table and COPY INTO it)
 *
 *   2. Run this script:
 *      DATABASE_URL=postgresql://collector:pass@localhost:5432/aoe2_matches \
 *      BUCKET=aoe2-site-backups \
 *      npx tsx scripts/backfill-parquet.ts
 *
 * Output: Parquet files partitioned by month in gs://BUCKET/raw-matches/backfill/
 */

import pg from 'pg';
import { ParquetSchema, ParquetWriter } from '@dsnp/parquetjs';
import { Storage } from '@google-cloud/storage';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const { Pool } = pg;

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

const BATCH_SIZE = 50000;

interface RawRow {
  match_id: string;
  raw_json: {
    id: number;
    startgametime: number;
    completiontime: number;
    matchtype_id: number;
    mapname: string;
    maxplayers: number;
    matchhistoryreportresults: Array<{ resulttype: number; teamid: number; profile_id: number }>;
    [key: string]: unknown;
  };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const bucket = process.env.BUCKET || 'aoe2-site-backups';
  if (!databaseUrl) throw new Error('DATABASE_URL required');

  const pool = new Pool({ connectionString: databaseUrl });
  const storage = new Storage();

  // Count total rows
  const countResult = await pool.query('SELECT COUNT(*) FROM match_raw');
  const total = parseInt(countResult.rows[0].count, 10);
  console.log(`Total rows to convert: ${total}`);

  let cursor = 0; // keyset pagination cursor (last match_id seen)
  let fileIndex = 0;
  let totalWritten = 0;

  while (true) {
    // Keyset pagination: O(1) per batch vs LIMIT/OFFSET which is O(n) at high offsets
    const result = await pool.query<RawRow>(
      'SELECT match_id, raw_json FROM match_raw WHERE match_id > $1 ORDER BY match_id LIMIT $2',
      [cursor, BATCH_SIZE],
    );

    if (result.rows.length === 0) break;

    const localPath = path.join(os.tmpdir(), `backfill-${fileIndex}.parquet`);
    const writer = await ParquetWriter.openFile(PARQUET_SCHEMA, localPath);

    for (const row of result.rows) {
      const raw = row.raw_json;
      const duration = raw.completiontime > 0 && raw.startgametime > 0
        ? raw.completiontime - raw.startgametime : null;

      await writer.appendRow({
        match_id: Number(row.match_id),
        map_id: null,
        map_name: raw.mapname || null,
        match_type_id: raw.matchtype_id ?? null,
        start_time: raw.startgametime > 0 ? new Date(raw.startgametime * 1000) : null,
        completion_time: raw.completiontime > 0 ? new Date(raw.completiontime * 1000) : null,
        duration,
        max_players: raw.maxplayers ?? null,
        player_count: raw.matchhistoryreportresults?.length ?? 0,
        winning_team: null,
        raw_json: JSON.stringify(raw),
      });
    }

    await writer.close();
    cursor = Number(result.rows[result.rows.length - 1].match_id);

    const stats = fs.statSync(localPath);
    const gcsPath = `raw-matches/backfill/part-${String(fileIndex).padStart(4, '0')}.parquet`;

    console.log(`Uploading ${gcsPath} (${result.rows.length} rows, ${(stats.size / 1024 / 1024).toFixed(1)}MB)`);

    await storage.bucket(bucket).upload(localPath, {
      destination: gcsPath,
      metadata: { contentType: 'application/x-parquet' },
    });

    fs.unlinkSync(localPath);
    totalWritten += result.rows.length;
    fileIndex++;

    console.log(`Progress: ${totalWritten}/${total} (${((totalWritten / total) * 100).toFixed(1)}%)`);
  }

  await pool.end();
  console.log(`Done. ${totalWritten} rows written to ${fileIndex} Parquet files in gs://${bucket}/raw-matches/backfill/`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
