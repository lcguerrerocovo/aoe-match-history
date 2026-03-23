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

const FLUSH_THRESHOLD = 50000;

export class RawArchive {
  private bucket: string;
  private prefix: string;
  private storage: Storage;
  private rows: ArchiveRow[] = [];
  private runTimestamp: string;
  private partIndex = 0;
  private totalRows = 0;

  constructor(bucket: string, prefix = 'raw-matches') {
    this.bucket = bucket;
    this.prefix = prefix;
    this.storage = new Storage();
    this.runTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  }

  async append(row: ArchiveRow): Promise<void> {
    this.rows.push(row);
    if (this.rows.length >= FLUSH_THRESHOLD) {
      await this.flush();
    }
  }

  get rowCount(): number {
    return this.totalRows + this.rows.length;
  }

  private async flush(): Promise<void> {
    if (this.rows.length === 0) return;

    const today = new Date().toISOString().slice(0, 10);
    const localPath = path.join(os.tmpdir(), `raw-matches-${this.runTimestamp}-part${this.partIndex}.parquet`);
    const gcsPath = `${this.prefix}/${today}/run-${this.runTimestamp}-part${String(this.partIndex).padStart(4, '0')}.parquet`;

    try {
      log.info({ rowCount: this.rows.length, part: this.partIndex }, 'Writing Parquet part');
      const writer = await ParquetWriter.openFile(PARQUET_SCHEMA, localPath);
      for (const row of this.rows) {
        await writer.appendRow(row as unknown as Record<string, unknown>);
      }
      await writer.close();

      const stats = fs.statSync(localPath);
      log.info({ sizeMB: (stats.size / 1024 / 1024).toFixed(1), part: this.partIndex }, 'Parquet part written');

      await this.storage.bucket(this.bucket).upload(localPath, {
        destination: gcsPath,
        metadata: {
          contentType: 'application/x-parquet',
          metadata: {
            matchCount: String(this.rows.length),
            collectorRun: this.runTimestamp,
            part: String(this.partIndex),
          },
        },
      });
      log.info({ gcsPath, rows: this.rows.length }, 'Part uploaded to GCS');

      this.totalRows += this.rows.length;
      this.partIndex++;
    } catch (err) {
      log.error({ err: (err as Error).message, part: this.partIndex }, 'Failed to write/upload Parquet part — continuing');
    } finally {
      try {
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      } catch { /* ignore cleanup errors */ }
      this.rows = [];
    }
  }

  async finalize(): Promise<void> {
    await this.flush();
    if (this.totalRows > 0) {
      log.info({ totalRows: this.totalRows, parts: this.partIndex, bucket: this.bucket }, 'Archive complete');
    } else {
      log.info('No rows to archive');
    }
  }
}
