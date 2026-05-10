import { Storage } from '@google-cloud/storage';
import pino from 'pino';
import { loadPatches, findMajorPatches, loadResolvedMappings } from './mappings.js';
import { queryCivStats } from './bigquery.js';
import type { StatsRow } from './bigquery.js';
import type { ResolvedMappings } from './mappings.js';

const log = pino({ name: 'stats-generator' });

const OUTPUT_BUCKET = process.env.OUTPUT_BUCKET || 'aoe2.site';
const OUTPUT_PATH = 'data/civ-stats.json';

type MatchCategory = '1v1' | 'team';
type PatchPeriod = 'current' | 'previous';

interface CivMapStats {
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  pickRate: number;
}

interface CivPatchStats {
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  pickRate: number;
  maps: Record<string, CivMapStats>;
}

interface CivStats {
  current: CivPatchStats;
  previous: CivPatchStats;
}

interface MatchTypeSection {
  civs: Record<string, CivStats>;
}

interface TotalMatchesByMap {
  current: Record<string, number>;
  previous: Record<string, number>;
}

interface StatsOutput {
  meta: {
    generatedAt: string;
    patches: {
      current: { version: number; date: string; title: string };
      previous: { version: number; date: string; title: string };
    };
    totalPicks: {
      '1v1': { current: number; previous: number };
      team: { current: number; previous: number };
    };
    totalPicksByMap: {
      '1v1': TotalMatchesByMap;
      team: TotalMatchesByMap;
    };
  };
  '1v1': MatchTypeSection;
  team: MatchTypeSection;
}

function getMatchCategory(matchTypeId: number): MatchCategory {
  return matchTypeId === 6 ? '1v1' : 'team';
}

function resolveCivName(civId: number, patch: PatchPeriod, mappings: ResolvedMappings): string {
  return mappings.civs[patch][civId] ?? `Unknown_${civId}`;
}

