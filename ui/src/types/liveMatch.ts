export interface LiveMatchPlayer {
  name: string;
  profile_id: number;
  rating: number | null;
  civ: string | number;
  team: number;
  steam_id?: string;
}

export interface LiveMatch {
  match_id: number;
  map: string;
  map_id: number;
  matchtype_id: number;
  game_type: string;
  num_players: number;
  start_time: number;
  server: string;
  players: LiveMatchPlayer[];
}
