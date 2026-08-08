import pino from "pino";
import type { Database } from "./db.js";

/**
 * Incremental PG -> Meilisearch updater (Issue #2, Phase 1).
 *
 * After the collector ingests matches for a set of profile_ids, upsert their
 * latest name / alias / last_match_date into the shared `players` Meilisearch
 * index (primary key profile_id). Best-effort: never throws — a Meilisearch
 * outage must not break match ingestion.
 *
 * PG is AUTHORITATIVE for: name, alias (=name), last_match_date (epoch seconds).
 * It OMITS country/clanlist_name/total_matches (the sweep owns those) so the
 * Meilisearch partial-upsert leaves them untouched. See
 * plans/issue-2-search-index-pg-fed.md.
 *
 * Performance (2026-08-08): the original correlated-subquery form hung for
 * 1h22m+ on the live DB (39.5M match_player rows, 833k profiles) — it did a
 * random heap read into `match` per match_player row. The DISTINCT ON rewrite
 * + idx_match_id_starttime (Index Only Scan on match) dropped a 200-profile
 * sample from 8.4s to 214ms, and a 5k-profile_id backfill range to ~0.8s. The
 * backfill now chunks by profile_id range (BACKFILL_CHUNK ids at a time) so it
 * never issues one multi-hour query. A statement timeout bounds any stuck
 * chunk to 60s instead of hanging the whole 3h job.
 */

const MEILI_INDEX = "players";
const MEILI_BATCH = 5000; // bound e2-micro (1GB) RAM per reindex task
const QUERY_TIMEOUT_MS = 60_000; // fail a stuck chunk fast instead of hanging hours
const FETCH_TIMEOUT_MS = 15_000; // bound Meilisearch HTTP calls
const BACKFILL_CHUNK = 5000; // profile_id range width per backfill query

export async function updateSearchIndex(
  db: Database,
  profileIds: number[],
  log: pino.Logger,
): Promise<void> {
  const meiliHost = process.env.MEILISEARCH_HOST;
  const meiliKey = process.env.MEILISEARCH_API_KEY;
  if (!meiliHost || !meiliKey) {
    log.info("MEILISEARCH_HOST/API_KEY not set — skipping search index update");
    return;
  }

  // BACKFILL_SEARCH_INDEX=1 → full scan of match_player (one-time catch-up for
  // participants already in PG before the incremental updater existed). Chunked
  // by profile_id range so it never issues one multi-hour query.
  const backfill = process.env.BACKFILL_SEARCH_INDEX === "1";
  if (!backfill && profileIds.length === 0) {
    log.info("No profiles to index — skipping search index update");
    return;
  }
  if (backfill) log.info("BACKFILL_SEARCH_INDEX=1 — chunked full scan backfill");

  const base = meiliHost.replace(/\/$/, "");
  const headers = { Authorization: `Bearer ${meiliKey}`, "Content-Type": "application/json" };

  let upserted = 0;
  try {
    // Iterate the PG fetch in chunks: incremental = one fetch over profileIds;
    // backfill = many fetches over consecutive profile_id ranges. Each chunk is
    // upserted to Meilisearch before moving on, so progress is durable and the
    // e2-micro never holds the whole index in memory.
    for await (const docs of fetchPlayerDocsChunks(db, backfill ? null : profileIds, log)) {
      if (docs.length === 0) continue;
      for (let i = 0; i < docs.length; i += MEILI_BATCH) {
        const batch = docs.slice(i, i + MEILI_BATCH);
        const res = await fetchWithTimeout(
          `${base}/indexes/${MEILI_INDEX}/documents?primaryKey=profile_id`,
          { method: "POST", headers, body: JSON.stringify(batch) },
        );
        if (!res.ok) {
          log.warn({ status: res.status }, "Meilisearch add_documents failed — aborting search index update");
          return;
        }
        const { taskUid } = (await res.json()) as { taskUid: number };
        await waitForTask(base, headers, taskUid, log);
        upserted += batch.length;
      }
    }
    log.info({ upserted }, "Search index updated");
  } catch (err) {
    // BEST-EFFORT: never break the collector.
    log.warn({ err: (err as Error).message }, "Search index update failed (best-effort, ignored)");
  }
}

