// --- Relic API raw response types ---

export type RelicResponse<T> = [number, T];

export interface RawMatchHistoryMember {
  profile_id: number;
  oldrating: number;
  newrating: number;
}

export interface RawMatchReportResult {
  profile_id: number;
  civilization_id: number;
  resulttype: number;
  teamid: number;
}

export interface RawMatchUrl {
  profile_id: number;
  url: string;
  size?: number;
}

export interface RawProfile {
  profile_id: number;
  name: string;
  alias: string;
}

export interface RawMatch {
  id: number;
  startgametime: number;
  completiontime: number;
  description: string;
  matchtype_id: number;
  mapname: string;
  options: string;
  slotinfo: string;
  maxplayers: number;
  matchhistoryreportresults: RawMatchReportResult[];
  matchhistorymember: RawMatchHistoryMember[];
  matchurls: RawMatchUrl[];
}

export interface RawMatchHistoryResponse {
  profiles: RawProfile[];
  matchHistoryStats: RawMatch[];
}

// --- Decoded types ---

export interface DecodedOptions {
  [key: string]: string;
}

export interface PlayerMetadata {
  unknown1: string;
  civId: string;
  colorId: number | null;
  teamId: string;
}

export interface SlotInfoPlayer {
  'profileInfo.id': number;
  metaData: PlayerMetadata | string | null;
  teamID?: number;
  [key: string]: unknown;
}

// --- Processed output types ---

export interface ProcessedPlayer {
  name: string;
  original_name?: string;
  civ: string | number;
  number: number;
  color_id: number;
  user_id: number | string;
  winner: boolean;
  rating: number | null;
  rating_change: number | null;
  save_game_url?: string | null;
  save_game_size?: number | null;
  match_id?: number;
  replay_available?: boolean | null;
}

export interface ProcessedMatch {
  match_id: string;
  map_id: number | null;
  start_time: string;
  description: string | null;
  diplomacy: {
    type: string;
    team_size: string;
  };
  map: string;
  duration: number;
  teams: ProcessedPlayer[][];
  players: ProcessedPlayer[];
  winning_team: number | undefined;
  winning_teams: number[];
  apm?: ApmData;
  has_apm?: boolean;
}

// --- Handler response ---

export interface HandlerResponse<T> {
  data: T;
  headers: Record<string, string>;
}

// --- Session / Auth ---

export interface SessionData {
  sessionId: string;
  steamId64: string;
  steamUserName: string;
  base64Ticket: string;
  expiry: number;
  callNumber: number;
  createdAt?: number;
  lastCallTime: number | null;
}

export interface AuthResult {
  sessionId: string;
  steamId64: string;
  steamUserName: string;
  base64Ticket: string;
}

// --- APM ---

export interface ApmPlayerData {
  minute: number;
  total: number;
}

export interface ApmData {
  players: Record<string, ApmPlayerData[]>;
  [key: string]: unknown;
}

export interface ApmStatus {
  hasSaveGame: boolean;
  isProcessed: boolean;
  state: 'greyStatus' | 'silverStatus' | 'bronzeStatus';
}

// --- Search ---

export interface PlayerSearchResult {
  id: string;
  name: string;
  country: string;
  matches: number;
  lastMatchDate?: string;
  profile_id: number;
  clanlist_name?: string;
}

// --- Relic Player Service ---

export interface FindProfilesResult {
  success: boolean;
  data?: Array<{ id: number; name: string; matches: number }>;
  error?: string;
  fullResponse?: unknown;
  authFailure?: boolean;
  status?: number;
  responseData?: unknown;
}

export interface SinglePlayerMatch {
  match_id: number;
  map_id: number;
  map_name: string;
  match_type: number;
  unknown: unknown;
  settings: DecodedOptions;
  players: SlotInfoPlayer[];
  name: string;
  start_time: number;
  end_time: number;
}

export interface SinglePlayerHistoryResult {
  success: boolean;
  data?: SinglePlayerMatch[];
  error?: string;
  fullResponse?: unknown;
  authFailure?: boolean;
}

// --- Map resolve helper ---

export interface ResolveMapInput {
  options?: DecodedOptions | null;
  settings?: DecodedOptions | null;
  mapId?: number | null;
  rawName?: string;
}

export interface ResolvedMap {
  id: number | null;
  name: string;
}

// --- Mapping types ---

export type IdNameMap = Record<string, string>;

// --- Live matches ---

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
  teams: LiveMatchPlayer[][];
  players: LiveMatchPlayer[];
}

export interface LiveMatchesResult {
  success: boolean;
  data?: { matches: unknown[][]; players: unknown[][] };
  error?: string;
  authFailure?: boolean;
}
