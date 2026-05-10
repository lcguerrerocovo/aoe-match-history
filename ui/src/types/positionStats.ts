export type GameSize = '3v3' | '4v4';
export type Position = 'pocket' | 'flank';
export type PositionEloBracket = 'all' | '<1000' | '1000-1500' | '1500+';

export interface PositionCivStats {
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  pickRate: number;
}

export interface PositionSection {
  totalPicks: number;
  civs: Record<string, PositionCivStats>;
}

export interface MapSection {
  totalGames: number;
  pocket: PositionSection;
  flank: PositionSection;
}

export interface PositionStatsData {
  meta: {
    generatedAt: string;
    patch: {
      version: number;
      date: string;
      title: string;
    };
    minPickRate: number;
    excludedMaps: string[];
  };
  '3v3': Record<PositionEloBracket, Record<string, MapSection>>;
  '4v4': Record<PositionEloBracket, Record<string, MapSection>>;
}
