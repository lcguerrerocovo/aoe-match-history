import type { Map, Match } from '../types/match';
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
  statGroups: [
    {
      id: 1,
      name: 'Test Group',
      type: 1,
      members: [
        {
          profile_id: 12345,
          name: 'TestPlayer',
          alias: 'TestPlayer',
          personal_statgroup_id: 1,
          xp: 1000,
          level: 10,
          leaderboardregion_id: 1,
          country: 'US',
          clanlist_name: 'TestClan'
        }
      ]
    }
  ],
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
export const mockMatch: Match = {
  match_id: '123',
  start_time: '2023-01-01T00:00:00.000Z',
  description: 'RM 1v1',
  diplomacy: { type: 'RM 1v1', team_size: '2' },
  map: 'Arabia',
  options: '',
  duration: 1800,
  teams: [
    {
      number: 1,
      players: [
        {
          name: 'Player1',
          civ: 'Britons',
          number: 1,
          color_id: 0,
          user_id: '1',
          winner: true,
          rating: 1200,
          rating_change: 15,
        },
      ],
      won: true,
    },
    {
      number: 2,
      players: [
        {
          name: 'Player2',
          civ: 'Franks',
          number: 2,
          color_id: 1,
          user_id: '2',
          winner: false,
          rating: 1185,
          rating_change: -15,
        },
      ],
      won: false,
    },
  ],
  players: [
    {
      name: 'Player1',
      civ: 'Britons',
      number: 1,
      color_id: 0,
      user_id: '1',
      winner: true,
      rating: 1200,
      rating_change: 15,
    },
    {
      name: 'Player2',
      civ: 'Franks',
      number: 2,
      color_id: 1,
      user_id: '2',
      winner: false,
      rating: 1185,
      rating_change: -15,
    },
  ],
  winning_team: 1,
  winning_teams: [1],
};

// Mock data for MatchList component testing
export const mockMatchGroup = {
  date: '2024-01-01',
  matches: [
    {
      description: '1v1',
      match_id: '12345',
      start_time: new Date().toISOString(),
      diplomacy: {
        type: '1v1',
        team_size: '1',
      },
      map: 'Arabia',
      options: 'Standard',
      duration: 1500, // 25 minutes in seconds
      teams: [
        [
          {
            name: 'Player A',
            civ: 'Britons',
            number: 1,
            color_id: 0,
            user_id: '1',
            winner: true,
            rating: 1500,
            rating_change: 25,
          },
        ],
        [
          {
            name: 'Player B',
            civ: 'Franks',
            number: 2,
            color_id: 1,
            user_id: '2',
            winner: false,
            rating: 1480,
            rating_change: -25,
          },
        ],
      ] as any, // Type assertion to bypass type checking
      players: [
        {
          name: 'Player A',
          civ: 'Britons',
          number: 1,
          color_id: 0,
          user_id: '1',
          winner: true,
          rating: 1500,
          rating_change: 25,
        },
        {
          name: 'Player B',
          civ: 'Franks',
          number: 2,
          color_id: 1,
          user_id: '2',
          winner: false,
          rating: 1480,
          rating_change: -25,
        },
      ],
    },
  ],
}; 