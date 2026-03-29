// Mock dependencies before requiring module under test
const mockQuery = jest.fn();
const mockPool = { query: mockQuery };

jest.mock('./config', () => ({
  log: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
  getMatchDbPool: jest.fn(() => mockPool),
}));

jest.mock('./matchHandlers', () => ({
  handleRawMatchHistory: jest.fn(),
}));

jest.mock('./replayService', () => ({
  processReplayForMatch: jest.fn(),
}));

jest.mock('./analysisTracker', () => ({
  analysisTracker: {
    isInFlight: jest.fn(() => false),
    markInFlight: jest.fn(),
    markDone: jest.fn(),
  },
}));

const { handleBatchAnalysis } = require('./batchAnalysisHandler');
const { handleRawMatchHistory } = require('./matchHandlers');
const { processReplayForMatch } = require('./replayService');
const { analysisTracker } = require('./analysisTracker');

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.mockReset();
  analysisTracker.isInFlight.mockReturnValue(false);
});

describe('handleBatchAnalysis', () => {
  it('returns started: true immediately', async () => {
    handleRawMatchHistory.mockResolvedValue({
      data: { matchHistoryStats: [] },
      headers: {},
    });

    const result = await handleBatchAnalysis('12345');
    expect(result.data.started).toBe(true);
    expect(result.headers['Cache-Control']).toContain('no-cache');
  });

  it('processes matches that do not have APM', async () => {
    const rawMatches = [
      {
        id: 100,
        matchhistoryreportresults: [
          { profile_id: 1001 },
          { profile_id: 1002 },
        ],
      },
      {
        id: 200,
        matchhistoryreportresults: [
          { profile_id: 2001 },
        ],
      },
    ];

    handleRawMatchHistory.mockResolvedValue({
      data: { matchHistoryStats: rawMatches },
      headers: {},
    });

    // No matches have APM yet
    mockQuery.mockResolvedValue({ rows: [] });

    processReplayForMatch.mockResolvedValue(true);

    await handleBatchAnalysis('12345');

    // Wait for fire-and-forget to complete
    await new Promise(r => setTimeout(r, 50));

    expect(handleRawMatchHistory).toHaveBeenCalledWith('12345');
    // Should have batch-checked via PostgreSQL
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('has_apm = TRUE'),
      expect.any(Array)
    );
    // Should have attempted processReplayForMatch for first match's first player
    expect(processReplayForMatch).toHaveBeenCalledWith('100', '1001');
  });

  it('skips matches that already have APM', async () => {
    const rawMatches = [
      {
        id: 100,
        matchhistoryreportresults: [{ profile_id: 1001 }],
      },
      {
        id: 200,
        matchhistoryreportresults: [{ profile_id: 2001 }],
      },
    ];

    handleRawMatchHistory.mockResolvedValue({
      data: { matchHistoryStats: rawMatches },
      headers: {},
    });

    // Match 100 already has APM
    mockQuery.mockResolvedValue({ rows: [{ match_id: '100' }] });

    processReplayForMatch.mockResolvedValue(true);

    await handleBatchAnalysis('12345');
    await new Promise(r => setTimeout(r, 50));

    // Should skip match 100, process match 200
    expect(processReplayForMatch).not.toHaveBeenCalledWith('100', expect.any(String));
    expect(processReplayForMatch).toHaveBeenCalledWith('200', '2001');
  });

  it('skips in-flight matches', async () => {
    const rawMatches = [
      {
        id: 100,
        matchhistoryreportresults: [{ profile_id: 1001 }],
      },
    ];

    handleRawMatchHistory.mockResolvedValue({
      data: { matchHistoryStats: rawMatches },
      headers: {},
    });

    mockQuery.mockResolvedValue({ rows: [] });
    analysisTracker.isInFlight.mockReturnValue(true);

    await handleBatchAnalysis('12345');
    await new Promise(r => setTimeout(r, 50));

    expect(processReplayForMatch).not.toHaveBeenCalled();
  });

  it('stops batch when no replay found for a match', async () => {
    const rawMatches = [
      {
        id: 100,
        matchhistoryreportresults: [{ profile_id: 1001 }],
      },
      {
        id: 200,
        matchhistoryreportresults: [{ profile_id: 2001 }],
      },
    ];

    handleRawMatchHistory.mockResolvedValue({
      data: { matchHistoryStats: rawMatches },
      headers: {},
    });

    mockQuery.mockResolvedValue({ rows: [] });
    processReplayForMatch.mockResolvedValue(false);

    await handleBatchAnalysis('12345');
    await new Promise(r => setTimeout(r, 50));

    // Should try match 100 but not match 200 (stop condition)
    expect(processReplayForMatch).toHaveBeenCalledWith('100', '1001');
    expect(processReplayForMatch).not.toHaveBeenCalledWith('200', expect.any(String));
  });

  it('tries multiple players per match', async () => {
    const rawMatches = [
      {
        id: 100,
        matchhistoryreportresults: [
          { profile_id: 1001 },
          { profile_id: 1002 },
        ],
      },
    ];

    handleRawMatchHistory.mockResolvedValue({
      data: { matchHistoryStats: rawMatches },
      headers: {},
    });

    mockQuery.mockResolvedValue({ rows: [] });
    // First player fails, second succeeds
    processReplayForMatch
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await handleBatchAnalysis('12345');
    await new Promise(r => setTimeout(r, 50));

    expect(processReplayForMatch).toHaveBeenCalledWith('100', '1001');
    expect(processReplayForMatch).toHaveBeenCalledWith('100', '1002');
  });

  it('handles no matches gracefully', async () => {
    handleRawMatchHistory.mockResolvedValue({
      data: { matchHistoryStats: [] },
      headers: {},
    });

    await handleBatchAnalysis('12345');
    await new Promise(r => setTimeout(r, 50));

    expect(processReplayForMatch).not.toHaveBeenCalled();
  });
});
