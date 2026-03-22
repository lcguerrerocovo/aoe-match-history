/* eslint-env node */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { mockPersonalStats, mockSteamProfile } from '../test/mocks';

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Import after mocking
import {
  getMatches,
  getFullMatchHistory,
  getPersonalStats,
  getSteamAvatar,
  getMatch,
  extractSteamId,
  searchPlayers,
  checkReplayAvailability,
  checkApmStatus,
  checkApmStatusForMatch,
  downloadReplay,
} from './matchService';

describe('matchService', () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getPersonalStats', () => {
    it('should fetch and return personal stats', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPersonalStats),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      const stats = await getPersonalStats('12345');
      
      expect(fetchMock).toHaveBeenCalledWith('/api/personal-stats/12345');
      expect(stats).toEqual(mockPersonalStats);
    });

    it('should throw an error if the fetch fails', async () => {
      fetchMock.mockResolvedValue({ ok: false });
      await expect(getPersonalStats('12345')).rejects.toThrow('Failed to fetch personal stats');
    });
  });

  describe('getSteamAvatar', () => {
    it('should fetch and return an avatar URL', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ avatarUrl: mockSteamProfile.avatarfull }),
      });

      const avatarUrl = await getSteamAvatar('76561197960265728');
      
      expect(fetchMock).toHaveBeenCalledWith('/api/steam/avatar/76561197960265728');
      expect(avatarUrl).toBe(mockSteamProfile.avatarfull);
    });

    it('should return undefined if the fetch fails', async () => {
      fetchMock.mockResolvedValue({ ok: false });
      const avatarUrl = await getSteamAvatar('76561197960265728');
      expect(avatarUrl).toBeUndefined();
    });
  });

  describe('getMatches', () => {
    it('should fetch, process, and return match data', async () => {
      const mockData = {
        id: '4764337',
        name: 'dev',
        matches: [
          {
            match_id: '260228303',
            start_time: '2022-01-01T00:00:00.000Z',
            description: 'EW Team',
            diplomacy: {
              type: 'EW Team',
              team_size: '2'
            },
            map: 'Forts',
            duration: 1800,
            teams: [
              [
                {
                  name: 'dev',
                  original_name: '/steam/76561198144754504',
                  civ: 10,
                  number: 1,
                  color_id: 0,
                  user_id: 4764337,
                  winner: true,
                  rating: 1010,
                  rating_change: 10,
                  match_id: 260228303,
                  replay_available: true
                }
              ],
              [
                {
                  name: '[phiz]brans$s',
                  original_name: '/steam/76561199079934519',
                  civ: 12,
                  number: 2,
                  color_id: 1,
                  user_id: 11766674,
                  winner: false,
                  rating: 990,
                  rating_change: -10,
                  match_id: 260228303,
                  replay_available: false
                }
              ]
            ],
            players: [],
            winning_team: 1,
            winning_teams: [1]
          }
        ]
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      const result = await getMatches('4764337');

      expect(fetchMock).toHaveBeenCalledWith('/api/match-history/4764337', expect.any(Object));
      expect(result.id).toBe('4764337');
      expect(result.name).toBe('dev');
      expect(result.matches).toHaveLength(1);
    });

    it('should throw an error if the fetch fails', async () => {
      fetchMock.mockResolvedValue({ ok: false });
      await expect(getMatches('12345')).rejects.toThrow('Failed to fetch matches');
    });

    it('should throw on non-JSON content type', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
        headers: new Headers({ 'Content-Type': 'text/html' }),
      });
      await expect(getMatches('12345')).rejects.toThrow('Invalid response format');
    });
  });

  describe('getFullMatchHistory', () => {
    it('should fetch paginated match history from /full endpoint', async () => {
      const mockResponse = {
        matches: [{ match_id: '123', start_time: '2026-03-22T00:00:00Z' }],
        hasMore: true,
      };
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      const result = await getFullMatchHistory('4764337', 2, 50);

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/match-history/4764337/full?page=2&limit=50',
        expect.any(Object),
      );
      expect(result.matches).toHaveLength(1);
      expect(result.hasMore).toBe(true);
    });

    it('should use default page and limit', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ matches: [], hasMore: false }),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      await getFullMatchHistory('4764337');

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toBe('/api/match-history/4764337/full?page=1&limit=50');
    });

    it('should throw on non-ok response', async () => {
      fetchMock.mockResolvedValue({ ok: false });
      await expect(getFullMatchHistory('12345')).rejects.toThrow('Failed to fetch full match history');
    });

    it('should throw on non-JSON content type', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
        headers: new Headers({ 'Content-Type': 'text/html' }),
      });
      await expect(getFullMatchHistory('12345')).rejects.toThrow('Invalid response format');
    });
  });

  describe('getMatch', () => {
    it('should fetch a single match with cache-busting param', async () => {
      const mockMatchData = { match_id: '999', map: 'Arabia' };
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMatchData),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      const result = await getMatch('999');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toMatch(/\/api\/match\/999\?t=\d+/);
      expect(result).toEqual(mockMatchData);
    });

    it('should include Accept and User-Agent headers', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      });

      await getMatch('123');

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['Accept']).toBe('application/json');
      expect(headers['User-Agent']).toBe('aoe2-site');
    });

    it('should throw on non-ok response', async () => {
      fetchMock.mockResolvedValue({ ok: false });
      await expect(getMatch('999')).rejects.toThrow('Failed to fetch match');
    });

    it('should throw on non-JSON content type', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
        headers: new Headers({ 'Content-Type': 'text/html' }),
      });
      await expect(getMatch('999')).rejects.toThrow('Invalid response format');
    });

    it('should throw when content-type header is missing', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
        headers: new Headers(),
      });
      await expect(getMatch('999')).rejects.toThrow('Invalid response format');
    });
  });

  describe('extractSteamId', () => {
    it('should extract steam ID from a valid path', () => {
      expect(extractSteamId('/steam/76561198144754504')).toBe('76561198144754504');
    });

    it('should return null for a non-steam path', () => {
      expect(extractSteamId('SomePlayerName')).toBeNull();
    });

    it('should return null for an empty string', () => {
      expect(extractSteamId('')).toBeNull();
    });

    it('should extract from a longer path containing /steam/', () => {
      expect(extractSteamId('prefix/steam/12345')).toBe('12345');
    });
  });

  describe('searchPlayers', () => {
    it('should fetch and transform player search results', async () => {
      const apiResponse = [
        { id: 123, name: 'PlayerOne', matches: 50 },
        { id: 456, name: 'PlayerTwo', matches: 30 },
      ];
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiResponse),
      });

      const results = await searchPlayers('Player');

      expect(fetchMock).toHaveBeenCalledWith('/api/player-search?name=Player');
      expect(results).toEqual([
        { id: '123', name: 'PlayerOne', matches: 50 },
        { id: '456', name: 'PlayerTwo', matches: 30 },
      ]);
    });

    it('should encode special characters in query', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await searchPlayers('player name&special');

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('name=player%20name%26special');
    });

    it('should default matches to 0 when missing', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ name: 'NoMatches' }]),
      });

      const results = await searchPlayers('NoMatches');
      expect(results[0].matches).toBe(0);
    });

    it('should throw on non-ok response', async () => {
      fetchMock.mockResolvedValue({ ok: false, statusText: 'Not Found' });
      await expect(searchPlayers('test')).rejects.toThrow('Search failed: Not Found');
    });
  });

  describe('checkReplayAvailability', () => {
    it('should return availability status from API', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ available: false }),
      });

      const result = await checkReplayAvailability('game1', 'profile1');
      expect(fetchMock).toHaveBeenCalledWith('/api/check-replay/game1/profile1');
      expect(result).toBe(false);
    });

    it('should return true on fetch error (default-true)', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));
      const result = await checkReplayAvailability('game1', 'profile1');
      expect(result).toBe(true);
    });

    it('should return true on non-ok response', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500 });
      const result = await checkReplayAvailability('game1', 'profile1');
      expect(result).toBe(true);
    });
  });

  describe('checkApmStatus', () => {
    it('should return APM status from API', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ hasSaveGame: true, isProcessed: true, state: 'bronzeStatus' }),
      });

      const result = await checkApmStatus('game1', 'profile1');
      expect(fetchMock).toHaveBeenCalledWith('/api/apm-status/game1/profile1');
      expect(result).toEqual({ hasSaveGame: true, isProcessed: true, state: 'bronzeStatus' });
    });

    it('should return defaults on non-ok response', async () => {
      fetchMock.mockResolvedValue({ ok: false, statusText: 'Not Found' });
      const result = await checkApmStatus('game1', 'profile1');
      expect(result).toEqual({ hasSaveGame: false, isProcessed: false, state: 'greyStatus' });
    });

    it('should return defaults on fetch error', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));
      const result = await checkApmStatus('game1', 'profile1');
      expect(result).toEqual({ hasSaveGame: false, isProcessed: false, state: 'greyStatus' });
    });

    it('should default missing fields to false/greyStatus', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });
      const result = await checkApmStatus('game1', 'profile1');
      expect(result).toEqual({ hasSaveGame: false, isProcessed: false, state: 'greyStatus' });
    });
  });

  describe('checkApmStatusForMatch', () => {
    it('should return APM status with profileId from API', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ hasSaveGame: true, isProcessed: false, state: 'silverStatus', profileId: '123' }),
      });

      const result = await checkApmStatusForMatch('game1');
      expect(fetchMock).toHaveBeenCalledWith('/api/apm-status-match/game1');
      expect(result).toEqual({ hasSaveGame: true, isProcessed: false, state: 'silverStatus', profileId: '123' });
    });

    it('should return defaults on non-ok response', async () => {
      fetchMock.mockResolvedValue({ ok: false, statusText: 'Error' });
      const result = await checkApmStatusForMatch('game1');
      expect(result).toEqual({ hasSaveGame: false, isProcessed: false, state: 'greyStatus' });
    });

    it('should return defaults on fetch error', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));
      const result = await checkApmStatusForMatch('game1');
      expect(result).toEqual({ hasSaveGame: false, isProcessed: false, state: 'greyStatus' });
    });
  });

  describe('downloadReplay', () => {
    it('should download replay client-side and POST base64 to proxy', async () => {
      const fakeBuffer = new Uint8Array([72, 101, 108, 108, 111]).buffer; // "Hello"
      const expectedBase64 = btoa('Hello');

      // First call: replay download from ageofempires.com
      // Second call: POST to proxy
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(fakeBuffer),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ downloaded: true }),
        });

      const result = await downloadReplay('game1', 'profile1');

      expect(result).toEqual({ success: true, error: undefined });
      // Verify replay URL
      expect(fetchMock.mock.calls[0][0]).toContain('api.ageofempires.com');
      expect(fetchMock.mock.calls[0][0]).toContain('gameId=game1');
      expect(fetchMock.mock.calls[0][0]).toContain('profileId=profile1');
      // Verify proxy POST
      expect(fetchMock.mock.calls[1][0]).toBe('/api/replay-download/game1/profile1');
      expect(fetchMock.mock.calls[1][1].method).toBe('POST');
      const body = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(body.replayData).toBe(expectedBase64);
    });

    it('should return error when client-side replay fetch throws', async () => {
      fetchMock.mockRejectedValueOnce(new Error('CORS error'));

      const result = await downloadReplay('game1', 'profile1');
      expect(result).toEqual({ success: false, error: 'Failed to download replay' });
    });

    it('should return rate limit message on 429', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 429 });

      const result = await downloadReplay('game1', 'profile1');
      expect(result).toEqual({ success: false, error: 'Replay server busy — try again later' });
    });

    it('should return not available on other non-ok replay response', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });

      const result = await downloadReplay('game1', 'profile1');
      expect(result).toEqual({ success: false, error: 'Replay not available' });
    });

    it('should return error when proxy POST fails', async () => {
      const fakeBuffer = new Uint8Array([1, 2, 3]).buffer;
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(fakeBuffer),
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Internal Server Error',
        });

      const result = await downloadReplay('game1', 'profile1');
      expect(result).toEqual({ success: false, error: 'Replay processing failed' });
    });

    it('should return network error on unexpected exception', async () => {
      const fakeBuffer = new Uint8Array([1]).buffer;
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(fakeBuffer),
        })
        .mockRejectedValueOnce(new Error('Unexpected'));

      const result = await downloadReplay('game1', 'profile1');
      expect(result).toEqual({ success: false, error: 'Network error' });
    });
  });
}); 