export interface Player {
  name: string;
  original_name?: string;
  civ: string | number;
  number: number;
  color_id: number;
  user_id: string;
  winner: boolean;
  rating: number | null;
  rating_change: number | null;
  save_game_url?: string | null;
  save_game_size?: number | null;
  replay_available?: boolean | null;
}

export interface ApmPlayerData {
  minute: number;
  total: number;
  [actionType: string]: number;
}

export interface ApmData {
  players: Record<string, ApmPlayerData[]>;
  averages?: Record<string, number>;
  [key: string]: unknown;
}

export interface Match {
  description: string;
  match_id: string;
  start_time: string;
  diplomacy: {
    type: string;
    team_size: string;
  };
  map: string;
  options: string;
  duration: number;
  teams: Player[][];
  players: Player[];
  winning_team?: number;
  winning_teams?: number[];
  apm?: ApmData;
  has_apm?: boolean;
}

export type SortDirection = 'asc' | 'desc';

export interface MatchGroup {
  date: string;
  matches: Match[];
}

export interface Map {
  name: string;
  count: number;
}

export interface MatchType {
  name: string;
  count: number;
}
