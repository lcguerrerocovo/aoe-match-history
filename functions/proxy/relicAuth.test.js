const RelicAuthClient = require('./relicAuth');
const SteamUser = require('steam-user');

// Mock dependencies
jest.mock('steam-user');
jest.mock('pino', () => () => ({
  child: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));
jest.mock('./config', () => ({
  logger: {
    child: () => ({
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    })
  }
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('RelicAuthClient', () => {
  let authClient;
  let mockSteamClient;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Steam client
    mockSteamClient = {
      logOn: jest.fn(),
      logOff: jest.fn(),
      getEncryptedAppTicket: jest.fn(),
      steamID: {
        getSteamID64: () => '76561198012345678'
      },
      accountInfo: {
        name: 'testuser'
      },
      on: jest.fn()
    };

    SteamUser.mockImplementation(() => mockSteamClient);
    authClient = new RelicAuthClient();
  });

  describe('_steamLogin', () => {
    it('should successfully login to Steam', async () => {
      const username = 'testuser';
      const password = 'testpass';

      // Mock successful login
      mockSteamClient.on.mockImplementation((event, callback) => {
        if (event === 'loggedOn') {
          callback();
        }
      });

      const result = await authClient._steamLogin(username, password);

      expect(mockSteamClient.logOn).toHaveBeenCalledWith({
        accountName: username,
        password: password
      });
      expect(result).toEqual({
        steamId64: '76561198012345678',
        steamUserName: 'testuser'
      });
    });

    it('should handle Steam Guard error', async () => {
      mockSteamClient.on.mockImplementation((event, callback) => {
        if (event === 'steamGuard') {
          callback('email', jest.fn(), false);
        }
      });

      await expect(authClient._steamLogin('user', 'pass')).rejects.toThrow('Steam Guard required but not implemented');
    });
  });

  describe('_getEncryptedAppTicket', () => {
    it('should successfully get encrypted app ticket', async () => {
      const mockTicket = Buffer.from('test-ticket-data');

      mockSteamClient.getEncryptedAppTicket.mockImplementation((appId, key, callback) => {
        callback(null, mockTicket);
      });

      const result = await authClient._getEncryptedAppTicket();

      expect(mockSteamClient.getEncryptedAppTicket).toHaveBeenCalledWith(813780, Buffer.from("RLINK"), expect.any(Function));
      expect(result).toBe('dGVzdC10aWNrZXQtZGF0YQ=='); // base64 of 'test-ticket-data'
    });

    it('should handle app ticket error', async () => {
      mockSteamClient.getEncryptedAppTicket.mockImplementation((appId, key, callback) => {
        callback(new Error('Ticket generation failed'));
      });

      await expect(authClient._getEncryptedAppTicket()).rejects.toThrow('Ticket generation failed');
    });
  });

  describe('_relicPlatformLogin', () => {
    it('should successfully login to Relic platform', async () => {
      const steamData = {
        steamId64: '76561198012345678',
        steamUserName: 'testuser'
      };
      const base64Ticket = 'test-ticket';

      mockFetch.mockResolvedValue({
        status: 200,
        json: () => Promise.resolve([0, 'session-123'])
      });

      const result = await authClient._relicPlatformLogin(steamData, base64Ticket);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://aoe-api.worldsedgelink.com/game/login/platformlogin',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
          })
        })
      );

      // Verify the request body contains correct fields
      const callArgs = mockFetch.mock.calls[0];
      const requestBody = callArgs[1].body;
      expect(requestBody).toContain('alias=testuser');
      expect(requestBody).toContain('appID=813780');
      expect(requestBody).toContain('auth=test-ticket');
      expect(requestBody).toContain('platformUserID=76561198012345678');
      expect(requestBody).toContain('title=age2');

      expect(result).toBe('session-123');
    });

    it('should handle Relic login failure', async () => {
      const steamData = { steamId64: '123', steamUserName: 'user' };
      const base64Ticket = 'ticket';

      mockFetch.mockResolvedValue({
        status: 400,
        json: () => Promise.resolve([1, 'Auth failed'])
      });

      await expect(authClient._relicPlatformLogin(steamData, base64Ticket))
        .rejects.toThrow('Relic login failed: 1');
    });
  });

  describe('authenticate', () => {
    it('should perform full authentication flow', async () => {
      const username = 'testuser';
      const password = 'testpass';

      // Mock Steam login
      mockSteamClient.on.mockImplementation((event, callback) => {
        if (event === 'loggedOn') {
          callback();
        }
      });

      // Mock app ticket
      const mockTicket = Buffer.from('test-ticket');
      mockSteamClient.getEncryptedAppTicket.mockImplementation((appId, key, callback) => {
        callback(null, mockTicket);
      });

      // Mock Relic login
      mockFetch.mockResolvedValue({
        status: 200,
        json: () => Promise.resolve([0, 'session-123'])
      });

      const result = await authClient.authenticate(username, password);

      expect(result).toEqual({
        sessionId: 'session-123',
        steamId64: '76561198012345678',
        steamUserName: 'testuser',
        base64Ticket: 'dGVzdC10aWNrZXQ=' // base64 of 'test-ticket'
      });
    });

    it('should handle re-authentication with existing ticket', async () => {
      const existingTicket = 'existing-ticket';
      const existingSteamData = {
        steamId64: '76561198012345678',
        steamUserName: 'testuser'
      };

      mockFetch.mockResolvedValue({
        status: 200,
        json: () => Promise.resolve([0, 'new-session-456'])
      });

      const result = await authClient.authenticate('user', 'pass', existingTicket, existingSteamData);

      expect(result).toEqual({
        sessionId: 'new-session-456',
        steamId64: '76561198012345678',
        steamUserName: 'testuser',
        base64Ticket: existingTicket
      });

      // Should not call Steam login for re-auth
      expect(mockSteamClient.logOn).not.toHaveBeenCalled();
    });
  });
});
