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
  statgroup_id: number;
  ranktotal: number;
  ranklevel: number;
  regionrank: number;
  regionranktotal: number;
  lastmatchdate: number;
  highestrank: number;
  highestranklevel: number;
  disputes: number;
  drops: number;
  total_players: number;
}

export interface StatGroupMember {
  profile_id: number;
  name: string;
  alias: string;
  personal_statgroup_id: number;
  xp: number;
  level: number;
  leaderboardregion_id: number;
  country: string;
  clanlist_name: string;
}

export interface StatGroup {
  id: number;
  name: string;
  type: number;
  members: StatGroupMember[];
}

export interface ApiResult {
  code: number;
  message: string;
}

export interface PersonalStats {
  result: ApiResult;
  statGroups: StatGroup[];
  leaderboardStats: LeaderboardStats[];
} 