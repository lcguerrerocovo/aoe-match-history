# Raw Match JSON → GCS Parquet Archive

## Context

The `match_raw` table in PostgreSQL stored raw Relic API JSON per match (7.4GB for 2.49M matches). This filled the 20GB disk and crashed PostgreSQL on 2026-03-23. The table was backed up to `gs://aoe2-site-backups/pg/match_raw_2026-03-23.dump` (2.6GB compressed), then truncated to restore service. Disk was resized to 40GB.

The raw JSON is useful for reprocessing if the schema changes or for debugging API response issues, but it doesn't need to be in PostgreSQL — it was only ever written, never read by the proxy or UI.

## Goal

Replace PostgreSQL `match_raw` storage with Parquet files in GCS. Each collector job run produces one Parquet file with flattened key fields for ad-hoc querying (BigQuery, DuckDB) plus the full raw JSON blob.

## Design

### Approach: Local Buffer → GCS Upload

1. During collection, each processed match is appended to a local Parquet file in `/tmp/`
2. After the collector worker loop completes, the file is uploaded to GCS
3. If 0 matches were collected, no file is created or uploaded

This adds zero latency to the collection loop (local disk writes only) and guarantees persistence via a single GCS upload at the end.

### Concurrency: Thread-Safe Archiving

The collector runs multiple concurrent workers (default 5). Since `@dsnp/parquetjs` does not support concurrent writes to the same writer, rows are buffered in a thread-safe array during collection and written to Parquet single-threaded in `finalize()`. At ~3KB/match x 50K matches = ~150MB, this fits comfortably in Cloud Run's memory.

### Parquet Schema

| Column           | Type              | Nullable | Source                                      |
|------------------|-------------------|----------|---------------------------------------------|
| `match_id`       | INT64             | no       | `match.id`                                  |
| `map_id`         | INT32             | yes      | Decoded from `options['10']`                |
| `map_name`       | STRING            | yes      | Resolved from map mappings                  |
| `match_type_id`  | INT32             | yes      | `match.matchtype_id`                        |
| `start_time`     | TIMESTAMP_MILLIS  | yes      | `match.startgametime * 1000`                |
| `completion_time`| TIMESTAMP_MILLIS  | yes      | `match.completiontime * 1000`               |
| `duration`       | INT32             | yes      | `completiontime - startgametime`            |
| `max_players`    | INT32             | yes      | `match.maxplayers`                          |
| `player_count`   | INT32             | no       | `match.matchhistoryreportresults.length`     |
| `winning_team`   | INT32             | yes      | Detected from result types + slot info      |
| `raw_json`       | STRING            | no       | `JSON.stringify(match)` (full API response) |

All fields except `raw_json`, `match_id`, and `player_count` are already extracted in `processMatch()`. Compression: Snappy (Parquet default).

### GCS Path Convention

```
gs://aoe2-site-backups/raw-matches/
  2026-03-23/
    run-2026-03-23T06-00-00Z.parquet
    run-2026-03-23T09-00-00Z.parquet
  2026-03-24/
    run-2026-03-24T06-00-00Z.parquet
```

One file per job run, partitioned by date for easy browsing and lifecycle management.

### Library

`@dsnp/parquetjs` — maintained fork of parquetjs, pure JS (no native binaries), supports streaming row-group writes with Snappy compression. Compatible with the existing `node:20-slim` Docker image.

## Changes

### New: `jobs/collector/src/raw-archive.ts`

`RawArchive` class:
- Constructor takes bucket name and optional GCS path prefix
- `append(matchId: number, processed: ProcessedMatch, rawJson: string)` — pushes a row object onto an in-memory array (thread-safe for concurrent workers since JS is single-threaded and array pushes are atomic)
- `finalize()` — creates a Parquet writer, writes all buffered rows, closes the writer, uploads the file to GCS via `@google-cloud/storage`, cleans up the local file. Logs the upload result. If upload fails, logs an error but does not throw (processed data in PG is the source of truth). No-ops if 0 rows were buffered.

### Modified: `jobs/collector/src/db.ts`

- Remove `batchInsertRaw()` method
- Remove `batchInsertRaw()` calls from `upsertMatches()` (line 198) and `perMatchInsert()` (line 333)
- Keep `rawJson` on `ProcessedMatch` interface (simplest approach — DB layer just stops writing it, archive reads it). No interface refactor needed.

### Modified: `jobs/collector/src/collector.ts`

- Import and instantiate `RawArchive` at the start of `run()`
- In the worker loop, after `processMatch()` and before/alongside `db.upsertMatches()`, call `archive.append()` for each match
- After the worker loop completes, call `archive.finalize()`
- Wrap `finalize()` in try/catch — upload failure should not crash the job

### Modified: `jobs/collector/src/index.ts`

- Read `RAW_ARCHIVE_BUCKET` env var (default: `aoe2-site-backups`)
- Pass bucket config to `Collector`

### Modified: `jobs/collector/package.json`

- Add `@google-cloud/storage` and `@dsnp/parquetjs` dependencies

### New migration: Drop `match_raw` table

- `DROP TABLE IF EXISTS match_raw;`
- Down migration: recreate the table (for rollback safety)

### Deployment

No workflow changes needed — Cloud Run Jobs already have default GCS access via the compute service account. The `aoe2-site-backups` bucket already exists.

## Error Handling

- Parquet writer failure (local disk): log error, continue collection without archiving. PG data is unaffected.
- GCS upload failure: log error, do not crash. The local file is cleaned up regardless.
- Job crash mid-run: local Parquet file is lost (ephemeral `/tmp/`). PG data committed per-batch is safe. The next run will collect overlapping matches (upsert semantics), so no data gap in PG — only a gap in the raw archive for that specific run.

## Historical Data: Convert Existing Dump to Parquet

The existing `match_raw` backup at `gs://aoe2-site-backups/pg/match_raw_2026-03-23.dump` (2.6GB compressed, 2.49M rows) should be converted to Parquet for consistency. This is a one-time script:

1. Restore the dump to a temporary local PostgreSQL (or use the VM with a temp table)
2. Stream rows through a script that applies the same Parquet schema (flattening key fields from the raw JSON)
3. Write output as partitioned Parquet files (e.g., one per month by `start_time`) to `gs://aoe2-site-backups/raw-matches/backfill/`
4. After confirming the Parquet files are valid, the original `.dump` can be kept or deleted

A standalone Node.js or Python script in `scripts/` is appropriate — this does not need to be part of the collector.

## Lifecycle Policy

After confirming GCS writes work, add a lifecycle rule to the `aoe2-site-backups` bucket to transition `raw-matches/` objects to Coldline after 30 days. At ~3KB/match and ~2.5M matches/month, monthly storage cost is negligible (~$0.05 Standard, even less on Coldline).

## Size Estimates

- Raw JSON: ~3KB/match average
- Per run (variable new match count): depends on how many profiles changed since last run
- Historical archive (2.49M matches): ~7.5GB raw → estimated ~2-3GB Parquet with Snappy
- Ongoing storage cost is negligible — well under $1/month on Standard, even less on Coldline
