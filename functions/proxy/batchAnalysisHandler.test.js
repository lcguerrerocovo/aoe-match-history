process.env.NODE_ENV = 'test';

const mockFetch = jest.fn();
global.fetch = mockFetch;
mockFetch.mockImplementation((url) => {
  if (url && url.includes && url.includes('rl_api_mappings.json')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }
  return Promise.resolve({ ok: true, text: () => Promise.resolve('{}'), json: () => Promise.resolve({}), headers: { forEach: () => {} } });
});

jest.mock('@google-cloud/firestore', () => ({
  Firestore: jest.fn(() => ({
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
        set: jest.fn().mockResolvedValue({}),
      }),
    }),
  })),
}));

jest.mock('cors', () => () => (req, res, callback) => callback());
jest.mock('pino', () => () => ({
  child: () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() })
}));

process.env.APM_API_URL = 'https://test-apm-api.com';
process.env.STEAM_API_KEY = 'test-steam-key';

const mockGetAll = jest.fn();
jest.mock('./config', () => ({
  log: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
  getFirestoreClient: jest.fn(() => ({
    getAll: mockGetAll,
    collection: jest.fn().mockReturnValue({
      doc: jest.fn((id) => ({ id })),
    }),
  })),
  getMatchDbPool: jest.fn(() => null),
}));

jest.mock('./matchHandlers', () => ({
  handleRawMatchHistory: jest.fn(),
}));
jest.mock('./replayService', () => ({
  processReplayForMatch: jest.fn(),
}));

const { handleBatchAnalysis, _resetDebounce } = require('./batchAnalysisHandler');
const { handleRawMatchHistory } = require('./matchHandlers');
const { processReplayForMatch } = require('./replayService');
const { analysisTracker } = require('./analysisTracker');

describe('handleBatchAnalysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    analysisTracker.clear();
    _resetDebounce();
    mockGetAll.mockResolvedValue([]);
  });

  it('returns accepted immediately', async () => {
    handleRawMatchHistory.mockResolvedValue({
      data: { matchHistoryStats: [], profiles: [] },
    });
    const result = await handleBatchAnalysis('12345');
    expect(result.data.accepted).toBe(true);
  });

  it('skips matches that already have analysis in Firestore', async () => {
    handleRawMatchHistory.mockResolvedValue({
      data: {
        matchHistoryStats: [
          { id: 100, matchhistoryreportresults: [{ profile_id: 12345 }] },
          { id: 101, matchhistoryreportresults: [{ profile_id: 12345 }] },
        ],
        profiles: [],
      },
    });

    mockGetAll.mockResolvedValue([
      { exists: true, id: '100', data: () => ({ apm: { players: {} } }) },
      { exists: false, id: '101' },
    ]);

    processReplayForMatch.mockResolvedValue('success');

    await handleBatchAnalysis('12345');
    await new Promise(r => setTimeout(r, 50));

    expect(processReplayForMatch).toHaveBeenCalledWith('101', '12345');
    expect(processReplayForMatch).not.toHaveBeenCalledWith('100', expect.anything());
  });

  it('debounces repeated calls for same profile within 10 minutes', async () => {
    handleRawMatchHistory.mockResolvedValue({
      data: {
        matchHistoryStats: [
          { id: 100, matchhistoryreportresults: [{ profile_id: 12345 }] },
        ],
        profiles: [],
      },
    });
    processReplayForMatch.mockResolvedValue('success');

    await handleBatchAnalysis('12345');
    await new Promise(r => setTimeout(r, 50));

    const result2 = await handleBatchAnalysis('12345');
    expect(result2.data.accepted).toBe(true);
    expect(result2.data.debounced).toBe(true);
  });

  it('pass 1 tries profile owner, pass 2 tries one other player', async () => {
    handleRawMatchHistory.mockResolvedValue({
      data: {
        matchHistoryStats: [
          { id: 100, matchhistoryreportresults: [{ profile_id: 12345 }, { profile_id: 999 }] },
        ],
        profiles: [],
      },
    });

    processReplayForMatch
      .mockResolvedValueOnce('not_found')
      .mockResolvedValueOnce('success');

    await handleBatchAnalysis('12345');
    await new Promise(r => setTimeout(r, 50));

    expect(processReplayForMatch).toHaveBeenCalledWith('100', '12345');
    expect(processReplayForMatch).toHaveBeenCalledWith('100', '999');
  });
});
