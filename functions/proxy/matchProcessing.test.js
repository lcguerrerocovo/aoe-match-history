// Mock dependencies before any require
const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('pino', () => () => ({
  child: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));
jest.mock('./decoders', () => ({
  decodeOptions: jest.fn(),
  decodeSlotInfo: jest.fn()
}));

const { decodeOptions, decodeSlotInfo } = require('./decoders');

// Sample rl_api_mappings fixture
const MOCK_MAPPINGS = {
  civs: {
    aoe2: {
      Franks: { '1': 1, '2': 5 },    // latest version 2 → id 5
      Britons: { '1': 3 },            // latest version 1 → id 3
      Vikings: { '1': 7 }             // latest version 1 → id 7
    }
  },
  maps: {
    aoe2: {
      Arabia: { '1': 9, '2': 14 },   // latest version 2 → id 14
      Arena: { '1': 29 }              // latest version 1 → id 29
    }
  }
};

// Helper to set up fetch mock returning MOCK_MAPPINGS
function mockFetchMappings() {
  mockFetch.mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue(MOCK_MAPPINGS)
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// getGameType
// ─────────────────────────────────────────────────────────────────────────────
describe('getGameType', () => {
  const { getGameType } = require('./matchProcessing');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns "Unranked" for id 0', () => {
    expect(getGameType(0)).toBe('Unranked');
  });

  it('returns "RM 1v1" for id 6', () => {
    expect(getGameType(6)).toBe('RM 1v1');
  });

  it('returns "RM Team" for id 7', () => {
    expect(getGameType(7)).toBe('RM Team');
  });

  it('returns null for unknown id', () => {
    expect(getGameType(9999)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getCivMap
// ─────────────────────────────────────────────────────────────────────────────
describe('getCivMap', () => {
  let getCivMap;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    global.fetch = jest.fn();
    jest.mock('pino', () => () => ({
      child: () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() })
    }));
    jest.mock('./decoders', () => ({ decodeOptions: jest.fn(), decodeSlotInfo: jest.fn() }));
    global.fetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue(MOCK_MAPPINGS) });
    ({ getCivMap } = require('./matchProcessing'));
  });

  it('builds map picking the latest version for each civ', async () => {
    const map = await getCivMap();
    // Franks: versions {1:1, 2:5} → latest is 2 → id 5
    expect(map['5']).toBe('Franks');
    // Britons: versions {1:3} → latest is 1 → id 3
    expect(map['3']).toBe('Britons');
    // id 1 should NOT appear (Franks v1 was superseded)
    expect(map['1']).toBeUndefined();
  });

  it('returns {} when mappings has no civs.aoe2', async () => {
    jest.resetModules();
    global.fetch = jest.fn();
    jest.mock('pino', () => () => ({
      child: () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() })
    }));
    jest.mock('./decoders', () => ({ decodeOptions: jest.fn(), decodeSlotInfo: jest.fn() }));
    global.fetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({ maps: MOCK_MAPPINGS.maps }) });
    const { getCivMap: getCivMapFresh } = require('./matchProcessing');
    const map = await getCivMapFresh();
    expect(map).toEqual({});
  });

  it('caches result on second call (fetch called only once)', async () => {
    await getCivMap();
    await getCivMap();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getMapMap
// ─────────────────────────────────────────────────────────────────────────────
describe('getMapMap', () => {
  let getMapMap;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    global.fetch = jest.fn();
    jest.mock('pino', () => () => ({
      child: () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() })
    }));
    jest.mock('./decoders', () => ({ decodeOptions: jest.fn(), decodeSlotInfo: jest.fn() }));
    global.fetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue(MOCK_MAPPINGS) });
    ({ getMapMap } = require('./matchProcessing'));
  });

  it('builds map picking the latest version for each map', async () => {
    const map = await getMapMap();
    // Arabia: versions {1:9, 2:14} → latest is 2 → id 14
    expect(map['14']).toBe('Arabia');
    // Arena: versions {1:29} → id 29
    expect(map['29']).toBe('Arena');
    // id 9 should NOT appear
    expect(map['9']).toBeUndefined();
  });

  it('returns {} when mappings has no maps.aoe2', async () => {
    jest.resetModules();
    global.fetch = jest.fn();
    jest.mock('pino', () => () => ({
      child: () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() })
    }));
    jest.mock('./decoders', () => ({ decodeOptions: jest.fn(), decodeSlotInfo: jest.fn() }));
    global.fetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({ civs: MOCK_MAPPINGS.civs }) });
    const { getMapMap: getMapMapFresh } = require('./matchProcessing');
    const map = await getMapMapFresh();
    expect(map).toEqual({});
  });

  it('caches result on second call (fetch called only once)', async () => {
    await getMapMap();
    await getMapMap();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// groupPlayersIntoTeams
// ─────────────────────────────────────────────────────────────────────────────
describe('groupPlayersIntoTeams', () => {
  const { groupPlayersIntoTeams } = require('./matchProcessing');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makePlayer(overrides) {
    return { name: 'p', civ: 'Franks', number: 1, color_id: 0, user_id: 1, winner: false, rating: null, rating_change: null, ...overrides };
  }

  it('groups two teams by player.number', () => {
    const players = [
      makePlayer({ user_id: 1, number: 1, color_id: 1 }),
      makePlayer({ user_id: 2, number: 1, color_id: 2 }),
      makePlayer({ user_id: 3, number: 2, color_id: 3 }),
      makePlayer({ user_id: 4, number: 2, color_id: 4 })
    ];
    const teams = groupPlayersIntoTeams(players);
    expect(teams).toHaveLength(2);
    // each team has 2 players
    teams.forEach(t => expect(t).toHaveLength(2));
    // players within a team sorted by color_id
    expect(teams[0][0].color_id).toBeLessThanOrEqual(teams[0][1].color_id);
    expect(teams[1][0].color_id).toBeLessThanOrEqual(teams[1][1].color_id);
  });

  it('falls back to grouping by color_id when all players share the same number (FFA)', () => {
    const players = [
      makePlayer({ user_id: 1, number: 1, color_id: 1 }),
      makePlayer({ user_id: 2, number: 1, color_id: 2 }),
      makePlayer({ user_id: 3, number: 1, color_id: 3 })
    ];
    const teams = groupPlayersIntoTeams(players);
    // Each player is their own "team" indexed by color_id
    expect(teams).toHaveLength(3);
    teams.forEach(t => expect(t).toHaveLength(1));
  });

  it('sorts players within a team by color_id ascending', () => {
    const players = [
      makePlayer({ user_id: 1, number: 1, color_id: 5 }),
      makePlayer({ user_id: 2, number: 1, color_id: 2 }),
      makePlayer({ user_id: 3, number: 1, color_id: 8 })
    ];
    // All same number → FFA, each own team — test team sort in normal grouping
    const playersNormal = [
      makePlayer({ user_id: 1, number: 1, color_id: 5 }),
      makePlayer({ user_id: 2, number: 1, color_id: 2 }),
      makePlayer({ user_id: 3, number: 2, color_id: 8 })
    ];
    const teams = groupPlayersIntoTeams(playersNormal);
    const team1 = teams.find(t => t.some(p => p.user_id === 1 || p.user_id === 2));
    expect(team1[0].color_id).toBe(2);
    expect(team1[1].color_id).toBe(5);
  });

  it('returns empty array for empty input', () => {
    expect(groupPlayersIntoTeams([])).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// detectWinningTeams
// ─────────────────────────────────────────────────────────────────────────────
describe('detectWinningTeams', () => {
  const { detectWinningTeams } = require('./matchProcessing');

  function makePlayer(winner) {
    return { name: 'p', civ: 'Franks', number: 1, color_id: 0, user_id: 1, winner, rating: null, rating_change: null };
  }

  it('detects correct winning team', () => {
    const teams = [
      [makePlayer(false), makePlayer(false)],
      [makePlayer(true), makePlayer(true)]
    ];
    const result = detectWinningTeams(teams);
    expect(result.winningTeam).toBe(2);
    expect(result.winningTeams).toEqual([2]);
  });

  it('returns undefined winningTeam when no winners', () => {
    const teams = [
      [makePlayer(false)],
      [makePlayer(false)]
    ];
    const result = detectWinningTeams(teams);
    expect(result.winningTeam).toBeUndefined();
    expect(result.winningTeams).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveMap
// ─────────────────────────────────────────────────────────────────────────────
describe('resolveMap', () => {
  const { resolveMap } = require('./matchProcessing');

  const mapMap = { '14': 'Arabia', '29': 'Arena' };

  it('resolves map name from options key "10"', () => {
    const result = resolveMap(mapMap, { options: { '10': 14 }, rawName: 'unknown' });
    expect(result.name).toBe('Arabia');
    expect(result.id).toBe(14);
  });

  it('falls back to rawName when map id is not in mapMap', () => {
    const result = resolveMap(mapMap, { options: { '10': 999 }, rawName: 'Custom Map' });
    expect(result.name).toBe('Custom Map');
    expect(result.id).toBe(999);
  });

  it('falls back to rawName when options is null', () => {
    const result = resolveMap(mapMap, { options: null, rawName: 'CustomMap', mapId: 999 });
    // mapId 999 is not in mapMap → falls back to rawName
    expect(result.name).toBe('CustomMap');
    expect(result.id).toBe(999);
  });

  it('handles missing options and missing mapId gracefully', () => {
    const result = resolveMap(mapMap, { rawName: 'SomeMap' });
    expect(result.name).toBe('SomeMap');
    expect(result.id).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// processMatch — full integration test
// ─────────────────────────────────────────────────────────────────────────────
describe('processMatch', () => {
  let processMatch;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    global.fetch = jest.fn();
    jest.mock('pino', () => () => ({
      child: () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() })
    }));
    jest.mock('./decoders', () => ({
      decodeOptions: jest.fn().mockReturnValue({ '10': 14 }),
      decodeSlotInfo: jest.fn().mockReturnValue([])
    }));
    global.fetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue(MOCK_MAPPINGS) });
    ({ processMatch } = require('./matchProcessing'));
  });

  function makeRawMatch(overrides = {}) {
    return {
      id: 42,
      startgametime: 1700000000,
      completiontime: 1700003600,
      description: 'AUTOMATCH',
      matchtype_id: 6,
      mapname: 'Arabia',
      options: 'encodedOptions',
      slotinfo: 'encodedSlotInfo',
      maxplayers: 2,
      matchhistoryreportresults: [
        { profile_id: 101, civilization_id: 5, teamid: 0, resulttype: 1 },
        { profile_id: 102, civilization_id: 3, teamid: 1, resulttype: 0 }
      ],
      matchhistorymember: [
        { profile_id: 101, oldrating: 1000, newrating: 1020 },
        { profile_id: 102, oldrating: 980, newrating: 970 }
      ],
      matchurls: [],
      ...overrides
    };
  }

  const profiles = [
    { profile_id: 101, name: 'Alice_RealName', alias: 'Alice' },
    { profile_id: 102, name: 'Bob_RealName', alias: 'Bob' }
  ];

  it('transforms RawMatch + profiles into a ProcessedMatch', async () => {
    const result = await processMatch(makeRawMatch(), profiles);

    expect(result.match_id).toBe('42');
    expect(result.duration).toBe(3600);
    expect(result.map).toBe('Arabia');  // resolved from options '10':14 → 'Arabia'
  });

  it('uses alias as display name and original name as original_name', async () => {
    const result = await processMatch(makeRawMatch(), profiles);
    const alice = result.players.find(p => p.user_id === 101);
    expect(alice.name).toBe('Alice');
    expect(alice.original_name).toBe('Alice_RealName');
  });

  it('resolves civ ID to civ name', async () => {
    const result = await processMatch(makeRawMatch(), profiles);
    const alice = result.players.find(p => p.user_id === 101);
    // civ id 5 → Franks (latest version of Franks in MOCK_MAPPINGS)
    expect(alice.civ).toBe('Franks');
  });

  it('sets correct ratings and rating_change', async () => {
    const result = await processMatch(makeRawMatch(), profiles);
    const alice = result.players.find(p => p.user_id === 101);
    expect(alice.rating).toBe(1020);
    expect(alice.rating_change).toBe(20);
    const bob = result.players.find(p => p.user_id === 102);
    expect(bob.rating).toBe(970);
    expect(bob.rating_change).toBe(-10);
  });

  it('correctly identifies winning team', async () => {
    const result = await processMatch(makeRawMatch(), profiles);
    // Alice (resulttype=1) is the winner
    expect(result.winning_team).toBeDefined();
    expect(Array.isArray(result.winning_teams)).toBe(true);
    expect(result.winning_teams.length).toBeGreaterThan(0);
  });

  it('converts AUTOMATCH description to game type string', async () => {
    const result = await processMatch(makeRawMatch({ description: 'AUTOMATCH', matchtype_id: 6 }), profiles);
    expect(result.description).toBe('RM 1v1');
  });

  it('preserves non-AUTOMATCH description as-is', async () => {
    const result = await processMatch(makeRawMatch({ description: 'Custom Game' }), profiles);
    expect(result.description).toBe('Custom Game');
  });

  it('sets start_time as ISO string', async () => {
    const result = await processMatch(makeRawMatch(), profiles);
    expect(result.start_time).toBe(new Date(1700000000 * 1000).toISOString());
  });

  it('sets diplomacy.type and team_size', async () => {
    const result = await processMatch(makeRawMatch(), profiles);
    expect(result.diplomacy.type).toBe('RM 1v1');
    expect(result.diplomacy.team_size).toBe('2');
  });
});
