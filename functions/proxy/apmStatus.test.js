const { checkApmStatus, getFirestoreClient, checkReplayAvailability } = require('./index');

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
          exists: true,
                  data: () => ({
          raw: {
            players: [
              { user_id: '123', name: 'Player1' },
              { user_id: '456', name: 'Player2' }
            ],
            matchhistoryreportresults: [
              { profile_id: 123, teamid: 0, resulttype: 1, civilization_id: 1 },
              { profile_id: 456, teamid: 1, resulttype: 0, civilization_id: 2 }
            ],
            matchhistorymember: [],
            matchurls: [],
            slotinfo: undefined,
            options: undefined,
            mapname: undefined,
            id: 123,
            startgametime: 0,
            completiontime: 1,
            description: 'AUTOMATCH',
            matchtype_id: 0,
            maxplayers: 2
          },
          profiles: []
        })
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



// Helper to create a mock Firestore doc
function mockFirestoreDoc(apmExists) {
  return {
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({
          exists: apmExists,
          data: () => (apmExists ? {
            apm: {
              players: { '123': [{ minute: 0, total: 100 }] }  // Actual APM data structure
            }
          } : {}),
        }),
      }),
    }),
  };
}

describe('checkApmStatus unit', () => {
  let getFirestoreClientSpy;
  let checkReplayAvailabilitySpy;

  beforeEach(() => {
    jest.clearAllMocks();

    // Spy on the internal function calls
    getFirestoreClientSpy = jest.spyOn(require('./index'), 'getFirestoreClient');
    checkReplayAvailabilitySpy = jest.spyOn(require('./index'), 'checkReplayAvailability');
  });

  afterEach(() => {
    getFirestoreClientSpy.mockRestore();
    checkReplayAvailabilitySpy.mockRestore();
  });

  it('returns greyStatus when no APM data and no save game', async () => {
    const result = await checkApmStatus('123', '456', {
      getFirestoreClient: () => mockFirestoreDoc(false),
      checkReplayAvailability: async () => false
    });
    expect(result.state).toBe('greyStatus');
  });

  it('returns silverStatus when no APM data but save game exists', async () => {
    const result = await checkApmStatus('123', '456', {
      getFirestoreClient: () => mockFirestoreDoc(false),
      checkReplayAvailability: async () => true
    });
    expect(result.state).toBe('silverStatus');
  });

  it('returns bronzeStatus when APM data exists in Firestore', async () => {
    const result = await checkApmStatus('123', '456', {
      getFirestoreClient: () => mockFirestoreDoc(true),
      checkReplayAvailability: async () => true // Should not matter
    });
    expect(result.state).toBe('bronzeStatus');
  });

  it('full scenario: after replay download, status becomes bronzeStatus', async () => {
    // 1. Initially, no APM data, save game exists
    let result = await checkApmStatus('123', '456', {
      getFirestoreClient: () => mockFirestoreDoc(false),
      checkReplayAvailability: async () => true
    });
    expect(result.state).toBe('silverStatus');

    // 2. Simulate replay download (APM data is now in Firestore)
    result = await checkApmStatus('123', '456', {
      getFirestoreClient: () => mockFirestoreDoc(true),
      checkReplayAvailability: async () => true
    });
    expect(result.state).toBe('bronzeStatus');
  });
});

