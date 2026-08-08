const RelicPlayerService = require('./relicPlayerService');

jest.mock('./config', () => ({
  logger: {
    child: () => ({
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  },
}));

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe('RelicPlayerService serializer wrapping', () => {
  let service;
  let mockSessionManager;
  let fetchMock;
  let inFlight;
  let maxInFlight;

  beforeEach(() => {
    jest.clearAllMocks();
    inFlight = 0;
    maxInFlight = 0;

    let callNum = 100;
    mockSessionManager = {
      getSession: jest.fn(async () => ({ sessionId: 'sess-1', lastCallTime: Date.now() })),
      incrementCallNumber: jest.fn(async () => ++callNum),
      updateLastCallTime: jest.fn(async () => {}),
      handleAuthFailure: jest.fn(async () => {}),
    };

    fetchMock = jest.fn(() => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      // Resolve on a later event-loop turn so concurrency is observable; the
      // serializer must keep at most one fetch in flight at a time.
      return tick().then(() => {
        inFlight--;
        return {
          ok: true,
          status: 200,
          json: async () => [0, [], []], // [apiStatus=0, matches=[], players=[]]
          text: async () => '',
        };
      });
    });
    global.fetch = fetchMock;

    service = new RelicPlayerService();
    // sessionManager is created in the constructor; swap it for a mock.
    service.sessionManager = mockSessionManager;
  });

  it('serializes concurrent findObservableAdvertisements calls (one fetch in flight at a time)', async () => {
    const [r1, r2] = await Promise.all([
      service.findObservableAdvertisements(1, 50, 0),
      service.findObservableAdvertisements(1, 50, 200),
    ]);

    expect(maxInFlight).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    // incrementCallNumber runs inside each serialized closure.
    expect(mockSessionManager.incrementCallNumber).toHaveBeenCalledTimes(2);
  });

  it('serializes concurrent getRecentMatchSinglePlayerHistory calls', async () => {
    await Promise.all([
      service.getRecentMatchSinglePlayerHistory(['1']),
      service.getRecentMatchSinglePlayerHistory(['2']),
    ]);

    expect(maxInFlight).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mockSessionManager.incrementCallNumber).toHaveBeenCalledTimes(2);
  });

  it('serializes across different methods (live vs gamematch share one serializer)', async () => {
    await Promise.all([
      service.findObservableAdvertisements(1, 50, 0),
      service.getRecentMatchSinglePlayerHistory(['1']),
    ]);

    expect(maxInFlight).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('executes incrementCallNumber inside the serialized closure (after getSession)', async () => {
    // If incrementCallNumber ran outside the serializer, two concurrent calls
    // could both pass getSession before either serialized block acquired the lock.
    await service.findObservableAdvertisements(1, 50, 0);

    expect(mockSessionManager.getSession).toHaveBeenCalledTimes(1);
    expect(mockSessionManager.incrementCallNumber).toHaveBeenCalledTimes(1);
  });
});
