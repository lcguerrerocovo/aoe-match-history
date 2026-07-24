const mockPool = {
  query: jest.fn(),
};
const mockService = {
  findObservableAdvertisements: jest.fn(),
};

jest.mock('pino', () => () => ({
  child: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('./config', () => ({
  logger: {
    child: () => ({
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
  getMatchDbPool: jest.fn(() => mockPool),
}));

jest.mock('./authService', () => ({
  withAuthRetry: jest.fn((fn) => fn()),
  getAuthenticatedPlayerService: jest.fn(() => mockService),
}));

jest.mock('./gameVersion', () => ({
  getGameVersion: jest.fn(() => Promise.resolve(1)),
  reportEmptyResults: jest.fn(),
  reportNonEmptyResults: jest.fn(),
}));

jest.mock('./matchProcessing', () => ({
  getCivMap: jest.fn(() => Promise.resolve({ 1: 'Britons', 2: 'Franks' })),
  getMapMap: jest.fn(() => Promise.resolve({})),
  getGameType: jest.fn((id) => ({ 6: 'RM 1v1', 7: 'RM Team', 99: 'Custom' }[id] || null)),
  resolveMap: jest.fn(() => ({ name: 'Arabia', id: 1 })),
}));

jest.mock('./decoders', () => ({
  decodeOptions: jest.fn(() => ({})),
  decodeSlotInfo: jest.fn(() => []),
}));

function rawPlayer(profileId, name) {
  const player = [];
  player[1] = profileId;
  player[4] = name;
  player[11] = String(profileId);
  return player;
}

function rawMatch(matchId, matchTypeId, profileIds) {
  const match = [];
  match[0] = matchId;
  match[9] = '';
  match[11] = profileIds.length;
  match[12] = '';
  match[13] = matchTypeId;
  match[14] = profileIds.map((profileId, index) => [matchId, profileId, null, null, index + 1, index]);
  match[21] = 1710000000 + matchId;
  match[23] = 'US East';
  return match;
}

describe('handleLiveMatches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('enriches live players from the matching latest-rating leaderboard', async () => {
    mockService.findObservableAdvertisements.mockResolvedValue({
      success: true,
      data: {
        players: [
          rawPlayer(1001, 'SoloOne'),
          rawPlayer(1002, 'SoloTwo'),
          rawPlayer(2001, 'TeamOne'),
          rawPlayer(2002, 'TeamTwo'),
          rawPlayer(3001, 'CustomOne'),
        ],
        matches: [
          rawMatch(90001, 6, [1001, 1002]),
          rawMatch(90002, 7, [2001, 2002]),
          rawMatch(90003, 99, [3001]),
        ],
      },
    });
    mockPool.query.mockImplementation((sql, params) => {
      if (sql.includes('rating_leaderboard_mapping')) {
        return Promise.resolve({
          rows: [
            { match_type_id: 6, leaderboard_id: 3 },
            { match_type_id: 7, leaderboard_id: 4 },
          ],
        });
      }

      const leaderboardId = params[1];
      if (leaderboardId === 3) {
        return Promise.resolve({ rows: [{ profile_id: '1001', rating: 1500 }, { profile_id: '1002', rating: 1510 }] });
      }
      if (leaderboardId === 4) {
        return Promise.resolve({ rows: [{ profile_id: '2001', rating: 1800 }, { profile_id: '2002', rating: 1810 }] });
      }
      return Promise.resolve({ rows: [] });
    });

    const { handleLiveMatches } = require('./liveMatchHandler');
    const result = await handleLiveMatches('?profile_ids=1001,2001,3001');

    const solo = result.data.find((match) => match.match_id === 90001);
    const team = result.data.find((match) => match.match_id === 90002);
    const custom = result.data.find((match) => match.match_id === 90003);

    expect(solo.players.map((player) => player.rating)).toEqual([1500, 1510]);
    expect(team.players.map((player) => player.rating)).toEqual([1800, 1810]);
    expect(custom.players.map((player) => player.rating)).toEqual([null]);
    expect(mockPool.query).toHaveBeenCalledTimes(3);

    const mappingCall = mockPool.query.mock.calls.find((call) => call[0].includes('rating_leaderboard_mapping'));
    expect(mappingCall[1][0].sort()).toEqual([6, 7, 99]);

    const ratingCalls = mockPool.query.mock.calls.filter((call) => call[0].includes('player_latest_rating'));
    expect(ratingCalls.map((call) => call[1][1]).sort()).toEqual([3, 4]);
  });
});

describe('live match cache lifecycle', () => {
  const PAGE_SIZE = 200;
  const FAST_STARTS = [0, 200, 400, 600, 800];
  const BACKGROUND_STARTS = [1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800];

  let now;
  let dateSpy;
  let requestedStarts;
  let deferredByStart;

  const flush = async () => {
    for (let i = 0; i < 20; i++) await new Promise((resolve) => setImmediate(resolve));
  };

  // A page of `count` matches with ids unique per start offset
  const page = (start, count) => ({
    success: true,
    data: {
      players: [],
      matches: Array.from({ length: count }, (_, i) => {
        const matchId = 1_000_000 + start * 10 + i;
        return rawMatch(matchId, 6, [matchId * 10 + 1, matchId * 10 + 2]);
      }),
    },
  });

  const getDeferred = (start) => {
    let d = deferredByStart.get(start);
    if (!d) {
      let resolve;
      const promise = new Promise((r) => { resolve = r; });
      d = { promise, resolve };
      deferredByStart.set(start, d);
    }
    return d;
  };

  const resolvePage = (start, response) => getDeferred(start).resolve(response);

  // Every page request returns a promise resolved manually via resolvePage()
  const deferPages = () => {
    mockService.findObservableAdvertisements.mockImplementation((version, count, start) => {
      requestedStarts.push(start);
      return getDeferred(start).promise;
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    now = 1_000_000;
    dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);
    requestedStarts = [];
    deferredByStart = new Map();
    mockPool.query.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    dateSpy.mockRestore();
  });

  it('requests fast-phase pages concurrently', async () => {
    deferPages();
    const { handleLiveMatches } = require('./liveMatchHandler');

    const promise = handleLiveMatches();
    await flush();

    expect(new Set(requestedStarts)).toEqual(new Set(FAST_STARTS));

    resolvePage(0, page(0, 50)); // partial first page — dataset exhausted
    for (const start of FAST_STARTS.slice(1)) resolvePage(start, page(start, 0));

    const result = await promise;
    expect(result.data.length).toBe(50);
    expect(result.headers['X-Partial']).toBeUndefined();
  });

  it('keeps the response partial when a background page fails', async () => {
    mockService.findObservableAdvertisements.mockImplementation((version, count, start) => {
      requestedStarts.push(start);
      if (start <= 1000) return Promise.resolve(page(start, PAGE_SIZE)); // pages 0-5 full
      return Promise.resolve({ success: false, error: 'relic 500' });    // page 6+ fails
    });
    const { handleLiveMatches } = require('./liveMatchHandler');

    const first = await handleLiveMatches();
    expect(first.data.length).toBe(1000);
    expect(first.headers['X-Partial']).toBe('1');

    await flush(); // background phase: page 5 succeeds, page 6 fails mid-crawl
    now += 1_000;

    const second = await handleLiveMatches();
    expect(second.data.length).toBe(1200);
    expect(second.headers['X-Partial']).toBe('1'); // crawl failed partway — still incomplete
  });

  it('serves cached data instead of starting a second crawl while background pages are in flight', async () => {
    deferPages();
    const { handleLiveMatches } = require('./liveMatchHandler');

    const firstPromise = handleLiveMatches();
    for (const start of FAST_STARTS) resolvePage(start, page(start, PAGE_SIZE));
    const first = await firstPromise;
    expect(first.data.length).toBe(1000);
    expect(first.headers['X-Partial']).toBe('1');

    await flush(); // background phase begins, its pages still unresolved
    now += 61_000; // cache expired while the background phase is in flight

    const second = await handleLiveMatches();
    expect(second.data.length).toBe(1000);
    expect(requestedStarts.filter((s) => s === 0)).toHaveLength(1); // no second crawl

    // Background completes: page 5 partial (dataset ends there), rest empty
    resolvePage(1000, page(1000, 150));
    for (const start of BACKGROUND_STARTS.slice(1)) resolvePage(start, page(start, 0));
    await flush();

    now += 1_000;
    const third = await handleLiveMatches();
    expect(third.data.length).toBe(1150); // background merge survived
    expect(third.headers['X-Partial']).toBeUndefined();
  });
});
