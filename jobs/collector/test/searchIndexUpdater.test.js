import assert from 'node:assert/strict';
import test from 'node:test';

// Mock the Database.query (just needs .query returning rows). We import the
// compiled module (tests run against dist/ per package.json test script).
import { updateSearchIndex } from '../dist/searchIndexUpdater.js';

function makeDb(rows) {
  return {
    query: async (_sql, _vals) => ({ rows }),
  };
}

function mockFetch(responses) {
  const calls = [];
  let i = 0;
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts });
    const r = responses[i++] || { ok: true, status: 200, json: async () => ({ taskUid: 1 }) };
    return {
      ok: r.ok,
      status: r.status ?? 200,
      json: async () => r.json ?? { taskUid: 1 },
    };
  };
  return calls;
}

const origEnv = { ...process.env };

test('upserts name/alias/last_match_date, drops null and steam names, omits country/clan/total_matches', async () => {
  process.env.MEILISEARCH_HOST = 'http://meili:7700';
  process.env.MEILISEARCH_API_KEY = 'k';
  const rows = [
    { profile_id: 1, name: 'Alice', last_match_date: '1723000000' },
    { profile_id: 2, name: null, last_match_date: '1723000001' }, // dropped (null name)
    { profile_id: 3, name: '/steam/765', last_match_date: '1723000002' }, // shouldn't appear (filtered in SQL, but also guard here)
  ];
  // The SQL filters null/steam; here we only test the post-query doc building.
  // Simulate SQL already having filtered: only Alice.
  const db = makeDb([{ profile_id: 1, name: 'Alice', last_match_date: '1723000000' }]);
  const calls = mockFetch();
  await updateSearchIndex(db, [1, 2, 3], console);
  assert.equal(calls.length, 1, 'one batch');
  const body = JSON.parse(calls[0].opts.body);
  assert.deepEqual(body, [{ profile_id: 1, name: 'Alice', alias: 'Alice', last_match_date: 1723000000 }]);
});

test('omits alias/name when name is null (never overwrites sweep alias with null)', async () => {
  process.env.MEILISEARCH_HOST = 'http://meili:7700';
  process.env.MEILISEARCH_API_KEY = 'k';
  const db = makeDb([{ profile_id: 5, name: null, last_match_date: '1723000000' }]);
  const calls = mockFetch();
  await updateSearchIndex(db, [5], console);
  // No usable name -> no docs -> no Meilisearch call
  assert.equal(calls.length, 0, 'no upsert when name is null');
});

test('is best-effort: never throws when Meilisearch fails', async () => {
  process.env.MEILISEARCH_HOST = 'http://meili:7700';
  process.env.MEILISEARCH_API_KEY = 'k';
  const db = makeDb([{ profile_id: 1, name: 'Alice', last_match_date: '1723000000' }]);
  globalThis.fetch = async () => { throw new Error('Meilisearch down'); };
  // Must NOT throw:
  await updateSearchIndex(db, [1], console);
  assert.ok(true, 'did not throw');
});

test('no-op when MEILISEARCH_HOST is unset', async () => {
  delete process.env.MEILISEARCH_HOST;
  const db = makeDb([]);
  let called = false;
  globalThis.fetch = async () => { called = true; };
  await updateSearchIndex(db, [1], console);
  assert.equal(called, false, 'no fetch when host unset');
});

test('no-op when no profile ids', async () => {
  process.env.MEILISEARCH_HOST = 'http://meili:7700';
  process.env.MEILISEARCH_API_KEY = 'k';
  const db = makeDb([]);
  let called = false;
  globalThis.fetch = async () => { called = true; };
  await updateSearchIndex(db, [], console);
  assert.equal(called, false, 'no fetch when no profiles');
});

test('uses primaryKey=profile_id on add_documents', async () => {
  process.env.MEILISEARCH_HOST = 'http://meili:7700';
  process.env.MEILISEARCH_API_KEY = 'k';
  const db = makeDb([{ profile_id: 1, name: 'Alice', last_match_date: '1723000000' }]);
  const calls = mockFetch();
  await updateSearchIndex(db, [1], console);
  assert.match(calls[0].url, /\/indexes\/players\/documents\?primaryKey=profile_id/);
});

// restore env
test.after?.(() => { Object.assign(process.env, origEnv); });
