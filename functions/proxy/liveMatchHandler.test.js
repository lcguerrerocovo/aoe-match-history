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
