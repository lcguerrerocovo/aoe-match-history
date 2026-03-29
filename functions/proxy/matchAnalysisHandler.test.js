const mockFetch = jest.fn();
global.fetch = mockFetch;
mockFetch.mockImplementation((url) => {
  if (url && url.includes && url.includes('rl_api_mappings.json')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }
  return Promise.resolve({ ok: true, text: () => Promise.resolve('{}'), json: () => Promise.resolve({}), headers: { forEach: () => {} } });
});

jest.mock('@google-cloud/firestore', () => ({
  Firestore: jest.fn(() => ({})),
}));

jest.mock('cors', () => () => (req, res, callback) => callback());
jest.mock('pino', () => () => ({
  child: () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() })
}));

process.env.APM_API_URL = 'https://test-apm-api.com';
process.env.STEAM_API_KEY = 'test-steam-key';

const mockDocGet = jest.fn();
const mockDocSet = jest.fn();
jest.mock('./config', () => ({
  log: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
  getFirestoreClient: jest.fn(() => ({
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: mockDocGet,
        set: mockDocSet,
      }),
    }),
  })),
}));

jest.mock('./matchHandlers', () => ({
  handleMatch: jest.fn(),
}));
jest.mock('./replayService', () => ({
  processReplayForMatch: jest.fn(),
}));

const { handleMatchAnalysis } = require('./matchAnalysisHandler');
const { handleMatch } = require('./matchHandlers');
const { processReplayForMatch } = require('./replayService');
const { analysisTracker } = require('./analysisTracker');

describe('handleMatchAnalysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    analysisTracker.clear();
    mockDocGet.mockResolvedValue({ exists: false, data: () => ({}) });
    mockDocSet.mockResolvedValue({});

    handleMatch.mockResolvedValue({
      data: {
        match_id: '100',
        players: [
          { user_id: '111', name: 'Alice' },
          { user_id: '222', name: 'Bob' },
        ],
        apm: undefined,
      },
    });
  });

  it('returns complete with APM data when match already has it', async () => {
    handleMatch.mockResolvedValue({
      data: {
        match_id: '100',
        players: [
          { user_id: '111', name: 'Alice' },
          { user_id: '222', name: 'Bob' },
        ],
        apm: {
          players: { '111': [{ minute: 0, total: 50 }] },
          averages: { '111': 50 },
        },
      },
    });

    const result = await handleMatchAnalysis('100');
    expect(result.data.status).toBe('complete');
    expect(result.data.apm).toBeDefined();
    expect(result.data.apm.players['111']).toBeDefined();
  });

  it('returns unavailable when noReplay marker exists in Firestore', async () => {
    mockDocGet.mockResolvedValue({ exists: true, data: () => ({ noReplay: true }) });

    const result = await handleMatchAnalysis('100');
    expect(result.data.status).toBe('unavailable');
    expect(processReplayForMatch).not.toHaveBeenCalled();
  });

  it('returns processing and kicks off background analysis when no APM exists', async () => {
    processReplayForMatch.mockResolvedValue('success');

    const result = await handleMatchAnalysis('100');
    expect(result.data.status).toBe('processing');
  });

  it('returns processing for in-flight matches without re-triggering', async () => {
    analysisTracker.markInFlight('100');

    const result = await handleMatchAnalysis('100');
    expect(result.data.status).toBe('processing');
    expect(processReplayForMatch).not.toHaveBeenCalled();
  });

  it('returns unavailable when match has no players', async () => {
    handleMatch.mockResolvedValue({
      data: { match_id: '100', players: [] },
    });

    const result = await handleMatchAnalysis('100');
    expect(result.data.status).toBe('unavailable');
  });

  it('marks noReplay in Firestore when no player has a replay', async () => {
    processReplayForMatch.mockResolvedValue('not_found');

    await handleMatchAnalysis('100');
    // Wait for background processing
    await new Promise(r => setTimeout(r, 50));

    expect(mockDocSet).toHaveBeenCalledWith({ noReplay: true }, { merge: true });
  });
});