function resolveMapName(mapId: number, patch: PatchPeriod, mappings: ResolvedMappings): string | null {
  return mappings.maps[patch][mapId] ?? null;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function buildStats(
  rows: StatsRow[],
  mappings: ResolvedMappings,
): { sections: Record<MatchCategory, MatchTypeSection>; totals: Record<MatchCategory, Record<PatchPeriod, number>>; totalsByMap: Record<MatchCategory, TotalMatchesByMap> } {
  const totals: Record<MatchCategory, Record<PatchPeriod, number>> = {
    '1v1': { current: 0, previous: 0 },
    team: { current: 0, previous: 0 },
  };

  const totalsByMap: Record<MatchCategory, TotalMatchesByMap> = {
    '1v1': { current: {}, previous: {} },
    team: { current: {}, previous: {} },
  };

  const accumulator: Record<MatchCategory, Record<string, Record<PatchPeriod, { wins: number; losses: number; total: number; maps: Record<string, { wins: number; losses: number; total: number }> }>>> = {
    '1v1': {},
    team: {},
  };

  for (const row of rows) {
    const category = getMatchCategory(row.match_type_id);
    const patch = row.patch as PatchPeriod;
    const civName = resolveCivName(row.civ_id, patch, mappings);
    const mapName = row.map_id != null ? resolveMapName(row.map_id, patch, mappings) : null;

    totals[category][patch] += row.total_picks;

    if (mapName) {
      totalsByMap[category][patch][mapName] = (totalsByMap[category][patch][mapName] ?? 0) + row.total_picks;
    }

    if (!accumulator[category][civName]) {
      accumulator[category][civName] = {
        current: { wins: 0, losses: 0, total: 0, maps: {} },
        previous: { wins: 0, losses: 0, total: 0, maps: {} },
      };
    }

    const civAcc = accumulator[category][civName][patch];
    civAcc.wins += row.wins;
    civAcc.losses += row.losses;
    civAcc.total += row.total_picks;

    if (mapName) {
      if (!civAcc.maps[mapName]) {
        civAcc.maps[mapName] = { wins: 0, losses: 0, total: 0 };
      }
      civAcc.maps[mapName].wins += row.wins;
      civAcc.maps[mapName].losses += row.losses;
      civAcc.maps[mapName].total += row.total_picks;
    }
  }

  const sections: Record<MatchCategory, MatchTypeSection> = { '1v1': { civs: {} }, team: { civs: {} } };

  for (const category of ['1v1', 'team'] as MatchCategory[]) {
    for (const [civName, patches] of Object.entries(accumulator[category])) {
      const civStats: CivStats = {
        current: buildCivPatchStats(patches.current, totals[category].current, totalsByMap[category].current),
        previous: buildCivPatchStats(patches.previous, totals[category].previous, totalsByMap[category].previous),
      };
      sections[category].civs[civName] = civStats;
    }
  }

  return { sections, totals, totalsByMap };
}

function buildCivPatchStats(
  acc: { wins: number; losses: number; total: number; maps: Record<string, { wins: number; losses: number; total: number }> },
  totalGamesInCategory: number,
  totalsByMap: Record<string, number>,
): CivPatchStats {
  const maps: Record<string, CivMapStats> = {};
  for (const [mapName, mapAcc] of Object.entries(acc.maps)) {
    const mapTotal = totalsByMap[mapName] ?? mapAcc.total;
    maps[mapName] = {
      wins: mapAcc.wins,
      losses: mapAcc.losses,
      totalGames: mapAcc.total,
      winRate: round(mapAcc.total > 0 ? mapAcc.wins / mapAcc.total : 0, 4),
      pickRate: round(mapTotal > 0 ? mapAcc.total / mapTotal : 0, 4),
    };
  }

  return {
    wins: acc.wins,
    losses: acc.losses,
    totalGames: acc.total,
    winRate: round(acc.total > 0 ? acc.wins / acc.total : 0, 4),
    pickRate: round(totalGamesInCategory > 0 ? acc.total / totalGamesInCategory : 0, 4),
    maps,
  };
}

export async function generateStats(): Promise<void> {
  const patches = await loadPatches();
  const { current, previous } = findMajorPatches(patches);

  log.info({
    currentPatch: { version: current.version, date: current.date },
    previousPatch: { version: previous.version, date: previous.date },
  }, 'Generating stats for patch periods');

  const mappings = await loadResolvedMappings(current.date, previous.date);
  const rows = await queryCivStats(previous.date, current.date);
  const { sections, totals, totalsByMap } = buildStats(rows, mappings);

  const civCount1v1 = Object.keys(sections['1v1'].civs).length;
  const civCountTeam = Object.keys(sections.team.civs).length;
  log.info({ civCount1v1, civCountTeam, totalRows: rows.length }, 'Stats built');

  const output: StatsOutput = {
    meta: {
      generatedAt: new Date().toISOString(),
      patches: {
        current: { version: current.version, date: current.date, title: current.title },
        previous: { version: previous.version, date: previous.date, title: previous.title },
      },
      totalPicks: {
        '1v1': { current: totals['1v1'].current, previous: totals['1v1'].previous },
        team: { current: totals.team.current, previous: totals.team.previous },
      },
      totalPicksByMap: {
        '1v1': totalsByMap['1v1'],
        team: totalsByMap.team,
      },
    },
    '1v1': sections['1v1'],
    team: sections.team,
  };

  const json = JSON.stringify(output);
  const sizeMB = (Buffer.byteLength(json) / 1024 / 1024).toFixed(2);
  log.info({ sizeMB }, 'Stats JSON generated');

  const storage = new Storage();
  await storage.bucket(OUTPUT_BUCKET).file(OUTPUT_PATH).save(json, {
    contentType: 'application/json',
    metadata: {
      cacheControl: 'public, max-age=3600',
    },
  });

  log.info({ bucket: OUTPUT_BUCKET, path: OUTPUT_PATH }, 'Stats uploaded to GCS');
}
