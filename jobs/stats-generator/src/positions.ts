import pino from 'pino';
import type { PositionRow } from './postgres.js';

const log = pino({ name: 'stats-positions' });

type Position = 'pocket' | 'flank';
type GameSize = '3v3' | '4v4';
type EloBracket = 'all' | '<1000' | '1000-1500' | '1500+';

const ELO_BRACKETS: readonly EloBracket[] = ['all', '<1000', '1000-1500', '1500+'];
const MAX_ELO_GAP = 200;
const MIN_PICK_RATE = 0.01;
const MIN_MAP_GAMES = 1500;

interface CivPositionStats {
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  pickRate: number;
}

interface PositionSection {
  totalPicks: number;
  civs: Record<string, CivPositionStats>;
}

interface MapSection {
  totalGames: number;
  pocket: PositionSection;
  flank: PositionSection;
}

export interface PositionStatsOutput {
  meta: {
    generatedAt: string;
    dateRange: { start: string; end: string };
    minPickRate: number;
    minMapGames: number;
    excludedMaps: string[];
  };
  '3v3': Record<EloBracket, Record<string, MapSection>>;
  '4v4': Record<EloBracket, Record<string, MapSection>>;
}

function getEloBracket(rating: number | null): EloBracket {
  if (rating == null || rating <= 0) return 'all';
  if (rating < 1000) return '<1000';
  if (rating < 1500) return '1000-1500';
  return '1500+';
}

export function classifyPosition(colorId: number, teamColorIds: number[]): Position {
  // Sort numerically — pocket is the middle number(s), flank is the outer numbers
  // [1,3,5] → flanks=1,5 pocket=3 | [2,6,8] → flanks=2,8 pocket=6
  // [1,3,5,7] → flanks=1,7 pockets=3,5 | [2,4,6,8] → flanks=2,8 pockets=4,6
  const sorted = [...teamColorIds].sort((a, b) => a - b);
  const flankColors = new Set([sorted[0], sorted[sorted.length - 1]]);
  return flankColors.has(colorId) ? 'flank' : 'pocket';
}

