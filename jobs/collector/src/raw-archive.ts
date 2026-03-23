import { ParquetSchema, ParquetWriter } from '@dsnp/parquetjs';
import { Storage } from '@google-cloud/storage';
import pino from 'pino';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const log = pino({ name: 'raw-archive' });

interface ArchiveRow {
  match_id: number;
  map_id: number | null;
  map_name: string | null;
  match_type_id: number | null;
  start_time: Date | null;
  completion_time: Date | null;
  duration: number | null;
  max_players: number | null;
  player_count: number;
  winning_team: number | null;
  raw_json: string;
}

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

export class RawArchive {
  private bucket: string;
  private prefix: string;
  private rows: ArchiveRow[] = [];
  private runTimestamp: string;

  constructor(bucket: string, prefix = 'raw-matches') {
    this.bucket = bucket;
    this.prefix = prefix;
    this.runTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  }

  append(row: ArchiveRow): void {
    this.rows.push(row);
  }

  get rowCount(): number {
    return this.rows.length;
  }

  async finalize(): Promise<void> {
    if (this.rows.length === 0) {
      log.info('No rows to archive, skipping Parquet write');
      return;
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const localPath = path.join(os.tmpdir(), `raw-matches-${this.runTimestamp}.parquet`);
    const gcsPath = `${this.prefix}/${today}/run-${this.runTimestamp}.parquet`;

    try {
      // Write Parquet file locally
      log.info({ rowCount: this.rows.length, localPath }, 'Writing Parquet file');
      const writer = await ParquetWriter.openFile(PARQUET_SCHEMA, localPath);
      for (const row of this.rows) {
        await writer.appendRow(row as unknown as Record<string, unknown>);
      }
      await writer.close();

      const stats = fs.statSync(localPath);
      log.info({ sizeBytes: stats.size, sizeMB: (stats.size / 1024 / 1024).toFixed(1) }, 'Parquet file written');

      // Upload to GCS
      log.info({ bucket: this.bucket, gcsPath }, 'Uploading to GCS');
      const storage = new Storage();
      await storage.bucket(this.bucket).upload(localPath, {
        destination: gcsPath,
        metadata: {
          contentType: 'application/x-parquet',
          metadata: {
            matchCount: String(this.rows.length),
            collectorRun: this.runTimestamp,
          },
        },
      });
      log.info({ bucket: this.bucket, gcsPath, rows: this.rows.length }, 'Archive uploaded to GCS');
    } catch (err) {
      log.error({ err: (err as Error).message }, 'Failed to write/upload Parquet archive — continuing without archive');
    } finally {
      // Clean up local file
      try {
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      } catch { /* ignore cleanup errors */ }
      // Free memory
      this.rows = [];
    }
  }
}
