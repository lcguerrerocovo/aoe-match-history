'use strict';

jest.mock('pino', () => () => ({
  child: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('@google-cloud/firestore', () => ({ Firestore: jest.fn() }));

const mockGet = jest.fn();
jest.mock('./config', () => ({
  log: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
  getFirestoreClient: jest.fn(() => ({
    collection: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      get: mockGet,
    })),
  })),
}));

const mockGetAuthenticatedPlayerService = jest.fn();
const mockWithAuthRetry = jest.fn((fn) => fn());
jest.mock('./authService', () => ({
  withAuthRetry: (...args) => mockWithAuthRetry(...args),
  getAuthenticatedPlayerService: (...args) => mockGetAuthenticatedPlayerService(...args),
}));

const mockGetCivMap = jest.fn().mockResolvedValue({});
const mockGetMapMap = jest.fn().mockResolvedValue({});
const mockGroupPlayersIntoTeams = jest.fn().mockReturnValue([]);
const mockResolveMap = jest.fn().mockReturnValue({ id: null, name: '' });
jest.mock('./matchProcessing', () => ({
  getCivMap: (...args) => mockGetCivMap(...args),
  getMapMap: (...args) => mockGetMapMap(...args),
  groupPlayersIntoTeams: (...args) => mockGroupPlayersIntoTeams(...args),
  resolveMap: (...args) => mockResolveMap(...args),
}));

const { handleGameMatchHistory, handleProcessedGameMatchHistory } = require('./gameMatchHandlers');

describe('handleGameMatchHistory', () => {
  let mockGetHistory;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHistory = jest.fn();
    mockGetAuthenticatedPlayerService.mockResolvedValue({
      getRecentMatchSinglePlayerHistory: mockGetHistory,
    });
  });

  it('returns data from authenticated service on success', async () => {
    const matches = [{ match_id: 1, start_time: 1000, end_time: 2000 }];
    mockGetHistory.mockResolvedValue({ success: true, data: matches });

    const result = await handleGameMatchHistory('123');

    expect(mockWithAuthRetry).toHaveBeenCalledTimes(1);
    expect(mockGetHistory).toHaveBeenCalledWith(['123']);
    expect(result.data).toEqual(matches);
    expect(result.headers['Cache-Control']).toBe('private, max-age=60');
    expect(result.headers['Vary']).toBe('Accept-Encoding');
  });

  it('delegates retry logic to withAuthRetry', async () => {
    const matches = [{ match_id: 2, start_time: 1000, end_time: 2000 }];
    mockGetHistory.mockResolvedValue({ success: true, data: matches });

    await handleGameMatchHistory('456');

    // Verify that the function passed to withAuthRetry calls the service
    expect(mockWithAuthRetry).toHaveBeenCalledWith(expect.any(Function));
    expect(mockGetAuthenticatedPlayerService).toHaveBeenCalled();
  });

  it('propagates errors from withAuthRetry', async () => {
    mockWithAuthRetry.mockRejectedValueOnce(new Error('Server Error'));

    await expect(handleGameMatchHistory('123')).rejects.toThrow('Server Error');
  });

  it('throws when no profile IDs provided', async () => {
    await expect(handleGameMatchHistory('')).rejects.toThrow('No profile IDs provided');
    expect(mockWithAuthRetry).not.toHaveBeenCalled();
  });
});

describe('handleProcessedGameMatchHistory', () => {
  let mockGetHistory;

  const makeMatch = (overrides = {}) => ({
    match_id: 100,
    map_id: 9,
    map_name: 'Arabia',
    name: 'Test Match',
    start_time: 1700000000,
    end_time: 1700003600,
    settings: null,
    players: [],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHistory = jest.fn();
    mockGetAuthenticatedPlayerService.mockResolvedValue({
      getRecentMatchSinglePlayerHistory: mockGetHistory,
    });
    mockGetCivMap.mockResolvedValue({ '1': 'Britons', '2': 'Franks' });
    mockGetMapMap.mockResolvedValue({ '9': 'Arabia' });
    mockResolveMap.mockReturnValue({ id: 9, name: 'Arabia' });
    mockGroupPlayersIntoTeams.mockReturnValue([]);
    // Firestore returns empty by default
    mockGet.mockResolvedValue({ forEach: jest.fn() });
  });

  it('transforms matches with alias resolution', async () => {
    const profileId = '42';
    const player = { 'profileInfo.id': 42, metaData: { civId: '1', colorId: 3, teamId: '0' } };
    const match = makeMatch({ players: [player] });
    mockGetHistory.mockResolvedValue({ success: true, data: [match] });

    // Firestore returns alias for player 42
    mockGet.mockResolvedValue({
      forEach: (cb) => cb({ data: () => ({ profile_id: 42, alias: 'MyAlias' }) }),
    });

    const result = await handleProcessedGameMatchHistory(profileId);

    expect(result.data.matches).toHaveLength(1);
    expect(result.data.matches[0].players[0].name).toBe('MyAlias');
    expect(result.data.matches[0].players[0].user_id).toBe('42');
  });

  it('falls back to profileId when alias not found', async () => {
    const profileId = '99';
    const player = { 'profileInfo.id': 99, metaData: { civId: '2', colorId: 1, teamId: '1' } };
    const match = makeMatch({ players: [player] });
    mockGetHistory.mockResolvedValue({ success: true, data: [match] });

    // Firestore returns nothing for this player
    mockGet.mockResolvedValue({ forEach: jest.fn() });

    const result = await handleProcessedGameMatchHistory(profileId);

    expect(result.data.matches[0].players[0].name).toBe('99');
  });

  it('sorts matches by start_time descending', async () => {
    const match1 = makeMatch({ match_id: 1, start_time: 1700000000, end_time: 1700001000 });
    const match2 = makeMatch({ match_id: 2, start_time: 1700005000, end_time: 1700006000 });
    const match3 = makeMatch({ match_id: 3, start_time: 1700002000, end_time: 1700003000 });
    mockGetHistory.mockResolvedValue({ success: true, data: [match1, match2, match3] });

    const result = await handleProcessedGameMatchHistory('1');

    const startTimes = result.data.matches.map((m) => m.start_time);
    expect(startTimes).toEqual([...startTimes].sort((a, b) => b.localeCompare(a)));
  });

  it('handles empty match list', async () => {
    mockGetHistory.mockResolvedValue({ success: true, data: [] });

    const result = await handleProcessedGameMatchHistory('1');

    expect(result.data.matches).toEqual([]);
    expect(result.data.id).toBe('1');
  });
});
