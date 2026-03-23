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
jest.mock('./matchProcessing', () => ({
  processMatch: jest.fn(),
}));
jest.mock('./config', () => ({
  log: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  getFirestoreClient: jest.fn(),
  getMatchDbPool: jest.fn().mockReturnValue(null),
}));
jest.mock('./matchHistoryDb', () => ({
  querySingleMatch: jest.fn(),
}));

const { getFirestoreClient } = require('./config');
const { processMatch } = require('./matchProcessing');
const {
  handleRawMatchHistory,
  handleMatchHistory,
  handlePersonalStats,
  handleRawMatch,
  handleMatch,
} = require('./matchHandlers');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchOk(data) {
  return {
    ok: true,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

function makeFetchError(status, text) {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(text || 'error'),
  };
}

function makeFirestoreDb({ docData = null, docExists = true } = {}) {
  const mockBatchSet = jest.fn();
  const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
  const mockBatch = jest.fn().mockReturnValue({
    set: mockBatchSet,
    commit: mockBatchCommit,
  });

  const mockGet = jest.fn().mockResolvedValue({
    exists: docExists,
    data: () => docData,
  });
  const mockDocRef = { get: mockGet, set: jest.fn() };
  const mockDoc = jest.fn().mockReturnValue(mockDocRef);
  const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

  const db = {
    collection: mockCollection,
    batch: mockBatch,
    _mocks: { mockBatchSet, mockBatchCommit, mockBatch, mockGet, mockDoc, mockCollection },
  };

  return db;
}

// Flush all pending setImmediate and setTimeout callbacks using fake timers
async function flushBackground() {
  // Advance past the setImmediate (fires background work) and any setTimeout delays
  await jest.advanceTimersByTimeAsync(200);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// handleRawMatchHistory
// ---------------------------------------------------------------------------
describe('handleRawMatchHistory', () => {
  it('returns data with 60s cache on success', async () => {
    const apiData = {
      matchHistoryStats: [],
      profiles: [],
    };
    mockFetch.mockResolvedValue(makeFetchOk(apiData));

    const result = await handleRawMatchHistory('12345');

    expect(result.data).toEqual(apiData);
    expect(result.headers['Cache-Control']).toBe('public, max-age=60');
    expect(result.headers['Vary']).toBe('Accept-Encoding');
  });

  it('queues background Firestore batch writes for matches', async () => {
    const db = makeFirestoreDb();
    getFirestoreClient.mockReturnValue(db);

    const apiData = {
      matchHistoryStats: [
        { id: 101, startgametime: 1000 },
        { id: 102, startgametime: 2000 },
      ],
      profiles: [{ profile_id: 12345, alias: 'Player1' }],
    };
    mockFetch.mockResolvedValue(makeFetchOk(apiData));

    const result = await handleRawMatchHistory('12345');

    // Response returns immediately without waiting for batch
    expect(result.data).toEqual(apiData);

    // Flush background work
    await flushBackground();

    expect(db._mocks.mockBatch).toHaveBeenCalled();
    expect(db._mocks.mockBatchSet).toHaveBeenCalled();
    expect(db._mocks.mockBatchCommit).toHaveBeenCalled();
  });

  it('throws on non-ok API response', async () => {
    mockFetch.mockResolvedValue(makeFetchError(503, 'Service Unavailable'));

    await expect(handleRawMatchHistory('12345')).rejects.toThrow('API responded with status 503');
  });

  it('handles empty matchHistoryStats (no batch writes)', async () => {
    const db = makeFirestoreDb();
    getFirestoreClient.mockReturnValue(db);

    const apiData = {
      matchHistoryStats: [],
      profiles: [],
    };
    mockFetch.mockResolvedValue(makeFetchOk(apiData));

    const result = await handleRawMatchHistory('12345');

    await flushBackground();

    expect(result.data).toEqual(apiData);
    expect(db._mocks.mockBatch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// handleMatchHistory
// ---------------------------------------------------------------------------
describe('handleMatchHistory', () => {
  it('returns processed matches sorted by start_time desc', async () => {
    const apiData = {
      matchHistoryStats: [
        { id: 1, startgametime: 1000 },
        { id: 2, startgametime: 2000 },
      ],
      profiles: [{ profile_id: 12345, alias: 'SortPlayer' }],
    };
    mockFetch.mockResolvedValue(makeFetchOk(apiData));

    processMatch
      .mockResolvedValueOnce({ id: '1', start_time: '2024-01-01T10:00:00Z' })
      .mockResolvedValueOnce({ id: '2', start_time: '2024-01-02T10:00:00Z' });

    const result = await handleMatchHistory('12345');

    expect(result.data.matches).toHaveLength(2);
    // Sorted descending: 2024-01-02 before 2024-01-01
    expect(result.data.matches[0].id).toBe('2');
    expect(result.data.matches[1].id).toBe('1');
  });

  it('finds correct profile alias', async () => {
    const apiData = {
      matchHistoryStats: [{ id: 1, startgametime: 1000 }],
      profiles: [
        { profile_id: 99, alias: 'OtherPlayer' },
        { profile_id: 12345, alias: 'CorrectAlias' },
      ],
    };
    mockFetch.mockResolvedValue(makeFetchOk(apiData));
    processMatch.mockResolvedValue({ id: '1', start_time: '2024-01-01T00:00:00Z' });

    const result = await handleMatchHistory('12345');

    expect(result.data.name).toBe('CorrectAlias');
    expect(result.data.id).toBe('12345');
  });

  it('falls back to profileId when profile not found', async () => {
    const apiData = {
      matchHistoryStats: [{ id: 1, startgametime: 1000 }],
      profiles: [{ profile_id: 99, alias: 'SomeOtherPlayer' }],
    };
    mockFetch.mockResolvedValue(makeFetchOk(apiData));
    processMatch.mockResolvedValue({ id: '1', start_time: '2024-01-01T00:00:00Z' });

    const result = await handleMatchHistory('12345');

    expect(result.data.name).toBe('12345');
  });
});

// ---------------------------------------------------------------------------
// handlePersonalStats
// ---------------------------------------------------------------------------
describe('handlePersonalStats', () => {
  it('returns API data with 60s cache', async () => {
    const statsData = { statGroups: [{ members: [] }] };
    mockFetch.mockResolvedValue(makeFetchOk(statsData));

    const result = await handlePersonalStats('12345');

    expect(result.data).toEqual(statsData);
    expect(result.headers['Cache-Control']).toBe('public, max-age=60');
    expect(result.headers['Vary']).toBe('Accept-Encoding');
  });
});

// ---------------------------------------------------------------------------
// handleRawMatch
// ---------------------------------------------------------------------------
describe('handleRawMatch', () => {
  it('returns matchData.raw when doc exists and has raw field', async () => {
    const rawMatch = { id: 42, startgametime: 9999 };
    const db = makeFirestoreDb({ docData: { raw: rawMatch, profiles: [] }, docExists: true });
    getFirestoreClient.mockReturnValue(db);

    const result = await handleRawMatch('42');

    expect(result.data).toEqual(rawMatch);
    expect(result.headers['Cache-Control']).toBe('public, max-age=86400');
  });

  it('throws "Match not found" when doc does not exist', async () => {
    const db = makeFirestoreDb({ docExists: false });
    getFirestoreClient.mockReturnValue(db);

    await expect(handleRawMatch('999')).rejects.toThrow('Match not found');
  });

  it('returns full matchData when no .raw field', async () => {
    const fullData = { id: 42, someField: 'value', profiles: [] };
    const db = makeFirestoreDb({ docData: fullData, docExists: true });
    getFirestoreClient.mockReturnValue(db);

    const result = await handleRawMatch('42');

    expect(result.data).toEqual(fullData);
  });
});

// ---------------------------------------------------------------------------
// handleMatch
// ---------------------------------------------------------------------------
describe('handleMatch', () => {
  it('returns processed match with no-cache headers', async () => {
    const rawMatch = { id: 77, startgametime: 5000 };
    const processedMatch = { id: '77', start_time: '2024-03-01T00:00:00Z', players: [] };
    const db = makeFirestoreDb({
      docData: { raw: rawMatch, profiles: [{ profile_id: 1, alias: 'Player' }] },
      docExists: true,
    });
    getFirestoreClient.mockReturnValue(db);
    processMatch.mockResolvedValue(processedMatch);

    const result = await handleMatch('77');

    expect(result.data).toEqual(processedMatch);
    expect(result.headers['Cache-Control']).toBe('no-cache, no-store, must-revalidate');
    expect(result.headers['Pragma']).toBe('no-cache');
    expect(result.headers['Expires']).toBe('0');
  });

  it('attaches APM data when present in doc', async () => {
    const rawMatch = { id: 88 };
    const processedMatch = { id: '88', start_time: '2024-03-01T00:00:00Z', players: [] };
    const apmData = { player1: 120, player2: 95 };
    const db = makeFirestoreDb({
      docData: { raw: rawMatch, profiles: [], apm: apmData },
      docExists: true,
    });
    getFirestoreClient.mockReturnValue(db);
    processMatch.mockResolvedValue(processedMatch);

    const result = await handleMatch('88');

    expect(result.data.apm).toEqual(apmData);
  });

  it('unwraps nested apm.apm when present', async () => {
    const rawMatch = { id: 99 };
    const processedMatch = { id: '99', start_time: '2024-03-01T00:00:00Z', players: [] };
    const innerApm = { player1: 140 };
    const db = makeFirestoreDb({
      docData: { raw: rawMatch, profiles: [], apm: { apm: innerApm } },
      docExists: true,
    });
    getFirestoreClient.mockReturnValue(db);
    processMatch.mockResolvedValue(processedMatch);

    const result = await handleMatch('99');

    expect(result.data.apm).toEqual(innerApm);
  });

  it('sets no-cache headers even when no APM data', async () => {
    const rawMatch = { id: 55 };
    const processedMatch = { id: '55', start_time: '2024-03-01T00:00:00Z', players: [] };
    const db = makeFirestoreDb({
      docData: { raw: rawMatch, profiles: [] },
      docExists: true,
    });
    getFirestoreClient.mockReturnValue(db);
    processMatch.mockResolvedValue(processedMatch);

    const result = await handleMatch('55');

    expect(result.data.apm).toBeUndefined();
    expect(result.headers['Cache-Control']).toBe('no-cache, no-store, must-revalidate');
  });
});
