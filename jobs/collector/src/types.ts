// --- Relic API raw response types (subset from proxy/types.ts) ---

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

// --- Leaderboard types ---

export interface LeaderboardEntry {
  statgroup_id: number;
  lastmatchdate: number;
}

export interface StatGroupMember {
  profile_id: number;
  alias: string;
  name: string;
}

export interface StatGroup {
  id: number;
  members: StatGroupMember[];
}

export interface LeaderboardResponse {
  rankTotal: number;
  leaderboardStats: LeaderboardEntry[];
  statGroups: StatGroup[];
}

// --- ID-to-name mapping ---

export type IdNameMap = Record<string, string>;
