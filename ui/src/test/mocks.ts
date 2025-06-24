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
  onSearchChange: () => {},
  onClearSearch: () => {},
  maps: mockMaps,
  searchResultsCount: undefined
};

// Mock data for ProfileHeader
export const mockProfile = {
  id: '12345',
  name: 'TestPlayer',
  avatarUrl: undefined as string | undefined
};

// Renamed from mockStats
export const mockPersonalStats: PersonalStats = {
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

export const mockSteamProfile = {
  steamid: "76561197960265728",
  personaname: "Valve",
  avatarfull: "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg",
};

export const mockMatchHistory = {
  profiles: [
    { profile_id: 4764337, name: '/steam/76561198144754504', alias: 'dev' },
    { profile_id: 11766674, name: '/steam/76561199079934519', alias: '[phiz]brans$s' }
  ],
  matchHistoryStats: [
    {
      id: 260228303,
      mapname: 'Forts',
      matchtype_id: 29, // EW Team
      options: 'AAAAAQAAAAAAAAAAAAAAAgAAAAIAAACQBwAAAAAA',
      slotinfo: 'eyJQbGF5ZXJEYXRhIjpbeyJQcm9maWxlSW5mbyI6eyJpZCI6NDc2NDMzNywibmFtZSI6Ii9zdGVhbS83NjU2MTE5ODE0NDc1NDUwNCIsImFsaWFzIjoiZGV2In0sIm1ldGFEYXRhIjoiYkY3MHBpWDR4Q2s9In0seyJQcm9maWxlSW5mbyI6eyJpZCI6MTE3NjY2NzQsIm5hbWUiOiIvc3RlYW0vNzY1NjExOTkwNzk5MzQ1MTkiLCJhbGlhcyI6IltwaGl6XWJyYW5zJHMifSwibWV0YURhdGEiOiJiRjcwUGluM3hGND0ifV19',
      matchhistoryreportresults: [
        { profile_id: 4764337, civilization_id: 10, resulttype: 1 },
        { profile_id: 11766674, civilization_id: 12, resulttype: 2 }
      ],
      matchhistorymember: [
        { profile_id: 4764337, oldrating: 1000, newrating: 1010 },
        { profile_id: 11766674, oldrating: 1000, newrating: 990 }
      ]
    },
    {
      id: 260228304,
      mapname: 'Arena',
      matchtype_id: 6, // RM 1v1
      options: 'AAAAAQAAAAAAAAAAAAAAAgAAAAIAAACQBwAAAAAA',
      slotinfo: 'eyJQbGF5ZXJEYXRhIjpbeyJQcm9maWxlSW5mbyI6eyJpZCI6NDc2NDMzNywibmFtZSI6Ii9zdGVhbS83NjU2MTE5ODE0NDc1NDUwNCIsImFsaWFzIjoiZGV2In0sIm1ldGFEYXRhIjoiYkY3MHBpWDR4Q2s9In0seyJQcm9maWxlSW5mbyI6eyJpZCI6MTE3NjY2NzQsIm5hbWUiOiIvc3RlYW0vNzY1NjExOTkwNzk5MzQ1MTkiLCJhbGlhcyI6IltwaGl6XWJyYW5zJHMifSwibWV0YURhdGEiOiJiRjcwUGluM3hGND0ifV19',
      matchhistoryreportresults: [
        { profile_id: 4764337, civilization_id: 10, resulttype: 1 },
        { profile_id: 11766674, civilization_id: 12, resulttype: 2 }
      ],
      matchhistorymember: [
        { profile_id: 4764337, oldrating: 1010, newrating: 1020 },
        { profile_id: 11766674, oldrating: 990, newrating: 980 }
      ]
    }
  ]
};

export const mockProfileHeaderProps = {
  profileId: '12345',
  profile: mockProfile,
  stats: mockPersonalStats,
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