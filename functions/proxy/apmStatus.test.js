const { checkApmStatus, getFirestoreClient, checkReplayAvailability } = require('./index');

// Mock the dependencies
jest.mock('@google-cloud/firestore', () => ({
  Firestore: jest.fn(),
}));

jest.mock('node-fetch', () => jest.fn());

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