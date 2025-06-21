import type { Map, SortDirection } from '../types/match';
import type { PersonalStats } from '../types/stats';

// Mock data for FilterBar
export const mockMaps: Map[] = [
  { name: 'Arabia', count: 10 },
  { name: 'Black Forest', count: 5 },
  { name: 'Arena', count: 3 }
];

export const mockFilterBarProps = {
  onMapChange: () => {},
  onSortChange: () => {},
  maps: mockMaps
};

// Mock data for ProfileHeader
export const mockProfile = {
  id: '12345',
  name: 'TestPlayer',
  avatarUrl: undefined as string | undefined
};

export const mockStats: PersonalStats = {
  result: { code: 200, message: 'OK' },
  statGroups: [],
  leaderboardStats: [
    {
      leaderboard_id: 3,
      rating: 1200,
      rank: 1500,
      ranktotal: 10000,
      highestrating: 1250,
      wins: 45,
      losses: 35,
      streak: 3,
      rank_country: 100,
      rank_change: 0,
      statgroup_id: 1,
      ranklevel: 1,
      regionrank: 1500,
      regionranktotal: 10000,
      lastmatchdate: 1234567890,
      highestrank: 1000,
      highestranklevel: 1,
      disputes: 0,
      drops: 0,
      total_players: 10000
    },
    {
      leaderboard_id: 4,
      rating: 1100,
      rank: 2000,
      ranktotal: 8000,
      highestrating: 1150,
      wins: 30,
      losses: 40,
      streak: -2,
      rank_country: 150,
      rank_change: 0,
      statgroup_id: 1,
      ranklevel: 1,
      regionrank: 2000,
      regionranktotal: 8000,
      lastmatchdate: 1234567890,
      highestrank: 1500,
      highestranklevel: 1,
      disputes: 0,
      drops: 0,
      total_players: 8000
    }
  ]
};

export const mockProfileHeaderProps = {
  profileId: '12345',
  profile: mockProfile,
  stats: mockStats,
  isLoading: false
};

// Mock data for MatchList
export const mockMatch = {
  match_id: '12345',
  description: '1v1',
  start_time: new Date().toISOString(),
  duration: '00:25:00',
  map: 'Arabia',
  teams: [
    [{ name: 'Player A', civ: 'Britons', color_id: 0, user_id: '1' }],
    [{ name: 'Player B', civ: 'Franks', color_id: 1, user_id: '2' }],
  ],
  winning_team: 1,
}; 