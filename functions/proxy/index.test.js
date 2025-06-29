// Factory mocks for all classes, set up before requiring the module under test
const mockAuthClient = { authenticate: jest.fn() };
const mockPlayerService = { findProfiles: jest.fn() };
const mockSessionManager = {
  getSession: jest.fn(),
  saveSession: jest.fn(),
  clearSession: jest.fn(),
  isSessionValid: jest.fn()
};

// Mock Firestore
const mockFirestoreDoc = {
  data: jest.fn(),
  id: 'test-doc'
};
const mockFirestoreSnapshot = {
  forEach: jest.fn()
};
const mockFirestoreQuery = {
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  get: jest.fn()
};
const mockFirestoreCollection = {
  where: jest.fn().mockReturnValue(mockFirestoreQuery)
};
const mockFirestore = {
  collection: jest.fn().mockReturnValue(mockFirestoreCollection)
};

jest.mock('./relicAuth', () => jest.fn(() => mockAuthClient));
jest.mock('./relicPlayerService', () => jest.fn(() => mockPlayerService));
jest.mock('./sessionManager', () => jest.fn(() => mockSessionManager));
jest.mock('@google-cloud/firestore', () => ({
  Firestore: jest.fn(() => mockFirestore)
}));
jest.mock('pino', () => () => ({ child: () => ({ info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() }) }));
jest.mock('cors', () => () => (req, res, next) => next());
const mockFetch = jest.fn();
jest.mock('node-fetch', () => mockFetch);

process.env.STEAM_API_KEY = 'test-steam-key';
process.env.RELIC_AUTH_STEAM_USER = 'testuser';
process.env.RELIC_AUTH_STEAM_PASS = 'testpass';

let proxy;
beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  
  // Reset Firestore mocks
  mockFirestoreQuery.where.mockReturnThis();
  mockFirestoreQuery.limit.mockReturnThis();
  mockFirestoreCollection.where.mockReturnValue(mockFirestoreQuery);
  mockFirestore.collection.mockReturnValue(mockFirestoreCollection);
  
  proxy = require('./index');
  proxy.__resetPlayerService && proxy.__resetPlayerService();
});

describe('Proxy API', () => {
  describe('proxy function', () => {
    it('should handle player search successfully', async () => {
      // Mock Firestore response
      const mockPlayers = [
        { 
          profile_id: 123, 
          name: 'testplayer', 
          name_no_special: 'testplayer',
          total_matches: 100,
          country: 'us'
        }
      ];
      
      mockFirestoreSnapshot.forEach.mockImplementation((callback) => {
        mockPlayers.forEach((player) => {
          const doc = { data: () => player };
          callback(doc);
        });
      });
      mockFirestoreQuery.get.mockResolvedValue(mockFirestoreSnapshot);

      const req = {
        url: '/api/player-search?name=testplayer',
        query: { name: 'testplayer' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn()
      };

      await proxy.proxy(req, res);

      expect(mockFirestore.collection).toHaveBeenCalledWith('players');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          id: '123',
          name: 'testplayer',
          matches: 100,
          country: 'us'
        })
      ]));
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=1800');
    });

    it('should handle missing name parameter', async () => {
      const req = {
        url: '/api/player-search',
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await proxy.proxy(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing name parameter' });
    });

    it('should handle Steam avatar request', async () => {
      const req = {
        url: '/api/steam/avatar/76561198012345678'
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn()
      };

      // Mock fetch for Steam API
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          response: {
            players: [{
              avatarfull: 'https://example.com/avatar.jpg'
            }]
          }
        })
      });

      await proxy.proxy(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ avatarUrl: 'https://example.com/avatar.jpg' });
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=86400');
    });

    it('should handle match history request', async () => {
      const req = {
        url: '/api/match-history/123'
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn()
      };

      const mockMatchData = [{ matchId: '456', players: [] }];
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMatchData)
      });

      await proxy.proxy(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockMatchData);
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=60');
    });

    it('should handle 404 for unknown route', async () => {
      const req = {
        url: '/api/unknown-route'
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await proxy.proxy(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Route not found' });
    });

    it('should handle empty player search results', async () => {
      // Mock empty Firestore response
      mockFirestoreSnapshot.forEach.mockImplementation(() => {
        // No players found
      });
      mockFirestoreQuery.get.mockResolvedValue(mockFirestoreSnapshot);

      const req = {
        url: '/api/player-search?name=nonexistentplayer',
        query: { name: 'nonexistentplayer' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn()
      };

      await proxy.proxy(req, res);

      expect(mockFirestore.collection).toHaveBeenCalledWith('players');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=1800');
    });
  });
}); 