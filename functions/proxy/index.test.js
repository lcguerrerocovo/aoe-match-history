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
  orderBy: jest.fn().mockReturnThis(),
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
jest.mock('cors', () => () => (req, res, callback) => callback());
const mockFetch = jest.fn();
jest.mock('node-fetch', () => mockFetch);
jest.mock('zlib', () => ({
  inflateSync: jest.fn(() => Buffer.from('0,[]')) // Return "0,[]" so decodeSlotInfo gets "[]" after comma
}));

process.env.STEAM_API_KEY = 'test-steam-key';
process.env.RELIC_AUTH_STEAM_USER = 'testuser';
process.env.RELIC_AUTH_STEAM_PASS = 'testpass';

let proxy;
beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  
  // Reset Firestore mocks
  mockFirestoreQuery.where.mockReturnThis();
  mockFirestoreQuery.orderBy.mockReturnThis();
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
        url: '/api/match-history/123',
        method: 'GET',
        headers: {},
        query: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        set: jest.fn()
      };

      const mockMappings = {
        civs: { aoe2: { 'Britons': { '1': 1 } } },
        maps: { aoe2: { 'Arabia': { '1': 1 } } }
      };

      const mockRawData = {
        profiles: [
          { profile_id: 123, name: '/steam/76561198012345678', alias: 'testplayer' }
        ],
        matchHistoryStats: [
          {
            id: 456,
            startgametime: 1640995200,
            completiontime: 1640997000,
            description: 'AUTOMATCH',
            matchtype_id: 6,
            mapname: 'Arabia',
            options: '',
            slotinfo: '',
            matchhistoryreportresults: [
              { profile_id: 123, civilization_id: 1, resulttype: 1, teamid: 0 }
            ],
            matchhistorymember: [
              { profile_id: 123, oldrating: 1000, newrating: 1010 }
            ],
            matchurls: [],
            maxplayers: 2
          }
        ]
      };

      // Mock fetch calls in order: 
      // 1. Raw match history from external API
      // 2. Mappings for civs/maps
      // 3. Replay availability checks
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRawData)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMappings)
        })
        // Mock replay availability check
        .mockResolvedValue({
          ok: true // Replay available
        });

      await proxy.proxy(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        id: '123',
        name: 'testplayer',
        matches: expect.any(Array)
      }));
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300');
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