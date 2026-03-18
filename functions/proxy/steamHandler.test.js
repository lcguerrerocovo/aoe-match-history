jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('pino', () => () => ({
  child: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })
}));

// Set env var before module load
process.env.STEAM_API_KEY = 'test-steam-key';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('handleSteamAvatar', () => {
  let handleSteamAvatar;

  beforeAll(() => {
    handleSteamAvatar = require('./steamHandler').handleSteamAvatar;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns avatarUrl from Steam API with 86400s cache', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        response: {
          players: [{ avatarfull: 'https://cdn.cloudflare.steamstatic.com/avatar.jpg' }]
        }
      })
    });

    const result = await handleSteamAvatar('76561198012345678');

    expect(result.data.avatarUrl).toBe('https://cdn.cloudflare.steamstatic.com/avatar.jpg');
    expect(result.headers['Cache-Control']).toBe('public, max-age=86400');
  });

  it('returns { avatarUrl: null } on non-ok response with 600s cache', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403
    });

    const result = await handleSteamAvatar('76561198012345678');

    expect(result.data).toEqual({ avatarUrl: null });
    expect(result.headers['Cache-Control']).toBe('public, max-age=600');
  });

  it('returns { avatarUrl: null } on fetch throw with 600s cache', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await handleSteamAvatar('76561198012345678');

    expect(result.data).toEqual({ avatarUrl: null });
    expect(result.headers['Cache-Control']).toBe('public, max-age=600');
  });

  it('returns { avatarUrl: null } when no players array in response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: {} })
    });

    const result = await handleSteamAvatar('76561198012345678');

    expect(result.data).toEqual({ avatarUrl: null });
    expect(result.headers['Cache-Control']).toBe('public, max-age=86400');
  });

  it('throws when STEAM_API_KEY is not set', async () => {
    jest.resetModules();
    const savedKey = process.env.STEAM_API_KEY;
    delete process.env.STEAM_API_KEY;

    try {
      const { handleSteamAvatar: freshHandler } = require('./steamHandler');
      await expect(freshHandler('76561198012345678')).rejects.toThrow(
        'STEAM_API_KEY environment variable is not set'
      );
    } finally {
      process.env.STEAM_API_KEY = savedKey;
    }
  });
});
