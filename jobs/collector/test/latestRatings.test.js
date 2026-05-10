import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildLatestRatingRows } from '../dist/latestRatings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = resolve(__dirname, '../migrations/1775000000000_add-player-latest-rating.sql');

test('latest rating rows keep valid known ratings and leave leaderboard mapping to the DB', () => {
  const rows = buildLatestRatingRows([
    {
      matchId: 100,
      matchTypeId: 6,
      startTime: new Date('2026-05-01T10:00:00Z'),
      completionTime: new Date('2026-05-01T10:30:00Z'),
      players: [
        { profileId: 1, newRating: 1500 },
        { profileId: 2, newRating: null },
        { profileId: 3, newRating: 0 },
      ],
    },
    {
      matchId: 101,
      matchTypeId: null,
      startTime: new Date('2026-05-01T11:00:00Z'),
      completionTime: new Date('2026-05-01T11:30:00Z'),
      players: [{ profileId: 4, newRating: 1600 }],
    },
  ]);

  assert.deepEqual(rows, [
    {
      profileId: 1,
      matchTypeId: 6,
      rating: 1500,
      sourceMatchId: 100,
      sourceTime: new Date('2026-05-01T10:30:00Z'),
    },
  ]);
});

test('rating leaderboard mapping migration contains the expected match-type buckets', () => {
  const sql = readFileSync(migrationPath, 'utf8');
  const rows = Array.from(sql.matchAll(/\((\d+),\s*(\d+),\s*'([^']+)'\)/g))
    .map((match) => ({
      matchTypeId: Number(match[1]),
      leaderboardId: Number(match[2]),
      label: match[3],
    }));

  const byMatchType = new Map(rows.map((row) => [row.matchTypeId, row]));

  assert.equal(rows.length, byMatchType.size, 'mapping should not define duplicate match_type_id rows');
  assert.deepEqual(Object.fromEntries(rows.map((row) => [row.matchTypeId, row.leaderboardId])), {
    2: 1,
    3: 2,
    4: 2,
    5: 2,
    6: 3,
    7: 4,
    8: 4,
    9: 4,
    11: 21,
    12: 22,
    13: 22,
    14: 22,
    18: 19,
    19: 20,
    20: 20,
    21: 20,
    26: 13,
    27: 14,
    28: 14,
    29: 14,
  });
  assert.equal(byMatchType.get(6).label, 'RM 1v1');
  assert.equal(byMatchType.get(7).label, 'RM Team');
  assert.equal(byMatchType.get(26).label, 'EW 1v1');
});
