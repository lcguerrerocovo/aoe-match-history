export interface Player {
  name: string;
  civ: string | number;
  number: number;
  color_id: number;
  user_id: string;
  winner: boolean;
  rate_snapshot: number;
}

export interface Team {
  number: number;
  players: Player[];
  won: boolean;
}

export interface Match {
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