describe('APM Status Match Route', () => {
  it('should handle route pattern matching', () => {
    const { proxy } = require('./index');

    // Test that the route pattern exists and can be matched
    const routes = require('./index').routes || [];
    const apmStatusMatchRoute = routes.find(r => r.pattern.toString().includes('apm-status-match'));

    expect(apmStatusMatchRoute).toBeDefined();
    expect(apmStatusMatchRoute.pattern.test('/api/apm-status-match/123')).toBe(true);
    expect(apmStatusMatchRoute.pattern.test('/api/apm-status-match/456')).toBe(true);
    expect(apmStatusMatchRoute.pattern.test('/api/apm-status/123/456')).toBe(false);
  });

  it('should test the route handler logic', async () => {
    const routes = require('./index').routes || [];
    const apmStatusMatchRoute = routes.find(r => r.pattern.toString().includes('apm-status-match'));

    // Mock the dependencies
    const handleMatchSpy = jest.spyOn(require('./index'), 'handleMatch');
    const checkApmStatusSpy = jest.spyOn(require('./index'), 'checkApmStatus');

    handleMatchSpy.mockResolvedValue({
      data: {
        players: [
          { user_id: '123', name: 'Player1' },
          { user_id: '456', name: 'Player2' }
        ],
        matchhistoryreportresults: [
          { profile_id: 123, teamid: 0, resulttype: 1, civilization_id: 1 },
          { profile_id: 456, teamid: 1, resulttype: 0, civilization_id: 2 }
        ],
        matchhistorymember: [],
        matchurls: [],
        slotinfo: undefined,
        options: undefined,
        mapname: undefined,
        id: 123,
        startgametime: 0,
        completiontime: 1,
        description: 'AUTOMATCH',
        matchtype_id: 0,
        maxplayers: 2
      }
    });

    checkApmStatusSpy
      .mockResolvedValueOnce({ hasSaveGame: false, isProcessed: false, state: 'greyStatus' })
      .mockResolvedValueOnce({ hasSaveGame: true, isProcessed: false, state: 'silverStatus' });

    // Call the route handler directly
    const result = await apmStatusMatchRoute.handler('123');

    expect(result.data).toEqual({
      gameId: '123',
      profileId: '123',
      hasSaveGame: true,
      isProcessed: false,
      state: 'silverStatus'
    });

    handleMatchSpy.mockRestore();
    checkApmStatusSpy.mockRestore();
  });
});

describe('Replay Download with Multiple Players', () => {
  it('should handle route pattern matching', () => {
    const { proxy } = require('./index');

    // Test that the route pattern exists and can be matched
    const routes = require('./index').routes || [];
    const replayDownloadRoute = routes.find(r => r.pattern.toString().includes('replay-download'));

    expect(replayDownloadRoute).toBeDefined();
    expect(replayDownloadRoute.pattern.test('/api/replay-download/123/456')).toBe(true);
    expect(replayDownloadRoute.pattern.test('/api/replay-download/789/012')).toBe(true);
    expect(replayDownloadRoute.pattern.test('/api/apm-status/123/456')).toBe(false);
  });

  it('should test the route handler exists', () => {
    const routes = require('./index').routes || [];
    const replayDownloadRoute = routes.find(r => r.pattern.toString().includes('replay-download'));

    expect(replayDownloadRoute.handler).toBeDefined();
    expect(typeof replayDownloadRoute.handler).toBe('function');
  });
});

describe('handleReplayDownload with replayData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-setup the base fetch mock
    mockFetch.mockImplementation((url) => {
      if (url && url.includes && url.includes('rl_api_mappings.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          matchId: '123',
          apm: { players: { '456': [{ minute: 0, total: 10 }] }, averages: { '456': 10 } }
        })),
        json: () => Promise.resolve({}),
        headers: { forEach: () => {} }
      });
    });
  });

  it('should forward client-provided replayData to APM without downloading from aoe.ms', async () => {
    const { handleReplayDownload } = require('./index');
    const fakeBase64 = Buffer.from('fake replay data').toString('base64');
    const result = await handleReplayDownload('123', '456', fakeBase64);

    expect(result.data.downloaded).toBe(true);
    expect(result.data.profileId).toBe('456');
  });

  it('should reject invalid base64 replayData', async () => {
    const { handleReplayDownload } = require('./index');
    const result = await handleReplayDownload('123', '456', '!!!not-base64!!!');

    expect(result.data.downloaded).toBe(false);
    expect(result.data.error).toBe('Invalid replay data');
  });

  it('should reject oversized replayData', async () => {
    const { handleReplayDownload } = require('./index');
    // Create a base64 string that decodes to > 10MB
    const bigBuffer = Buffer.alloc(11 * 1024 * 1024);
    const bigBase64 = bigBuffer.toString('base64');
    const result = await handleReplayDownload('123', '456', bigBase64);

    expect(result.data.downloaded).toBe(false);
    expect(result.data.error).toBe('Replay data too large');
  });
});