function getGameSize(matchTypeId: number): GameSize {
  return matchTypeId === 8 ? '3v3' : '4v4';
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

interface Accumulator {
  wins: number;
  losses: number;
  total: number;
}

export function buildPositionStats(
  rows: PositionRow[],
  dateRange: { start: string; end: string },
  mapNames: Record<number, string>,
): PositionStatsOutput {
  const matchPlayers = new Map<number, PositionRow[]>();
  for (const row of rows) {
    let players = matchPlayers.get(row.match_id);
    if (!players) {
      players = [];
      matchPlayers.set(row.match_id, players);
    }
    players.push(row);
  }

  // acc[gameSize][eloBracket][mapName][position][civName]
  const acc: Record<GameSize, Record<EloBracket, Record<string, Record<Position, Record<string, Accumulator>>>>> = {
    '3v3': {} as Record<EloBracket, Record<string, Record<Position, Record<string, Accumulator>>>>,
    '4v4': {} as Record<EloBracket, Record<string, Record<Position, Record<string, Accumulator>>>>,
  };

  const totalGames: Record<GameSize, Record<EloBracket, Record<string, number>>> = {
    '3v3': {} as Record<EloBracket, Record<string, number>>,
    '4v4': {} as Record<EloBracket, Record<string, number>>,
  };

  const positionTotals: Record<GameSize, Record<EloBracket, Record<string, Record<Position, number>>>> = {
    '3v3': {} as Record<EloBracket, Record<string, Record<Position, number>>>,
    '4v4': {} as Record<EloBracket, Record<string, Record<Position, number>>>,
  };

  for (const bracket of ELO_BRACKETS) {
    acc['3v3'][bracket] = {};
    acc['4v4'][bracket] = {};
    totalGames['3v3'][bracket] = {};
    totalGames['4v4'][bracket] = {};
    positionTotals['3v3'][bracket] = {};
    positionTotals['4v4'][bracket] = {};
  }

  const matchesCounted = new Set<string>();

  for (const [matchId, players] of matchPlayers) {
    if (players.length === 0) continue;
    const gameSize = getGameSize(players[0].match_type_id);
    const mapName = mapNames[players[0].map_id];
    if (!mapName) continue;
    const mapLower = mapName.toLowerCase();
    if (mapLower === 'nomad' || mapLower === 'megarandom' || mapLower === 'coastal forest') continue;
    const expectedPlayers = gameSize === '3v3' ? 6 : 8;
    if (players.length !== expectedPlayers) continue;

    // ELO gap filter: skip matches where team avg ELO diff > 200
    const teamRatings = new Map<number, number[]>();
    for (const p of players) {
      if (p.old_rating && p.old_rating > 0) {
        let ratings = teamRatings.get(p.team_id);
        if (!ratings) {
          ratings = [];
          teamRatings.set(p.team_id, ratings);
        }
        ratings.push(p.old_rating);
      }
    }
    if (teamRatings.size === 2) {
      const avgs = [...teamRatings.values()].map(
        ratings => ratings.reduce((a, b) => a + b, 0) / ratings.length,
      );
      if (Math.abs(avgs[0] - avgs[1]) > MAX_ELO_GAP) continue;
    }

    const teamGroups = new Map<number, number[]>();
    for (const p of players) {
      let colors = teamGroups.get(p.team_id);
      if (!colors) {
        colors = [];
        teamGroups.set(p.team_id, colors);
      }
      colors.push(p.color_id);
    }

    for (const p of players) {
      const teamColors = teamGroups.get(p.team_id);
      if (!teamColors) continue;
      const position = classifyPosition(p.color_id, teamColors);
      const playerBracket = getEloBracket(p.old_rating);
      const brackets: EloBracket[] = playerBracket === 'all' ? ['all'] : [playerBracket, 'all'];
      const civName = p.civilization_name;

      for (const bracket of brackets) {
        if (!acc[gameSize][bracket][mapName]) {
          acc[gameSize][bracket][mapName] = { pocket: {}, flank: {} };
        }
        if (!acc[gameSize][bracket][mapName][position][civName]) {
          acc[gameSize][bracket][mapName][position][civName] = { wins: 0, losses: 0, total: 0 };
        }

        const civAcc = acc[gameSize][bracket][mapName][position][civName];
        civAcc.total++;
        if (p.result_type === 1) civAcc.wins++;
        else civAcc.losses++;

        if (!positionTotals[gameSize][bracket][mapName]) {
          positionTotals[gameSize][bracket][mapName] = { pocket: 0, flank: 0 };
        }
        positionTotals[gameSize][bracket][mapName][position]++;

        const matchKey = `${matchId}-${bracket}`;
        if (!matchesCounted.has(matchKey)) {
          matchesCounted.add(matchKey);
          totalGames[gameSize][bracket][mapName] = (totalGames[gameSize][bracket][mapName] ?? 0) + 1;
        }
      }
    }
  }

  const output: PositionStatsOutput = {
    meta: {
      generatedAt: new Date().toISOString(),
      dateRange,
      minPickRate: MIN_PICK_RATE,
      minMapGames: MIN_MAP_GAMES,
      excludedMaps: ['Nomad', 'MegaRandom', 'Coastal Forest'],
    },
    '3v3': {} as Record<EloBracket, Record<string, MapSection>>,
    '4v4': {} as Record<EloBracket, Record<string, MapSection>>,
  };

  for (const gameSize of ['3v3', '4v4'] as GameSize[]) {
    // Filter maps by min games using the 'all' bracket totals
    const allBracketGames = totalGames[gameSize].all;
    const eligibleMaps = new Set(
      Object.entries(allBracketGames)
        .filter(([, count]) => count >= MIN_MAP_GAMES)
        .map(([name]) => name),
    );

    for (const bracket of ELO_BRACKETS) {
      output[gameSize][bracket] = {};
      for (const [mapName, positions] of Object.entries(acc[gameSize][bracket])) {
        if (!eligibleMaps.has(mapName)) continue;
        const mapTotalGames = totalGames[gameSize][bracket][mapName] ?? 0;
        const mapSection: MapSection = {
          totalGames: mapTotalGames,
          pocket: buildPositionSection(positions.pocket, positionTotals[gameSize][bracket]?.[mapName]?.pocket ?? 0),
          flank: buildPositionSection(positions.flank, positionTotals[gameSize][bracket]?.[mapName]?.flank ?? 0),
        };
        output[gameSize][bracket][mapName] = mapSection;
      }
    }
  }

  const mapCount3v3 = Object.keys(output['3v3'].all).length;
  const mapCount4v4 = Object.keys(output['4v4'].all).length;
  log.info({ matchCount: matchPlayers.size, mapCount3v3, mapCount4v4 }, 'Position stats built');

  return output;
}

function buildPositionSection(
  civAccumulators: Record<string, Accumulator>,
  totalPicks: number,
): PositionSection {
  const civs: Record<string, CivPositionStats> = {};
  for (const [civName, acc] of Object.entries(civAccumulators)) {
    const pickRate = totalPicks > 0 ? acc.total / totalPicks : 0;
    if (pickRate < MIN_PICK_RATE) continue;
    civs[civName] = {
      wins: acc.wins,
      losses: acc.losses,
      totalGames: acc.total,
      winRate: round(acc.total > 0 ? acc.wins / acc.total : 0, 4),
      pickRate: round(pickRate, 4),
    };
  }
  return { totalPicks, civs };
}
