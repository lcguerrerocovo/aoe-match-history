const SessionManager = require('./sessionManager');
const { Firestore } = require('@google-cloud/firestore');

// Mock Firestore
jest.mock('@google-cloud/firestore');
jest.mock('pino', () => () => ({
  child: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));

describe('SessionManager', () => {
  let sessionManager;
  let mockCollection;
  let mockDoc;
  let mockTransaction;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock Firestore
    mockDoc = {
      exists: true,
      _data: { callNumber: 5 },
      data: jest.fn(function() { return this._data; }),
      set: jest.fn(function(obj) { this._data = obj; }),
      update: jest.fn(function(obj) {
        if (obj.callNumber && typeof obj.callNumber === 'object' && obj.callNumber.increment) {
          // Handle Firestore.FieldValue.increment(1)
          this._data.callNumber = (this._data.callNumber || 0) + 1;
        } else {
          Object.assign(this._data, obj);
        }
        return Promise.resolve();
      }),
      delete: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(() => Promise.resolve(mockDoc))
    };

    mockCollection = {
      doc: jest.fn(() => mockDoc)
    };

    mockTransaction = {
      get: jest.fn(() => Promise.resolve(mockDoc)),
      update: jest.fn(() => Promise.resolve()),
      set: jest.fn(() => Promise.resolve())
    };

    Firestore.mockImplementation(() => ({
      collection: jest.fn(() => mockCollection),
      runTransaction: jest.fn(async (fn) => fn(mockTransaction))
    }));

    sessionManager = new SessionManager();
  });

  describe('getSession', () => {
    it('should return null when no session exists', async () => {
      mockDoc.exists = false;

      const result = await sessionManager.getSession();

      expect(result).toBeNull();
    });

    it('should return session data when valid session exists', async () => {
      const now = Date.now();
      const sessionData = {
        sessionId: 'test-session',
        steamId64: '76561198012345678',
        steamUserName: 'testuser',
        base64Ticket: 'test-ticket',
        expiry: now + 3600000, // 1 hour from now
        callNumber: 5,
        lastCallTime: now
      };

      mockDoc.data.mockReturnValue(sessionData);

      const result = await sessionManager.getSession();

      expect(result).toMatchObject({
        sessionId: 'test-session',
        steamId64: '76561198012345678',
        steamUserName: 'testuser',
        base64Ticket: 'test-ticket',
        callNumber: 5,
        lastCallTime: now
      });
    });

    it('should clear expired session', async () => {
      const expiredSession = {
        sessionId: 'expired-session',
        expiry: Date.now() - 1000 // expired 1 second ago
      };

      mockDoc.data.mockReturnValue(expiredSession);

      const result = await sessionManager.getSession();

      expect(mockDoc.delete).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('saveSession', () => {
    it('should save session with correct data', async () => {
      const sessionData = {
        sessionId: 'new-session',
        steamId64: '76561198012345678',
        steamUserName: 'testuser',
        base64Ticket: 'new-ticket'
      };

      const result = await sessionManager.saveSession(sessionData);

      expect(mockDoc.set).toHaveBeenCalledWith(expect.objectContaining({
        sessionId: 'new-session',
        steamId64: '76561198012345678',
        steamUserName: 'testuser',
        base64Ticket: 'new-ticket',
        callNumber: 0,
        createdAt: expect.any(Number),
        lastCallTime: expect.any(Number),
        expiry: expect.any(Number)
      }));

      expect(result).toMatchObject(sessionData);
    });
  });

  describe('incrementCallNumber', () => {
    it('should increment call number atomically via a transaction', async () => {
      mockDoc._data = { callNumber: 5 };
      mockDoc.data.mockImplementation(function() { return this._data; });

      const result = await sessionManager.incrementCallNumber();

      expect(mockTransaction.get).toHaveBeenCalled();
      expect(mockTransaction.set).toHaveBeenCalledWith(
        expect.anything(),
        { callNumber: 6 },
        { merge: true }
      );
      expect(result).toBe(6);
    });

    it('should start from 0 when the counter is unset', async () => {
      mockDoc._data = {};
      mockDoc.data.mockImplementation(function() { return this._data; });

      const result = await sessionManager.incrementCallNumber();

      expect(mockTransaction.set).toHaveBeenCalledWith(
        expect.anything(),
        { callNumber: 1 },
        { merge: true }
      );
      expect(result).toBe(1);
    });

    it('should not throw when the session document is missing (cleared by another instance)', async () => {
      // Another instance cleared the session doc while this instance's 10s
      // in-memory cache still holds a stale entry. set+merge must not throw
      // NOT_FOUND (update would); the call then 401s and self-corrects via the
      // existing auth-retry path.
      mockDoc.exists = false;
      mockDoc.data.mockImplementation(() => undefined);

      const result = await sessionManager.incrementCallNumber();

      expect(mockTransaction.set).toHaveBeenCalledWith(
        expect.anything(),
        { callNumber: 1 },
        { merge: true }
      );
      expect(result).toBe(1);
    });

    it('should propagate transaction failures', async () => {
      mockTransaction.get.mockRejectedValueOnce(new Error('tx failed'));

      await expect(sessionManager.incrementCallNumber()).rejects.toThrow('tx failed');
    });
  });

  describe('updateLastCallTime', () => {
    it('should update last call time', async () => {
      const newTime = Date.now();

      await sessionManager.updateLastCallTime(newTime);

      expect(mockDoc.update).toHaveBeenCalledWith({
        lastCallTime: newTime
      });
    });
  });

  describe('clearSession', () => {
    it('should delete session document', async () => {
      await sessionManager.clearSession();

      expect(mockDoc.delete).toHaveBeenCalled();
    });
  });

  describe('handleAuthFailure', () => {
    it('should clear session on auth failure', async () => {
      await sessionManager.handleAuthFailure();

      expect(mockDoc.delete).toHaveBeenCalled();
    });
  });

  describe('isSessionValid', () => {
    it('should return true for valid session', async () => {
      const now = Date.now();
      const sessionData = {
        sessionId: 'test-session',
        expiry: now + 3600000 // 1 hour from now
      };

      mockDoc.data.mockReturnValue(sessionData);

      const result = await sessionManager.isSessionValid();

      expect(result).toBe(true);
    });

    it('should return false for expired session', async () => {
      const sessionData = {
        sessionId: 'expired-session',
        expiry: Date.now() - 1000 // expired 1 second ago
      };

      mockDoc.data.mockReturnValue(sessionData);

      const result = await sessionManager.isSessionValid();

      expect(result).toBe(false);
    });

    it('should return false when no session exists', async () => {
      mockDoc.exists = false;

      const result = await sessionManager.isSessionValid();

      expect(result).toBe(false);
    });
  });
}); 