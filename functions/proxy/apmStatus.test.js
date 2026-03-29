// Always mock fetch for rl_api_mappings.json
const mockFetch = jest.fn();
global.fetch = mockFetch;

mockFetch.mockImplementation((url) => {
  if (url && url.includes && url.includes('rl_api_mappings.json')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}) // minimal mapping object
    });
  }
  // fallback for other URLs
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    headers: { forEach: () => {} }
  });
});

// Mock the dependencies
jest.mock('@google-cloud/firestore', () => ({
  Firestore: jest.fn(() => ({
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: false,
          data: () => ({})
        }),
        set: jest.fn().mockResolvedValue({}),
      }),
    }),
  })),
}));

// Mock cors
jest.mock('cors', () => () => (req, res, callback) => callback());

// Mock pino logger
jest.mock('pino', () => () => ({
  child: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));

// Mock environment variables
process.env.APM_API_URL = 'https://test-apm-api.com';
process.env.STEAM_API_KEY = 'test-steam-key';

describe('New Analysis Routes', () => {
  it('should have match-analysis route', () => {
    const { routes } = require('./index');
    const matchAnalysisRoute = routes.find(r => r.pattern.toString().includes('match-analysis'));

    expect(matchAnalysisRoute).toBeDefined();
    expect(matchAnalysisRoute.pattern.test('/api/match-analysis/123')).toBe(true);
    expect(matchAnalysisRoute.pattern.test('/api/match-analysis/456?foo=bar')).toBe(true);
    expect(matchAnalysisRoute.pattern.test('/api/match-analysis/')).toBe(false);
  });

  it('should have analysis-status route', () => {
    const { routes } = require('./index');
    const analysisStatusRoute = routes.find(r => r.pattern.toString().includes('analysis-status'));

    expect(analysisStatusRoute).toBeDefined();
    expect(analysisStatusRoute.pattern.test('/api/analysis-status')).toBe(true);
    expect(analysisStatusRoute.pattern.test('/api/analysis-status?foo=bar')).toBe(true);
  });

  it('should NOT have deprecated check-replay route', () => {
    const { routes } = require('./index');
    const checkReplayRoute = routes.find(r => r.pattern.toString().includes('check-replay'));
    expect(checkReplayRoute).toBeUndefined();
  });

  it('should NOT have deprecated apm-status route', () => {
    const { routes } = require('./index');
    const apmStatusRoute = routes.find(r => r.pattern.toString().includes('apm-status'));
    expect(apmStatusRoute).toBeUndefined();
  });

  it('should NOT have deprecated replay-download route', () => {
    const { routes } = require('./index');
    const replayDownloadRoute = routes.find(r => r.pattern.toString().includes('replay-download'));
    expect(replayDownloadRoute).toBeUndefined();
  });

  it('should NOT export deprecated functions', () => {
    const exports = require('./index');
    expect(exports.checkApmStatus).toBeUndefined();
    expect(exports.checkReplayAvailability).toBeUndefined();
    expect(exports.handleReplayDownload).toBeUndefined();
  });
});
