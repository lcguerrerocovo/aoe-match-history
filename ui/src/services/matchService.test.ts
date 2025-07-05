/* eslint-env node */
/* global global */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { mockPersonalStats, mockSteamProfile } from '../test/mocks';

// Mock the slotInfoDecoder to avoid complex decoding
vi.mock('../utils/slotInfoDecoder', () => ({
  decodeSlotInfo: vi.fn(() => [])
}));

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Import after mocking
import { getMatches, getPersonalStats, getSteamAvatar } from './matchService';

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
  });
}); 