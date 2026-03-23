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
    const types = { 6: 'RM 1v1', 7: 'RM Team', 8: 'RM Team', 9: 'RM Team' };
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

function makeProcessedMatch(id, startTime, overrides = {}) {
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
    ...overrides,
  };
}

function makeDbMatchRows(matches) {
  return matches.map(m => ({
    match_id: m.id.toString(),
    map_id: 1,
    map_name: m.mapName || 'Arabia',
    match_type_id: m.matchTypeId || 6,
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

/**
 * Sets up mockPool.query to respond based on SQL content.
 * This avoids fragile ordering issues with Promise.all parallel calls.
 */
function setupSmartDbMock({
  matchData = [],
  hasMore = false,
  filterMaps = [],
  filterMatchTypes = [],
} = {}) {
  const matchIdRows = matchData.map(m => ({ match_id: m.id.toString() }));
  const matchIdResult = hasMore
    ? [...matchIdRows, { match_id: '999999' }]
    : matchIdRows;

  mockPool.query.mockImplementation((sql, params) => {
    const sqlStr = typeof sql === 'string' ? sql : '';

    // queryFilterOptions: map counts
    if (sqlStr.includes('GROUP BY m.map_name')) {
      return Promise.resolve({ rows: filterMaps });
    }
    // queryFilterOptions: match type counts
    if (sqlStr.includes('GROUP BY m.match_type_id')) {
      return Promise.resolve({ rows: filterMatchTypes });
    }
    // queryMatchHistory: match IDs query (has LIMIT and FROM match_player mp JOIN match)
    if (sqlStr.includes('SELECT mp.match_id')) {
      return Promise.resolve({ rows: matchIdResult });
    }
    // queryMatchHistory: full match data
    if (sqlStr.includes('FROM match') && sqlStr.includes('match_id = ANY')) {
      if (sqlStr.includes('FROM match_player')) {
        return Promise.resolve({ rows: makeDbPlayerRows(matchData) });
      }
      return Promise.resolve({ rows: makeDbMatchRows(matchData) });
    }

    // Fallback
    return Promise.resolve({ rows: [] });
  });
}

function setupRelicApi(rawMatches) {
  const response = makeRawMatchHistoryResponse(rawMatches);
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(response),
  });
}

function encodeCursor(startTime, matchId) {
  return Buffer.from(`${startTime}|${matchId}`).toString('base64');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
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

      const relicMatches = [makeRawMatch(100, 1700000600), makeRawMatch(101, 1700000300)];
      setupRelicApi(relicMatches);
      processMatch
        .mockResolvedValueOnce(makeProcessedMatch(100, 1700000600))
        .mockResolvedValueOnce(makeProcessedMatch(101, 1700000300));

      const dbMatches = [
        { id: 101, startTime: 1700000300 },
        { id: 102, startTime: 1700000000 },
      ];
      setupSmartDbMock({
        matchData: dbMatches,
        filterMaps: [{ map_name: 'Arabia', count: '3' }],
        filterMatchTypes: [{ match_type_id: 6, count: '3' }],
      });

      const result = await handleFullMatchHistory('123', '?page=1&limit=50');

      expect(result.data.matches).toHaveLength(3);
      const ids = result.data.matches.map(m => m.match_id);
      expect(ids).toEqual(['100', '101', '102']);
    });

    it('handles Relic API failure gracefully', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);
      mockFetch.mockRejectedValueOnce(new Error('API timeout'));

      const dbMatches = [
        { id: 200, startTime: 1700000600 },
        { id: 201, startTime: 1700000300 },
      ];
      setupSmartDbMock({
        matchData: dbMatches,
        filterMaps: [{ map_name: 'Arabia', count: '2' }],
        filterMatchTypes: [{ match_type_id: 6, count: '2' }],
      });

      const result = await handleFullMatchHistory('123');

      expect(result.data.matches).toHaveLength(2);
      expect(result.data.matches[0].match_id).toBe('200');
    });

    it('returns empty when both sources have no data', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);
      setupRelicApi([]);
      setupSmartDbMock({ matchData: [] });

      const result = await handleFullMatchHistory('123');

      expect(result.data.matches).toHaveLength(0);
      expect(result.data.hasMore).toBe(false);
    });

    it('includes filterOptions on first request', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);
      setupRelicApi([]);
      setupSmartDbMock({
        matchData: [],
        filterMaps: [{ map_name: 'Arabia', count: '10' }, { map_name: 'Arena', count: '5' }],
        filterMatchTypes: [{ match_type_id: 6, count: '10' }, { match_type_id: 7, count: '5' }],
      });

      const result = await handleFullMatchHistory('123');

      expect(result.data.filterOptions).toBeDefined();
      expect(result.data.filterOptions.maps).toHaveLength(2);
      expect(result.data.filterOptions.maps[0]).toEqual({ name: 'Arabia', count: 10 });
      expect(result.data.filterOptions.matchTypes).toHaveLength(2);
      expect(result.data.filterOptions.matchTypes[0]).toEqual({ ids: [6], name: 'RM 1v1', count: 10 });
    });

    it('merges match types with same display name into single entry', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);
      setupRelicApi([]);
      setupSmartDbMock({
        matchData: [],
        filterMaps: [],
        // IDs 7, 8, 9 all map to "RM Team" in getGameType()
        filterMatchTypes: [
          { match_type_id: 7, count: '50' },
          { match_type_id: 8, count: '30' },
          { match_type_id: 9, count: '20' },
        ],
      });

      const result = await handleFullMatchHistory('123');

      expect(result.data.filterOptions.matchTypes).toHaveLength(1);
      expect(result.data.filterOptions.matchTypes[0]).toEqual({
        ids: [7, 8, 9],
        name: 'RM Team',
        count: 100,
      });
    });

    it('includes nextCursor when hasMore is true', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);
      setupRelicApi([]);

      const dbMatches = [{ id: 400, startTime: 1700000000 }];
      setupSmartDbMock({ matchData: dbMatches, hasMore: true });

      const result = await handleFullMatchHistory('123', '?limit=1');

      expect(result.data.hasMore).toBe(true);
      expect(result.data.nextCursor).toBeDefined();
      const decoded = Buffer.from(result.data.nextCursor, 'base64').toString();
      expect(decoded).toContain('400');
    });
  });

  describe('page 2+ — DB only', () => {
    it('returns only DB results', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);

      const dbMatches = [
        { id: 300, startTime: 1699999000 },
        { id: 301, startTime: 1699998000 },
      ];
      setupSmartDbMock({ matchData: dbMatches });

      const result = await handleFullMatchHistory('123', '?page=2&limit=50');

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.data.matches).toHaveLength(2);
    });

    it('does not include filterOptions on page 2+', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);
      setupSmartDbMock({ matchData: [{ id: 300, startTime: 1699999000 }] });

      const result = await handleFullMatchHistory('123', '?page=2&limit=50');

      expect(result.data.filterOptions).toBeUndefined();
    });
  });

  describe('cursor-based pagination', () => {
    it('uses cursor for DB query when provided', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);

      const cursor = encodeCursor('2023-11-14T00:00:00.000Z', 500);
      setupSmartDbMock({ matchData: [{ id: 499, startTime: 1699900000 }] });

      const result = await handleFullMatchHistory('123', `?cursor=${cursor}&limit=50`);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.data.matches).toHaveLength(1);
      expect(result.data.matches[0].match_id).toBe('499');
    });

    it('does not include filterOptions when cursor is present', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);

      const cursor = encodeCursor('2023-11-14T00:00:00.000Z', 500);
      setupSmartDbMock({ matchData: [{ id: 499, startTime: 1699900000 }] });

      const result = await handleFullMatchHistory('123', `?cursor=${cursor}&limit=50`);

      expect(result.data.filterOptions).toBeUndefined();
    });

    it('returns nextCursor when more results available', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);

      const cursor = encodeCursor('2023-11-14T00:00:00.000Z', 500);
      setupSmartDbMock({ matchData: [{ id: 499, startTime: 1699900000 }], hasMore: true });

      const result = await handleFullMatchHistory('123', `?cursor=${cursor}&limit=1`);

      expect(result.data.hasMore).toBe(true);
      expect(result.data.nextCursor).toBeDefined();
      const decoded = Buffer.from(result.data.nextCursor, 'base64').toString();
      expect(decoded).toContain('499');
    });

    it('handles invalid cursor gracefully', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);

      // Invalid cursor should be treated as null → falls to page 1 merge path
      setupRelicApi([]);
      setupSmartDbMock({ matchData: [] });

      const result = await handleFullMatchHistory('123', '?cursor=not-valid-base64!!!');

      expect(result.data.matches).toBeDefined();
    });
  });

  describe('server-side filters', () => {
    it('passes map filter to DB query', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);

      setupSmartDbMock({
        matchData: [{ id: 600, startTime: 1700000000, mapName: 'Arena' }],
        filterMaps: [{ map_name: 'Arena', count: '5' }],
        filterMatchTypes: [{ match_type_id: 6, count: '5' }],
      });

      const result = await handleFullMatchHistory('123', '?map=Arena');

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.data.matches).toHaveLength(1);

      // Find the matchIds query call
      const matchIdsCall = mockPool.query.mock.calls.find(
        c => typeof c[0] === 'string' && c[0].includes('SELECT mp.match_id')
      );
      expect(matchIdsCall).toBeDefined();
      expect(matchIdsCall[0]).toContain('map_name');
      expect(matchIdsCall[1]).toContain('Arena');
    });

    it('passes matchType filter to DB query', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);

      setupSmartDbMock({
        matchData: [{ id: 700, startTime: 1700000000, matchTypeId: 7 }],
        filterMaps: [],
        filterMatchTypes: [{ match_type_id: 7, count: '3' }],
      });

      const result = await handleFullMatchHistory('123', '?matchType=7');

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.data.matches).toHaveLength(1);

      const matchIdsCall = mockPool.query.mock.calls.find(
        c => typeof c[0] === 'string' && c[0].includes('SELECT mp.match_id')
      );
      expect(matchIdsCall[0]).toContain('match_type_id');
      expect(matchIdsCall[1]).toContainEqual([7]);
    });

    it('handles combined map + matchType filters', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);

      setupSmartDbMock({
        matchData: [{ id: 800, startTime: 1700000000, mapName: 'Arabia', matchTypeId: 6 }],
        filterMaps: [{ map_name: 'Arabia', count: '2' }],
        filterMatchTypes: [{ match_type_id: 6, count: '2' }],
      });

      const result = await handleFullMatchHistory('123', '?map=Arabia&matchType=6');

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.data.matches).toHaveLength(1);

      const matchIdsCall = mockPool.query.mock.calls.find(
        c => typeof c[0] === 'string' && c[0].includes('SELECT mp.match_id')
      );
      expect(matchIdsCall[0]).toContain('map_name');
      expect(matchIdsCall[0]).toContain('match_type_id');
    });

    it('includes filterOptions on first filtered request (no cursor)', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);

      setupSmartDbMock({
        matchData: [{ id: 900, startTime: 1700000000, mapName: 'Arabia' }],
        filterMaps: [{ map_name: 'Arabia', count: '10' }],
        filterMatchTypes: [{ match_type_id: 6, count: '10' }],
      });

      const result = await handleFullMatchHistory('123', '?map=Arabia');

      expect(result.data.filterOptions).toBeDefined();
      expect(result.data.filterOptions.maps).toHaveLength(1);
    });

    it('omits filterOptions on cursor + filter request', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);

      const cursor = encodeCursor('2023-11-14T00:00:00.000Z', 500);
      setupSmartDbMock({ matchData: [{ id: 499, startTime: 1699900000, mapName: 'Arabia' }] });

      const result = await handleFullMatchHistory('123', `?map=Arabia&cursor=${cursor}`);

      expect(result.data.filterOptions).toBeUndefined();
    });

    it('filters skip Relic API merge', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);

      setupSmartDbMock({
        matchData: [{ id: 1000, startTime: 1700000000 }],
        filterMaps: [],
        filterMatchTypes: [],
      });

      await handleFullMatchHistory('123', '?map=Arabia');

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('pagination', () => {
    it('sets hasMore=true when more DB results exist', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);

      setupSmartDbMock({
        matchData: [{ id: 400, startTime: 1700000000 }],
        hasMore: true,
      });

      const result = await handleFullMatchHistory('123', '?page=2&limit=1');

      expect(result.data.hasMore).toBe(true);
    });

    it('sets hasMore=false on last page', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);

      setupSmartDbMock({
        matchData: [{ id: 500, startTime: 1700000000 }],
        hasMore: false,
      });

      const result = await handleFullMatchHistory('123', '?page=3&limit=50');

      expect(result.data.hasMore).toBe(false);
    });

    it('clamps limit to max 100', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);
      setupSmartDbMock({ matchData: [] });

      await handleFullMatchHistory('123', '?page=2&limit=999');

      // The match IDs query should have limit+1 = 101
      const matchIdsCall = mockPool.query.mock.calls.find(
        c => typeof c[0] === 'string' && c[0].includes('SELECT mp.match_id')
      );
      expect(matchIdsCall[1]).toContain(101);
    });
  });

  describe('backward compat — page param', () => {
    it('page param still works without cursor', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);

      setupSmartDbMock({ matchData: [{ id: 300, startTime: 1699999000 }] });

      const result = await handleFullMatchHistory('123', '?page=2&limit=50');

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.data.matches).toHaveLength(1);
    });
  });

  describe('query param parsing', () => {
    it('defaults to page=1, limit=50', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);
      setupRelicApi([]);
      setupSmartDbMock({ matchData: [] });

      await handleFullMatchHistory('123');

      // Find the match IDs query
      const matchIdsCall = mockPool.query.mock.calls.find(
        c => typeof c[0] === 'string' && c[0].includes('SELECT mp.match_id')
      );
      expect(matchIdsCall).toBeDefined();
      // params: [profileId, limit+1, offset]
      expect(matchIdsCall[1]).toContain(51); // limit 50 + 1
    });

    it('handles malformed query params gracefully', async () => {
      mockGetMatchDbPool.mockReturnValue(mockPool);
      setupRelicApi([]);
      setupSmartDbMock({ matchData: [] });

      // page=abc → 1; limit=-5 → clamped to 1
      await handleFullMatchHistory('123', '?page=abc&limit=-5');

      const matchIdsCall = mockPool.query.mock.calls.find(
        c => typeof c[0] === 'string' && c[0].includes('SELECT mp.match_id')
      );
      expect(matchIdsCall).toBeDefined();
      expect(matchIdsCall[1]).toContain(2); // limit 1 + 1
    });
  });
});
