const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('pino', () => () => ({
  child: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock config — DATABASE_URL controlled per test via getMatchDbPool mock
const mockPool = {
  query: jest.fn(),
};
const mockGetMatchDbPool = jest.fn();
jest.mock('./config', () => ({
  log: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  getFirestoreClient: jest.fn(),
  getMatchDbPool: (...args) => mockGetMatchDbPool(...args),
}));

jest.mock('./matchProcessing', () => ({
  processMatch: jest.fn(),
  groupPlayersIntoTeams: jest.fn((players) => {
    // Simple grouping: group by team number
    const teams = {};
    for (const p of players) {
      const key = p.number || 0;
      if (!teams[key]) teams[key] = [];
      teams[key].push(p);
    }
    return Object.values(teams);
  }),
  detectWinningTeams: jest.fn((teams) => {
    const winningTeams = teams
      .map((team, index) => team.some(p => p.winner) ? index + 1 : null)
      .filter(t => t !== null);
    return { winningTeam: winningTeams[0], winningTeams };
  }),
  getGameType: jest.fn((id) => {
    const types = { 6: 'RM 1v1', 7: 'RM Team' };
    return types[id] || null;
  }),
}));

const { processMatch } = require('./matchProcessing');
const { handleFullMatchHistory } = require('./fullMatchHistoryHandler');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRawMatchHistoryResponse(matches) {
  return {
    profiles: [{ profile_id: 123, name: '/steam/test', alias: 'TestPlayer' }],
    matchHistoryStats: matches,
  };
}

function makeRawMatch(id, startTime) {
  return {
    id,
    startgametime: startTime,
    completiontime: startTime + 600,
    description: 'AUTOMATCH',
    matchtype_id: 6,
    mapname: 'Arabia',
    options: '',
    slotinfo: '',
    maxplayers: 2,
    matchhistoryreportresults: [],
    matchhistorymember: [],
    matchurls: [],
  };
}

function makeProcessedMatch(id, startTime) {
  return {
    match_id: id.toString(),
    map_id: 1,
    start_time: new Date(startTime * 1000).toISOString(),
    description: 'RM 1v1',
    diplomacy: { type: 'RM 1v1', team_size: '2' },
    map: 'Arabia',
    duration: 600,
    teams: [],
    players: [],
    winning_team: 1,
    winning_teams: [1],
  };
}

function makeDbMatchRows(matches) {
  return matches.map(m => ({
    match_id: m.id.toString(),
    map_id: 1,
    map_name: 'Arabia',
    match_type_id: 6,
    start_time: new Date(m.startTime * 1000),
    completion_time: new Date((m.startTime + 600) * 1000),
    duration: 600,
    description: 'AUTOMATCH',
    max_players: 2,
    winning_team: 1,
  }));
}

function makeDbPlayerRows(matches) {
  return matches.flatMap(m => [
    {
      match_id: m.id.toString(),
      profile_id: '123',
      civilization_id: 1,
      civilization_name: 'Britons',
      team_id: 1,
      color_id: 0,
      result_type: 1,
      old_rating: 1000,
      new_rating: 1020,
      player_name: 'TestPlayer',
      matchurl: null,
      matchurl_size: null,
    },
    {
      match_id: m.id.toString(),
      profile_id: '456',
      civilization_id: 2,
      civilization_name: 'Franks',
      team_id: 2,
      color_id: 1,
      result_type: 2,
      old_rating: 1000,
      new_rating: 980,
      player_name: 'Opponent',
      matchurl: null,
      matchurl_size: null,
    },
  ]);
}

function setupDbQueries(matchData, playerData, hasMore = false) {
  const matchIdRows = matchData.map(m => ({ match_id: m.id.toString() }));
  // Add an extra row if hasMore to simulate limit+1 behavior
  const matchIdResult = hasMore
    ? [...matchIdRows, { match_id: '999999' }]
    : matchIdRows;

  mockPool.query
    .mockResolvedValueOnce({ rows: matchIdResult })       // match IDs query
    .mockResolvedValueOnce({ rows: makeDbMatchRows(matchData) })  // matches query
    .mockResolvedValueOnce({ rows: makeDbPlayerRows(matchData) }); // players query
}

function setupRelicApi(rawMatches) {
  const response = makeRawMatchHistoryResponse(rawMatches);
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(response),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  // Default: handleRawMatchHistory needs a Firestore mock for background storage
  const { getFirestoreClient } = require('./config');
  getFirestoreClient.mockReturnValue({
    collection: () => ({ doc: () => ({ get: jest.fn(), set: jest.fn() }) }),
    batch: () => ({ set: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) }),
  });
});

describe('handleFullMatchHistory', () => {
  describe('fallback (no DATABASE_URL)', () => {
    it('returns Relic API matches when pool is null', async () => {
      mockGetMatchDbPool.mockReturnValue(null);
      const rawMatch = makeRawMatch(100, 1700000000);
      const processed = makeProcessedMatch(100, 1700000000);
      setupRelicApi([rawMatch]);
      processMatch.mockResolvedValue(processed);

      const result = await handleFullMatchHistory('123');

      expect(result.data.matches).toHaveLength(1);
      expect(result.data.matches[0].match_id).toBe('100');
      expect(result.data.hasMore).toBe(false);
    });
  });

  describe('page 1 — merge Relic + DB', () => {
    it('merges and deduplicates (Relic wins)', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);

      // Relic returns match 100 and 101
      const relicMatches = [makeRawMatch(100, 1700000600), makeRawMatch(101, 1700000300)];
      setupRelicApi(relicMatches);
      processMatch
        .mockResolvedValueOnce(makeProcessedMatch(100, 1700000600))
        .mockResolvedValueOnce(makeProcessedMatch(101, 1700000300));

      // DB returns match 101 (overlap) and 102 (historical)
      const dbMatches = [
        { id: 101, startTime: 1700000300 },
        { id: 102, startTime: 1700000000 },
      ];
      setupDbQueries(dbMatches);

      const result = await handleFullMatchHistory('123', '?page=1&limit=50');

      expect(result.data.matches).toHaveLength(3); // 100, 101 (relic), 102
      // Match 101 should be from Relic (dedup), verify order is DESC
      const ids = result.data.matches.map(m => m.match_id);
      expect(ids).toEqual(['100', '101', '102']);
    });

    it('handles Relic API failure gracefully', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);

      // Relic fails
      mockFetch.mockRejectedValueOnce(new Error('API timeout'));

      // DB returns matches
      const dbMatches = [
        { id: 200, startTime: 1700000600 },
        { id: 201, startTime: 1700000300 },
      ];
      setupDbQueries(dbMatches);

      const result = await handleFullMatchHistory('123');

      expect(result.data.matches).toHaveLength(2);
      expect(result.data.matches[0].match_id).toBe('200');
    });

    it('returns empty when both sources have no data', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);
      setupRelicApi([]);
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // no match IDs

      const result = await handleFullMatchHistory('123');

      expect(result.data.matches).toHaveLength(0);
      expect(result.data.hasMore).toBe(false);
    });
  });

  describe('page 2+ — DB only', () => {
    it('returns only DB results', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);

      const dbMatches = [
        { id: 300, startTime: 1699999000 },
        { id: 301, startTime: 1699998000 },
      ];
      setupDbQueries(dbMatches);

      const result = await handleFullMatchHistory('123', '?page=2&limit=50');

      // Should NOT call Relic API
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.data.matches).toHaveLength(2);
    });
  });

  describe('pagination', () => {
    it('sets hasMore=true when more DB results exist', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);

      const dbMatches = [{ id: 400, startTime: 1700000000 }];
      setupDbQueries(dbMatches, undefined, true); // hasMore = true

      const result = await handleFullMatchHistory('123', '?page=2&limit=1');

      expect(result.data.hasMore).toBe(true);
    });

    it('sets hasMore=false on last page', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);

      const dbMatches = [{ id: 500, startTime: 1700000000 }];
      setupDbQueries(dbMatches, undefined, false);

      const result = await handleFullMatchHistory('123', '?page=3&limit=50');

      expect(result.data.hasMore).toBe(false);
    });

    it('clamps limit to max 100', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await handleFullMatchHistory('123', '?page=2&limit=999');

      // The LIMIT in the query should be 101 (100 + 1 for hasMore check)
      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[1][1]).toBe(101); // limit + 1
    });
  });

  describe('query param parsing', () => {
    it('defaults to page=1, limit=50', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);
      setupRelicApi([]);
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await handleFullMatchHistory('123');

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[1][1]).toBe(51); // limit 50 + 1
      expect(queryCall[1][2]).toBe(0);  // offset 0
    });

    it('handles malformed query params gracefully', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);
      setupRelicApi([]);
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      // page=abc → NaN → defaults to 1; limit=-5 → clamped to min 1
      await handleFullMatchHistory('123', '?page=abc&limit=-5');

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[1][1]).toBe(2);  // limit 1 + 1 (hasMore check)
      expect(queryCall[1][2]).toBe(0);  // offset 0 (page 1)
    });
  });
});
