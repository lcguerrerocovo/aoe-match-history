export interface CivMapStats {
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  pickRate: number;
}

export interface CivPatchStats extends CivMapStats {
  maps: Record<string, CivMapStats>;
}

export interface CivStats {
  current: CivPatchStats;
  previous: CivPatchStats;
}

export interface PatchInfo {
  version: number;
  date: string;
  title: string;
}

export type EloBracket = 'all' | '<1000' | '1000-1500' | '1500-2000' | '2000+';

export interface CivStatsData {
  meta: {
    generatedAt: string;
    patches: {
      current: PatchInfo;
      previous: PatchInfo;
    };
    eloBrackets: EloBracket[];
    totalPicks: {
      '1v1': Record<EloBracket, { current: number; previous: number }>;
      team: Record<EloBracket, { current: number; previous: number }>;
    };
    totalPicksByMap: {
      '1v1': { current: Record<string, number>; previous: Record<string, number> };
      team: { current: Record<string, number>; previous: Record<string, number> };
    };
  };
  '1v1': Record<EloBracket, { civs: Record<string, CivStats> }>;
  team: Record<EloBracket, { civs: Record<string, CivStats> }>;
}

export type MatchType = '1v1' | 'team';
