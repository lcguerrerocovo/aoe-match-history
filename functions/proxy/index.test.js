// Factory mocks for all classes, set up before requiring the module under test
const mockAuthClient = { authenticate: jest.fn() };
const mockPlayerService = { findProfiles: jest.fn() };
const mockSessionManager = {
  getSession: jest.fn(),
  saveSession: jest.fn(),
  clearSession: jest.fn(),
  isSessionValid: jest.fn()
};

jest.mock('./relicAuth', () => jest.fn(() => mockAuthClient));
jest.mock('./relicPlayerService', () => jest.fn(() => mockPlayerService));
jest.mock('./sessionManager', () => jest.fn(() => mockSessionManager));
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
  proxy = require('./index');
  proxy.__resetPlayerService && proxy.__resetPlayerService();
});

describe('Proxy API', () => {
  describe('proxy function', () => {
    it('should handle player search successfully', async () => {
      const mockResult = {
        success: true,
        data: [{ name: 'testplayer', profileId: '123' }]
      };

      mockSessionManager.isSessionValid.mockResolvedValue(true);
      mockPlayerService.findProfiles.mockResolvedValue(mockResult);
      proxy.__setPlayerService && proxy.__setPlayerService(mockPlayerService);

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

      expect(mockPlayerService.findProfiles).toHaveBeenCalledWith('testplayer');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.any(Array));
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=604800');
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

    it('should handle authentication failure and retry', async () => {
      const authFailureResult = {
        success: false,
        authFailure: true,
        error: 'Auth failed'
      };
      const successResult = {
        success: true,
        data: [{ name: 'testplayer', profileId: '123' }]
      };

      // Simulate session invalid, then valid after authentication
      mockSessionManager.isSessionValid
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);
      mockSessionManager.getSession
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ sessionId: 'new-session', steamId64: '76561198012345678', steamUserName: 'testuser', base64Ticket: 'new-ticket' });
      mockAuthClient.authenticate.mockResolvedValue({
        sessionId: 'new-session',
        steamId64: '76561198012345678',
        steamUserName: 'testuser',
        base64Ticket: 'new-ticket'
      });
      mockPlayerService.findProfiles
        .mockResolvedValueOnce(authFailureResult)
        .mockResolvedValueOnce({ success: true, data: [{ name: 'testplayer', profileId: '123' }] });
      proxy.__setPlayerService && proxy.__setPlayerService(mockPlayerService);

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
      expect(mockAuthClient.authenticate).toHaveBeenCalled();
      expect(mockPlayerService.findProfiles).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([{ name: 'testplayer', profileId: '123' }]);
    });
  });
}); 