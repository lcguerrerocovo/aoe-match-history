# Raw Match JSON → GCS Parquet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace PostgreSQL `match_raw` storage with Parquet files in GCS, and convert the existing 2.49M-row dump to Parquet.

**Architecture:** The collector buffers raw match data in memory during collection, then writes a single Parquet file to `/tmp/` and uploads it to GCS at job completion. A one-time backfill script converts the existing pg_dump to Parquet. The `match_raw` table is dropped via migration.

**Tech Stack:** TypeScript, `@dsnp/parquetjs`, `@google-cloud/storage`, `node-pg-migrate`, Cloud Run Jobs, GCS

**Spec:** `docs/superpowers/specs/2026-03-23-raw-json-to-gcs-parquet-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `jobs/collector/src/raw-archive.ts` | Create | `RawArchive` class — buffer rows, write Parquet, upload to GCS |
| `jobs/collector/src/db.ts` | Modify | Remove `batchInsertRaw()`, export `processMatch()` for use by collector |
| `jobs/collector/src/collector.ts` | Modify | Integrate `RawArchive` into collection flow |
| `jobs/collector/src/index.ts` | Modify | Read `RAW_ARCHIVE_BUCKET` env var, pass to Collector |
| `jobs/collector/package.json` | Modify | Add `@dsnp/parquetjs` + `@google-cloud/storage` deps |
| `jobs/collector/migrations/<timestamp>_drop-match-raw.sql` | Create | Drop `match_raw` table |
| `scripts/backfill-parquet.ts` | Create | One-time script to convert pg_dump → Parquet in GCS |
| `jobs/collector/CLAUDE.md` | Modify | Document `RAW_ARCHIVE_BUCKET` env var |

---

### Task 1: Add dependencies

**Files:**
- Modify: `jobs/collector/package.json`

- [ ] **Step 1: Install parquetjs and GCS storage**

```bash
cd jobs/collector && pnpm add @dsnp/parquetjs @google-cloud/storage
```

- [ ] **Step 2: Install parquetjs type declarations**

`@dsnp/parquetjs` ships its own types. Verify by checking the package for a `d.ts` file:

```bash
ls node_modules/@dsnp/parquetjs/dist/*.d.ts
```

If no types exist, install `@types/parquetjs` as a dev dependency.

- [ ] **Step 3: Verify build still works**

```bash
cd jobs/collector && pnpm run build
```

Expected: clean compile, no errors.

- [ ] **Step 4: Commit**

```bash
git add jobs/collector/package.json jobs/collector/pnpm-lock.yaml
git commit -m "chore(collector): add @dsnp/parquetjs and @google-cloud/storage deps"
```

---

### Task 2: Create `RawArchive` class

**Files:**
- Create: `jobs/collector/src/raw-archive.ts`

- [ ] **Step 1: Create the `RawArchive` class**

This class buffers rows in memory during collection, then writes them to a Parquet file and uploads to GCS in `finalize()`.

```typescript
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
        await writer.appendRow(row);
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
```

- [ ] **Step 2: Verify build compiles**

```bash
cd jobs/collector && pnpm run build
```

Expected: clean compile. If there are type issues with `@dsnp/parquetjs` imports, check the import path — it may need `import parquet from '@dsnp/parquetjs'` with destructuring from the default export.

- [ ] **Step 3: Commit**

```bash
git add jobs/collector/src/raw-archive.ts
git commit -m "feat(collector): add RawArchive class for Parquet + GCS archival"
```

---

### Task 3: Remove `match_raw` writes and export `processMatch` from DB layer

**Files:**
- Modify: `jobs/collector/src/db.ts:47,113,198,280-295,330-333`

- [ ] **Step 1: Export `processMatch` and `detectWinningTeam`**

In `db.ts`, the `processMatch()` function (line 47) and `detectWinningTeam()` function (line 113) are module-level (not class methods) but not exported. Export `processMatch` so the collector can call it directly for archiving:

```typescript
// Change line 47 from:
function processMatch(
// To:
export function processMatch(
```

`detectWinningTeam` is called by `processMatch` but does not need to be exported — it's an implementation detail.

Also export `ProcessedMatch` so the collector can use the type:

```typescript
// Change line 30 from:
interface ProcessedMatch {
// To:
export interface ProcessedMatch {
```

- [ ] **Step 2: Remove `batchInsertRaw()` call from `upsertMatches()`**

In `db.ts`, inside the `upsertMatches()` method, remove line 198:

```typescript
// REMOVE this line:
await this.batchInsertRaw(client, processed);
```

This is inside the try block after `batchInsertPlayers()` (line 197) and before the RELEASE SAVEPOINT (line 199).

- [ ] **Step 3: Remove `batchInsertRaw()` call from `perMatchInsert()`**

In `db.ts`, inside the `perMatchInsert()` method, remove line 333:

```typescript
// REMOVE this line:
await this.batchInsertRaw(client, [m]);
```

This is inside the per-match try block after `batchInsertPlayers()` (line 332) and before the RELEASE SAVEPOINT (line 334).

- [ ] **Step 4: Remove the `batchInsertRaw()` method**

Delete the entire `batchInsertRaw()` method (lines 280-295):

```typescript
// DELETE this entire method:
private async batchInsertRaw(client: pg.PoolClient, processed: ProcessedMatch[]): Promise<void> {
  // ... all contents ...
}
```

- [ ] **Step 5: Verify build compiles**

```bash
cd jobs/collector && pnpm run build
```

Expected: clean compile, no references to the deleted method remain.

- [ ] **Step 6: Commit**

```bash
git add jobs/collector/src/db.ts
git commit -m "refactor(collector): remove match_raw writes, export processMatch"
```

---

### Task 4: Integrate `RawArchive` into the collector

**Files:**
- Modify: `jobs/collector/src/collector.ts`
- Modify: `jobs/collector/src/index.ts`

- [ ] **Step 1: Add `RawArchive` and `processMatch` to the `Collector` class**

In `collector.ts`, update the imports and constructor:

```typescript
import { RawArchive } from './raw-archive.js';
import { processMatch } from './db.js';

// ...

export class Collector {
  private db: Database;
  private archiveBucket: string;

  constructor(db: Database, archiveBucket: string) {
    this.db = db;
    this.archiveBucket = archiveBucket;
  }
```

- [ ] **Step 2: Create archive and buffer rows in the worker loop**

In the `run()` method, create the archive at the start (after mappings load):

```typescript
const archive = new RawArchive(this.archiveBucket);
```

In the worker's try block (around line 98-106), after `fetchMatchHistory` and before `db.upsertMatches`, call `processMatch()` on each match and archive the result with all flattened fields populated:

```typescript
const matchStats = response.matchHistoryStats || [];
const profiles = response.profiles || [];

// Archive raw matches with full flattened fields
for (const match of matchStats) {
  const pm = processMatch(match, profiles, civMap, mapMap);
  archive.append({
    match_id: pm.matchId,
    map_id: pm.mapId,
    map_name: pm.mapName,
    match_type_id: pm.matchTypeId,
    start_time: pm.startTime,
    completion_time: pm.completionTime,
    duration: pm.duration,
    max_players: pm.maxPlayers,
    player_count: pm.players.length,
    winning_team: pm.winningTeam,
    raw_json: pm.rawJson,
  });
}
```

Note: `processMatch()` will be called again inside `db.upsertMatches()` — this is a small redundancy (~3KB decode per match) but avoids refactoring `upsertMatches`'s interface. The decode is cheap compared to DB + API I/O.

- [ ] **Step 3: Finalize archive after the worker loop**

After `await Promise.all(workers)` (line 135), add:

```typescript
// Upload Parquet archive to GCS
try {
  await archive.finalize();
} catch (err) {
  log.error({ err: (err as Error).message }, 'Archive finalization failed — matches are safe in PG');
}
```

- [ ] **Step 4: Update `index.ts` to pass bucket config**

```typescript
const archiveBucket = process.env.RAW_ARCHIVE_BUCKET || 'aoe2-site-backups';

logger.info({ archiveBucket }, "Starting match collector");

const db = new Database(databaseUrl);
const collector = new Collector(db, archiveBucket);
```

- [ ] **Step 5: Verify build compiles**

```bash
cd jobs/collector && pnpm run build
```

- [ ] **Step 6: Commit**

```bash
git add jobs/collector/src/collector.ts jobs/collector/src/index.ts
git commit -m "feat(collector): integrate RawArchive into collection flow"
```

---

### Task 5: Create migration to drop `match_raw` table

**Files:**
- Create: `jobs/collector/migrations/<timestamp>_drop-match-raw.sql`

- [ ] **Step 1: Create the migration file**

```bash
cd jobs/collector && npm run migrate:create -- drop-match-raw
```

This creates a timestamped `.sql` file in `migrations/`.

- [ ] **Step 2: Write the migration SQL**

Edit the created file:

```sql
-- Up Migration
DROP TABLE IF EXISTS match_raw;

-- Down Migration
CREATE TABLE match_raw (
    match_id BIGINT PRIMARY KEY REFERENCES match(match_id),
    raw_json JSONB NOT NULL,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 3: Commit**

```bash
git add jobs/collector/migrations/
git commit -m "migration(collector): drop match_raw table"
```

---

### Task 6: Update documentation

**Files:**
- Modify: `jobs/collector/CLAUDE.md`

- [ ] **Step 1: Add `RAW_ARCHIVE_BUCKET` to the Environment Variables table**

In `jobs/collector/CLAUDE.md`, add to the environment variables table:

```markdown
| `RAW_ARCHIVE_BUCKET` | `aoe2-site-backups` | GCS bucket for raw match Parquet archives |
```

- [ ] **Step 2: Commit**

```bash
git add jobs/collector/CLAUDE.md
git commit -m "docs(collector): document RAW_ARCHIVE_BUCKET env var"
```

---

### Task 7: Backfill historical data — convert pg_dump to Parquet

**Files:**
- Create: `scripts/backfill-parquet.ts`

This is a standalone one-time script. It connects to a PostgreSQL instance where the `match_raw` dump has been restored (to a temp table), streams rows, and writes partitioned Parquet files to GCS.

- [ ] **Step 1: Create the backfill script**

```typescript
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
```

- [ ] **Step 2: Test locally (requires SSH tunnel + restored dump)**

This step should be run when the dump is restored. Skip for now if the dump hasn't been restored yet.

```bash
# Terminal 1: SSH tunnel
bash scripts/tunnel-postgres.sh

# Terminal 2: Restore dump to temp table (on the VM first), then run:
DATABASE_URL=postgresql://collector:pass@localhost:5432/aoe2_matches \
BUCKET=aoe2-site-backups \
npx tsx scripts/backfill-parquet.ts
```

- [ ] **Step 3: Verify Parquet files in GCS**

```bash
gsutil ls -l gs://aoe2-site-backups/raw-matches/backfill/
```

- [ ] **Step 4: Commit**

```bash
git add scripts/backfill-parquet.ts
git commit -m "feat: add one-time script to backfill match_raw dump to Parquet"
```

---

### Task 8: Deploy and verify

- [ ] **Step 1: Push to master to trigger deployment**

```bash
git push origin master
```

The deployment workflow will:
1. Build and push the Docker image
2. Run the `drop-match-raw` migration
3. Deploy the updated Cloud Run Job

- [ ] **Step 2: Trigger a manual collector run**

```bash
gcloud run jobs execute match-collector-job --region=us-central1 --wait
```

- [ ] **Step 3: Verify Parquet file was created in GCS**

```bash
gsutil ls -l gs://aoe2-site-backups/raw-matches/
```

Expected: one `.parquet` file for today's date.

- [ ] **Step 4: Verify Parquet file is readable**

Download and inspect with DuckDB or Python:

```bash
gsutil cp gs://aoe2-site-backups/raw-matches/$(date +%Y-%m-%d)/*.parquet /tmp/test.parquet
# With DuckDB:
duckdb -c "SELECT match_id, map_name, match_type_id, start_time FROM '/tmp/test.parquet' LIMIT 5"
```

- [ ] **Step 5: Verify match data in PostgreSQL is unaffected**

```bash
# Via SSH tunnel:
psql postgresql://collector:pass@localhost:5432/aoe2_matches \
  -c "SELECT COUNT(*) FROM match; SELECT COUNT(*) FROM match_player;"
```

Counts should match pre-deployment values.

- [ ] **Step 6: Verify `match_raw` table is gone**

```bash
psql postgresql://collector:pass@localhost:5432/aoe2_matches \
  -c "\dt match_raw"
```

Expected: "Did not find any relation named "match_raw"."

---

### Task 9: GCS lifecycle policy (optional, post-verification)

- [ ] **Step 1: Set lifecycle rule for Coldline transition**

```bash
gsutil lifecycle set /dev/stdin gs://aoe2-site-backups <<'EOF'
{
  "rule": [
    {
      "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
      "condition": {"age": 30, "matchesPrefix": ["raw-matches/"]}
    }
  ]
}
EOF
```

- [ ] **Step 2: Verify lifecycle policy**

```bash
gsutil lifecycle get gs://aoe2-site-backups
```