/**
 * Yield player docs in chunks. Incremental: one fetch over the given
 * profileIds. Backfill (profileIds null): consecutive profile_id ranges of
 * BACKFILL_CHUNK width, from min to max profile_id, so the full scan is many
 * small bounded queries (each ~0.8s, served by idx_player_profile +
 * idx_match_id_starttime) instead of one multi-hour query.
 */
async function* fetchPlayerDocsChunks(
  db: Database,
  profileIds: number[] | null,
  log: pino.Logger,
): AsyncGenerator<Record<string, unknown>[]> {
  if (profileIds) {
    yield fetchPlayerDocs(db, profileIds);
    return;
  }
  // Backfill: chunk by profile_id range.
  const { min, max } = await db.query<{ min: string; max: string }>(
    "SELECT min(profile_id) AS min, max(profile_id) AS max FROM match_player",
  ).then((r) => r.rows[0]);
  const lo = Number(min);
  const hi = Number(max);
  let chunks = 0;
  let total = 0;
  for (let from = lo; from <= hi; from += BACKFILL_CHUNK) {
    const to = Math.min(from + BACKFILL_CHUNK - 1, hi);
    const docs = await fetchPlayerDocs(db, null, from, to);
    chunks++;
    total += docs.length;
    if (chunks % 10 === 0) log.info({ chunk: chunks, from, to, docs: docs.length, total }, "Backfill progress");
    yield docs;
  }
  log.info({ chunks, total }, "Backfill fetch complete");
}

/**
 * Latest non-null, non-steam player_name + last_match_date (epoch seconds) for
 * the given profile_ids (incremental) OR a profile_id range [from,to]
 * (backfill chunk). Uses DISTINCT ON (profile_id) ... ORDER BY profile_id,
 * start_time DESC so PG serves it from idx_player_profile + idx_match_id_starttime
 * (Index Only Scan on match) in a single sorted pass — no per-row match heap
 * reads, no correlated subquery. A statement timeout bounds any stuck chunk.
 */
async function fetchPlayerDocs(
  db: Database,
  profileIds: number[] | null,
  fromId?: number,
  toId?: number,
): Promise<Record<string, unknown>[]> {
  const params: unknown[] = [];
  let where = "WHERE mp.player_name IS NOT NULL AND mp.player_name NOT LIKE '/steam/%'";
  if (profileIds) {
    params.push(profileIds);
    where += ` AND mp.profile_id = ANY($1::bigint[])`;
  } else if (fromId !== undefined && toId !== undefined) {
    params.push(fromId, toId);
    where += ` AND mp.profile_id BETWEEN $1 AND $2`;
  }
  const sql = `
    SELECT DISTINCT ON (mp.profile_id)
           mp.profile_id,
           mp.player_name AS name,
           EXTRACT(EPOCH FROM m.start_time)::bigint AS last_match_date
    FROM match_player mp
    JOIN match m ON m.match_id = mp.match_id
    ${where}
    ORDER BY mp.profile_id, m.start_time DESC NULLS LAST;
  `;
  const { rows } = await db.queryBounded<{ profile_id: string; name: string | null; last_match_date: string | null }>(
    sql, params, QUERY_TIMEOUT_MS,
  );

  const docs: Record<string, unknown>[] = [];
  for (const r of rows) {
    if (!r.name) continue; // no usable name -> skip (don't overwrite sweep's alias)
    docs.push({
      profile_id: Number(r.profile_id),
      name: r.name,
      alias: r.name, // alias=name so PG-only players are searchable by name
      last_match_date: r.last_match_date ? Number(r.last_match_date) : null,
    });
  }
  return docs;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function waitForTask(base: string, headers: Record<string, string>, taskUid: number, log: pino.Logger): Promise<void> {
  const url = `${base}/tasks/${taskUid}`;
  for (let i = 0; i < 120; i++) {
    const res = await fetchWithTimeout(url, { headers });
    if (!res.ok) return; // best-effort
    const task = (await res.json()) as { status: string };
    if (task.status === "succeeded") return;
    if (task.status === "failed") {
      log.warn({ taskUid }, "Meilisearch task failed");
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  log.warn({ taskUid }, "Meilisearch task timed out waiting");
}
