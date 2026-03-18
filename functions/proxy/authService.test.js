// Set env vars BEFORE any imports/mocks so config.ts picks them up
process.env.RELIC_AUTH_STEAM_USER = 'test-user';
process.env.RELIC_AUTH_STEAM_PASS = 'test-pass';

jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('pino', () => () => ({
  child: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));
jest.mock('@google-cloud/firestore', () => ({ Firestore: jest.fn() }));

const mockAuthenticate = jest.fn();
jest.mock('./relicAuth', () => {
  return jest.fn().mockImplementation(() => ({ authenticate: mockAuthenticate }));
});

const mockGetSession = jest.fn();
const mockSaveSession = jest.fn();
const mockIsSessionValid = jest.fn();
jest.mock('./sessionManager', () => {
  return jest.fn().mockImplementation(() => ({
    getSession: mockGetSession,
    saveSession: mockSaveSession,
    isSessionValid: mockIsSessionValid,
  }));
});

jest.mock('./relicPlayerService', () => {
  return jest.fn().mockImplementation(() => ({ getRecentMatchSinglePlayerHistory: jest.fn() }));
});

// Helper to create a fresh module environment with custom mock implementations
function requireFreshAuthService({ isSessionValid, getSession, authenticate }) {
  jest.resetModules();
  jest.mock('dotenv', () => ({ config: jest.fn() }));
  jest.mock('pino', () => () => ({
    child: () => ({
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    })
  }));
  jest.mock('@google-cloud/firestore', () => ({ Firestore: jest.fn() }));
  jest.mock('./relicAuth', () => jest.fn().mockImplementation(() => ({ authenticate })));
  const mockSaveSessionFresh = jest.fn();
  jest.mock('./sessionManager', () => jest.fn().mockImplementation(() => ({
    getSession,
    saveSession: mockSaveSessionFresh,
    isSessionValid,
  })));
  jest.mock('./relicPlayerService', () => jest.fn().mockImplementation(() => ({ getRecentMatchSinglePlayerHistory: jest.fn() })));
  const freshService = require('./authService');
  return { freshService, mockSaveSessionFresh };
}

// Restore top-level mocks after any test that calls requireFreshAuthService (which resets modules)
function restoreTopLevelMocks() {
  jest.resetModules();
  jest.mock('dotenv', () => ({ config: jest.fn() }));
  jest.mock('pino', () => () => ({
    child: () => ({
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    })
  }));
  jest.mock('@google-cloud/firestore', () => ({ Firestore: jest.fn() }));
  jest.mock('./relicAuth', () => jest.fn().mockImplementation(() => ({ authenticate: mockAuthenticate })));
  jest.mock('./sessionManager', () => jest.fn().mockImplementation(() => ({
    getSession: mockGetSession,
    saveSession: mockSaveSession,
    isSessionValid: mockIsSessionValid,
  })));
  jest.mock('./relicPlayerService', () => jest.fn().mockImplementation(() => ({ getRecentMatchSinglePlayerHistory: jest.fn() })));
}

describe('authService — ensureAuthenticated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns existing session when valid session exists', async () => {
    const existingSession = {
      sessionId: 'existing-session',
      steamId64: '76561198012345678',
      steamUserName: 'testuser',
      base64Ticket: 'existing-ticket',
      expiry: Date.now() + 3600000,
      callNumber: 3,
      lastCallTime: Date.now()
    };
    mockGetSession.mockResolvedValue(existingSession);

    const authService = require('./authService');
    const result = await authService.ensureAuthenticated();

    expect(result).toBe(existingSession);
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it('authenticates and saves session when no session exists', async () => {
    mockGetSession.mockResolvedValue(null);
    const authResult = {
      sessionId: 'new-session',
      steamId64: '76561198012345678',
      steamUserName: 'testuser',
      base64Ticket: 'new-ticket'
    };
    mockAuthenticate.mockResolvedValue(authResult);

    const authService = require('./authService');
    const result = await authService.ensureAuthenticated();

    expect(mockAuthenticate).toHaveBeenCalledWith('test-user', 'test-pass');
    expect(mockSaveSession).toHaveBeenCalledWith(authResult);
    expect(result).toBe(authResult);
  });

  it('throws when Steam credentials are not configured', async () => {
    delete process.env.RELIC_AUTH_STEAM_USER;
    delete process.env.RELIC_AUTH_STEAM_PASS;

    const { freshService } = requireFreshAuthService({
      isSessionValid: jest.fn(),
      getSession: jest.fn().mockResolvedValue(null),
      authenticate: jest.fn(),
    });

    await expect(freshService.ensureAuthenticated()).rejects.toThrow('Steam credentials not configured');

    // Restore credentials and top-level mocks for subsequent tests
    process.env.RELIC_AUTH_STEAM_USER = 'test-user';
    process.env.RELIC_AUTH_STEAM_PASS = 'test-pass';
    restoreTopLevelMocks();
  });
});

describe('authService — withAuthRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns result on success without retry', async () => {
    // Provide a valid session so ensureAuthenticated is a no-op
    mockGetSession.mockResolvedValue({
      sessionId: 'valid',
      steamId64: '123',
      steamUserName: 'test',
      base64Ticket: 'ticket',
      expiry: Date.now() + 3600000,
      callNumber: 1,
      lastCallTime: Date.now(),
    });

    const authService = require('./authService');
    const fn = jest.fn().mockResolvedValue({ success: true, data: [1, 2, 3] });

    const result = await authService.withAuthRetry(fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true, data: [1, 2, 3] });
  });

  it('retries once on authFailure and returns second result', async () => {
    mockGetSession.mockResolvedValue({
      sessionId: 'valid',
      steamId64: '123',
      steamUserName: 'test',
      base64Ticket: 'ticket',
      expiry: Date.now() + 3600000,
      callNumber: 1,
      lastCallTime: Date.now(),
    });

    const authService = require('./authService');
    const fn = jest.fn()
      .mockResolvedValueOnce({ success: false, authFailure: true, error: 'auth failed' })
      .mockResolvedValueOnce({ success: true, data: ['retried'] });

    const result = await authService.withAuthRetry(fn);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ success: true, data: ['retried'] });
  });

  it('does not retry when failure is not auth-related', async () => {
    mockGetSession.mockResolvedValue({
      sessionId: 'valid',
      steamId64: '123',
      steamUserName: 'test',
      base64Ticket: 'ticket',
      expiry: Date.now() + 3600000,
      callNumber: 1,
      lastCallTime: Date.now(),
    });

    const authService = require('./authService');
    const fn = jest.fn().mockResolvedValue({ success: false, error: 'not auth' });

    const result = await authService.withAuthRetry(fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: false, error: 'not auth' });
  });
});

describe('authService — getAuthenticatedPlayerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns player service when session is already valid', async () => {
    mockIsSessionValid.mockResolvedValue(true);

    const authService = require('./authService');
    const result = await authService.getAuthenticatedPlayerService();

    expect(result).toBeDefined();
    expect(mockAuthenticate).not.toHaveBeenCalled();
    expect(mockSaveSession).not.toHaveBeenCalled();
  });

  it('authenticates when session is invalid and no last session', async () => {
    const authenticateFn = jest.fn();
    const getSessionFn = jest.fn().mockResolvedValue(null);
    const isSessionValidFn = jest.fn().mockResolvedValue(false);
    const authResult = {
      sessionId: 'fresh-session',
      steamId64: '76561198012345678',
      steamUserName: 'testuser',
      base64Ticket: 'fresh-ticket'
    };
    authenticateFn.mockResolvedValue(authResult);

    const { freshService, mockSaveSessionFresh } = requireFreshAuthService({
      isSessionValid: isSessionValidFn,
      getSession: getSessionFn,
      authenticate: authenticateFn,
    });

    const result = await freshService.getAuthenticatedPlayerService();

    expect(authenticateFn).toHaveBeenCalledWith('test-user', 'test-pass');
    expect(mockSaveSessionFresh).toHaveBeenCalledWith(authResult);
    expect(result).toBeDefined();
  });

  it('reuses existing ticket when last session has base64Ticket', async () => {
    const lastSession = {
      sessionId: 'old-session',
      steamId64: '76561198012345678',
      steamUserName: 'testuser',
      base64Ticket: 'reusable-ticket',
      expiry: Date.now() - 1000,
      callNumber: 5,
      lastCallTime: Date.now()
    };
    const authenticateFn = jest.fn();
    const authResult = {
      sessionId: 'renewed-session',
      steamId64: '76561198012345678',
      steamUserName: 'testuser',
      base64Ticket: 'reusable-ticket'
    };
    authenticateFn.mockResolvedValue(authResult);

    const { freshService, mockSaveSessionFresh } = requireFreshAuthService({
      isSessionValid: jest.fn().mockResolvedValue(false),
      getSession: jest.fn().mockResolvedValue(lastSession),
      authenticate: authenticateFn,
    });

    const result = await freshService.getAuthenticatedPlayerService();

    expect(authenticateFn).toHaveBeenCalledWith(
      'test-user',
      'test-pass',
      'reusable-ticket',
      { steamId64: '76561198012345678', steamUserName: 'testuser' }
    );
    expect(mockSaveSessionFresh).toHaveBeenCalledWith(authResult);
    expect(result).toBeDefined();
  });

  it('falls back to full auth when ticket reuse fails', async () => {
    const lastSession = {
      sessionId: 'old-session',
      steamId64: '76561198012345678',
      steamUserName: 'testuser',
      base64Ticket: 'bad-ticket',
      expiry: Date.now() - 1000,
      callNumber: 5,
      lastCallTime: Date.now()
    };
    const fallbackAuthResult = {
      sessionId: 'fallback-session',
      steamId64: '76561198012345678',
      steamUserName: 'testuser',
      base64Ticket: 'new-ticket'
    };
    const authenticateFn = jest.fn()
      .mockRejectedValueOnce(new Error('Ticket reuse failed'))
      .mockResolvedValueOnce(fallbackAuthResult);

    const { freshService, mockSaveSessionFresh } = requireFreshAuthService({
      isSessionValid: jest.fn().mockResolvedValue(false),
      getSession: jest.fn().mockResolvedValue(lastSession),
      authenticate: authenticateFn,
    });

    const result = await freshService.getAuthenticatedPlayerService();

    expect(authenticateFn).toHaveBeenCalledTimes(2);
    expect(authenticateFn).toHaveBeenLastCalledWith('test-user', 'test-pass');
    expect(mockSaveSessionFresh).toHaveBeenCalledWith(fallbackAuthResult);
    expect(result).toBeDefined();
  });
});
