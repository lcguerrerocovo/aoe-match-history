const mockFetch = jest.fn();
global.fetch = mockFetch;
mockFetch.mockImplementation((url) => {
  if (url && url.includes && url.includes('rl_api_mappings.json')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }
  return Promise.resolve({ ok: true, text: () => Promise.resolve('{}'), json: () => Promise.resolve({}), headers: { forEach: () => {} } });
});

jest.mock('cors', () => () => (req, res, callback) => callback());
jest.mock('pino', () => () => ({
  child: () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() })
}));

const mockGetAll = jest.fn();
jest.mock('./config', () => ({
  log: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
  getFirestoreClient: jest.fn(() => ({
    getAll: mockGetAll,
    collection: jest.fn().mockReturnValue({
      doc: jest.fn((id) => ({ id })),
    }),
  })),
}));

process.env.APM_API_URL = 'https://test-apm-api.com';
process.env.STEAM_API_KEY = 'test-steam-key';

const { handleAnalysisStatus } = require('./analysisStatusHandler');

describe('handleAnalysisStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns analyzed match IDs that have apm field', async () => {
    mockGetAll.mockResolvedValue([
      { exists: true, id: '100', data: () => ({ apm: { players: {} } }) },
      { exists: true, id: '200', data: () => ({ raw: {} }) },
      { exists: false, id: '300' },
    ]);

    const result = await handleAnalysisStatus({ matchIds: ['100', '200', '300'] });
    expect(result.data.analyzed).toEqual(['100']);
  });

  it('returns empty array when no matches have analysis', async () => {
    mockGetAll.mockResolvedValue([
      { exists: true, id: '100', data: () => ({ raw: {} }) },
    ]);

    const result = await handleAnalysisStatus({ matchIds: ['100'] });
    expect(result.data.analyzed).toEqual([]);
  });

  it('returns empty array for empty input', async () => {
    const result = await handleAnalysisStatus({ matchIds: [] });
    expect(result.data.analyzed).toEqual([]);
  });
});
