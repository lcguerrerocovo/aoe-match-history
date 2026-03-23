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

const FLUSH_THRESHOLD = 10000;

export class RawArchive {
  private bucket: string;
  private prefix: string;
  private storage: Storage;
  private rows: ArchiveRow[] = [];
  private runTimestamp: string;
  private partIndex = 0;
  private totalRows = 0;
  private flushLock: Promise<void> = Promise.resolve();

  constructor(bucket: string, prefix = 'raw-matches') {
    this.bucket = bucket;
    this.prefix = prefix;
    this.storage = new Storage();
    this.runTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  }

  async append(row: ArchiveRow): Promise<void> {
    this.rows.push(row);
    if (this.rows.length >= FLUSH_THRESHOLD) {
      // Serialize flushes — concurrent workers may trigger simultaneously
      this.flushLock = this.flushLock.then(() => this.flush());
      await this.flushLock;
    }
  }

  get rowCount(): number {
    return this.totalRows + this.rows.length;
  }

  private async flush(): Promise<void> {
    if (this.rows.length === 0) return;

    // Snapshot and clear — allows workers to keep appending during write/upload
    const batch = this.rows;
    const part = this.partIndex;
    this.rows = [];
    this.partIndex++;

    const today = new Date().toISOString().slice(0, 10);
    const localPath = path.join(os.tmpdir(), `raw-matches-${this.runTimestamp}-part${part}.parquet`);
    const gcsPath = `${this.prefix}/${today}/run-${this.runTimestamp}-part${String(part).padStart(4, '0')}.parquet`;

    try {
      log.info({ rowCount: batch.length, part }, 'Writing Parquet part');
      const writer = await ParquetWriter.openFile(PARQUET_SCHEMA, localPath);
      for (const row of batch) {
        await writer.appendRow(row as unknown as Record<string, unknown>);
      }
      await writer.close();

      const stats = fs.statSync(localPath);
      log.info({ sizeMB: (stats.size / 1024 / 1024).toFixed(1), part }, 'Parquet part written');

      await this.storage.bucket(this.bucket).upload(localPath, {
        destination: gcsPath,
        metadata: {
          contentType: 'application/x-parquet',
          metadata: {
            matchCount: String(batch.length),
            collectorRun: this.runTimestamp,
            part: String(part),
          },
        },
      });
      log.info({ gcsPath, rows: batch.length }, 'Part uploaded to GCS');

      this.totalRows += batch.length;
    } catch (err) {
      log.error({ err: (err as Error).message, part }, 'Failed to write/upload Parquet part — continuing');
    } finally {
      try {
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      } catch { /* ignore cleanup errors */ }
    }
  }

  async finalize(): Promise<void> {
    // Wait for any in-flight flush, then flush remaining
    await this.flushLock;
    await this.flush();
    if (this.totalRows > 0) {
      log.info({ totalRows: this.totalRows, parts: this.partIndex, bucket: this.bucket }, 'Archive complete');
    } else {
      log.info('No rows to archive');
    }
  }
}
