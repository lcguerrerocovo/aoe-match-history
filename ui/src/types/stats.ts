export interface LeaderboardStats {
  leaderboard_id: number;
  rating: number;
  wins: number;
  losses: number;
  streak: number;
  rank: number;
  rank_country: number;
  highestrating: number;
  rank_change: number;
}

export interface StatGroupMember {
  profile_id: number;
  name: string;
  alias: string;
  personal_statgroup_id: number;
  xp: number;
  level: number;
  leaderboardStats: LeaderboardStats[];
}

export interface StatGroup {
  id: number;
  name: string;
  members: StatGroupMember[];
}

export interface ApiResult {
  statGroups: StatGroup[];
}

export interface PersonalStats {
  result: ApiResult;
} 