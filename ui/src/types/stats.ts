export interface LeaderboardStats {
  statgroup_id: number;
  leaderboard_id: number;
  wins: number;
  losses: number;
  streak: number;
  disputes: number;
  drops: number;
  rank: number;
  ranktotal: number;
  ranklevel: number;
  rating: number;
  regionrank: number;
  regionranktotal: number;
  lastmatchdate: number;
  highestrank: number;
  highestranklevel: number;
  highestrating: number;
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
  statGroups: StatGroup[];
  leaderboardStats: LeaderboardStats[];
}

export interface PersonalStats extends ApiResult {} 