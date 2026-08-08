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
 */

const MEILI_INDEX = "players";
const MEILI_BATCH = 5000; // bound e2-micro (1GB) RAM per reindex task

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
  // participants already in PG before the incremental updater existed). Omit
  // profileIds; bound by batch.
  const backfill = process.env.BACKFILL_SEARCH_INDEX === "1";
  if (!backfill && profileIds.length === 0) {
    log.info("No profiles to index — skipping search index update");
    return;
  }
  if (backfill) log.info("BACKFILL_SEARCH_INDEX=1 — full scan backfill");

  try {
    const docs = await fetchPlayerDocs(db, backfill ? null : profileIds, log);
    if (docs.length === 0) {
      log.info("No usable player docs from PG — skipping search index update");
      return;
    }
    log.info({ backfill, docs: docs.length }, "Fetched player docs from PG");

    const base = meiliHost.replace(/\/$/, "");
    const headers = { Authorization: `Bearer ${meiliKey}`, "Content-Type": "application/json" };

    let upserted = 0;
    for (let i = 0; i < docs.length; i += MEILI_BATCH) {
      const batch = docs.slice(i, i + MEILI_BATCH);
      const res = await fetch(`${base}/indexes/${MEILI_INDEX}/documents?primaryKey=profile_id`, {
        method: "POST",
        headers,
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        log.warn({ status: res.status, batch: i / MEILI_BATCH }, "Meilisearch add_documents failed — aborting search index update");
        return;
      }
      const { taskUid } = (await res.json()) as { taskUid: number };
      await waitForTask(base, headers, taskUid, log);
      upserted += batch.length;
    }
    log.info({ upserted, total: docs.length }, "Search index updated");
  } catch (err) {
    // BEST-EFFORT: never break the collector.
    log.warn({ err: (err as Error).message }, "Search index update failed (best-effort, ignored)");
  }
}

/** Latest non-null, non-steam player_name + last_match_date (epoch seconds)
 *  for the given profile_ids (or ALL players if profileIds is null = backfill).
 *  Drops profiles with no usable name. */
async function fetchPlayerDocs(
  db: Database,
  profileIds: number[] | null,
  log: pino.Logger,
): Promise<Record<string, unknown>[]> {
  // Correlated subquery picks the latest qualifying name per profile; the outer
  // GROUP BY gets last_match_date. NULLS LAST so a null start_time never wins.
  const where = profileIds ? `WHERE mp.profile_id = ANY($1::bigint[])` : "";
  const params = profileIds ? [profileIds] : [];
  const sql = `
    SELECT mp.profile_id,
           (SELECT mp2.player_name
              FROM match_player mp2
              JOIN match m2 ON m2.match_id = mp2.match_id
             WHERE mp2.profile_id = mp.profile_id
               AND mp2.player_name IS NOT NULL
               AND mp2.player_name NOT LIKE '/steam/%'
             ORDER BY m2.start_time DESC NULLS LAST
             LIMIT 1) AS name,
           EXTRACT(EPOCH FROM MAX(m.start_time))::bigint AS last_match_date
    FROM match_player mp
    JOIN match m ON m.match_id = mp.match_id
    ${where}
    GROUP BY mp.profile_id;
  `;
  const { rows } = await db.query<{ profile_id: string; name: string | null; last_match_date: string }>(sql, params);

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
  log.info({ rows: rows.length, usable: docs.length }, "Fetched player docs from PG");
  return docs;
}

async function waitForTask(base: string, headers: Record<string, string>, taskUid: number, log: pino.Logger): Promise<void> {
  const url = `${base}/tasks/${taskUid}`;
  for (let i = 0; i < 120; i++) {
    const res = await fetch(url, { headers });
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
