export interface Player {
  name: string;
  civ: string | number;
  number: number;
  color_id: number;
  user_id: string;
  winner: boolean;
  rating: number | null;
  rating_change: number | null;
}

export interface Team {
  number: number;
  players: Player[];
  won: boolean;
}

export interface Match {
  description: string;
  match_id: string;
  start_time: string;
  diplomacy: {
    type: string;
    team_size: string;
    slot_info?: any;
  };
  map: string;
  options: string;
  duration: number;
  teams: Team[];
  players: Player[];
  winning_team?: number;
  winning_teams?: number[];
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
