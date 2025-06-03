export interface Player {
  name: string;
  team: number;
  civ: string;
  apm: number;
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
  };
  map: string;
  duration: string;
  teams: string[];
  players: string[];
  apmCharts: {
    player: string;
    url: string;
  }[];
  winning_team?: number;
  winning_team_players?: string[];
}

export interface MatchGroup {
  date: string;
  matches: Match[];
}

export interface Map {
    name: string;
    count: number;
}
