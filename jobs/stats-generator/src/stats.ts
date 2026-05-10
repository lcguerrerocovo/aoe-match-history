import { Storage } from '@google-cloud/storage';
import pino from 'pino';
import { loadPatches, findMajorPatches, loadBalancePatches, findBalancePatchBoundaries, loadResolvedMappings } from './mappings.js';
import { queryCivStats } from './bigquery.js';
import type { StatsRow } from './bigquery.js';
import type { ResolvedMappings } from './mappings.js';

const log = pino({ name: 'stats-generator' });

const OUTPUT_BUCKET = process.env.OUTPUT_BUCKET || 'aoe2.site';
const OUTPUT_PATH = 'data/civ-stats.json';

const ELO_BRACKETS = ['all', '<1000', '1000-1500', '1500-2000', '2000+'] as const;

type MatchCategory = '1v1' | 'team';
type PatchPeriod = 'current' | 'previous';
type EloBracket = typeof ELO_BRACKETS[number];

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
      current: { version: number; date: string; title: string; civChanges?: Record<string, string[]>; generalChanges?: string[] };
      previous: { version: number; date: string; title: string; civChanges?: Record<string, string[]>; generalChanges?: string[] };
    };
    eloBrackets: readonly string[];
    totalPicks: {
      '1v1': Record<EloBracket, { current: number; previous: number }>;
      team: Record<EloBracket, { current: number; previous: number }>;
    };
    totalPicksByMap: {
      '1v1': TotalMatchesByMap;
      team: TotalMatchesByMap;
    };
  };
  '1v1': Record<EloBracket, MatchTypeSection>;
  team: Record<EloBracket, MatchTypeSection>;
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

interface Accumulator {
  wins: number;
  losses: number;
  total: number;
  maps: Record<string, { wins: number; losses: number; total: number }>;
}

function emptyAccumulator(): Accumulator {
  return { wins: 0, losses: 0, total: 0, maps: {} };
}

function buildStats(
  rows: StatsRow[],
  mappings: ResolvedMappings,
) {
  // totals[category][eloBracket][patch] = count
  const totals: Record<MatchCategory, Record<EloBracket, Record<PatchPeriod, number>>> = {
    '1v1': {} as Record<EloBracket, Record<PatchPeriod, number>>,
    team: {} as Record<EloBracket, Record<PatchPeriod, number>>,
  };

  const totalsByMap: Record<MatchCategory, Record<EloBracket, TotalMatchesByMap>> = {
    '1v1': {} as Record<EloBracket, TotalMatchesByMap>,
    team: {} as Record<EloBracket, TotalMatchesByMap>,
  };

  // accumulator[category][eloBracket][civName][patch]
  const accumulator: Record<MatchCategory, Record<EloBracket, Record<string, Record<PatchPeriod, Accumulator>>>> = {
    '1v1': {} as Record<EloBracket, Record<string, Record<PatchPeriod, Accumulator>>>,
    team: {} as Record<EloBracket, Record<string, Record<PatchPeriod, Accumulator>>>,
  };

  for (const bracket of ELO_BRACKETS) {
    totals['1v1'][bracket] = { current: 0, previous: 0 };
    totals.team[bracket] = { current: 0, previous: 0 };
    totalsByMap['1v1'][bracket] = { current: {}, previous: {} };
    totalsByMap.team[bracket] = { current: {}, previous: {} };
    accumulator['1v1'][bracket] = {};
    accumulator.team[bracket] = {};
  }

  for (const row of rows) {
    const category = getMatchCategory(row.match_type_id);
    const patch = row.patch as PatchPeriod;
    const civName = resolveCivName(row.civ_id, patch, mappings);
    const mapName = row.map_id != null ? resolveMapName(row.map_id, patch, mappings) : null;
    const eloBracket = row.elo_bracket as EloBracket;

    // Accumulate into both the specific bracket AND the 'all' bucket
    const brackets: EloBracket[] = eloBracket === 'all' ? ['all'] : [eloBracket, 'all'];

    for (const bracket of brackets) {
      totals[category][bracket][patch] += row.total_picks;

      if (!accumulator[category][bracket][civName]) {
        accumulator[category][bracket][civName] = {
          current: emptyAccumulator(),
          previous: emptyAccumulator(),
        };
      }

      const civAcc = accumulator[category][bracket][civName][patch];
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

    if (mapName && (eloBracket !== 'all')) {
      for (const bracket of brackets) {
        totalsByMap[category][bracket][patch][mapName] = (totalsByMap[category][bracket][patch][mapName] ?? 0) + row.total_picks;
      }
    }
  }

  const sections: Record<MatchCategory, Record<EloBracket, MatchTypeSection>> = {
    '1v1': {} as Record<EloBracket, MatchTypeSection>,
    team: {} as Record<EloBracket, MatchTypeSection>,
  };

  for (const category of ['1v1', 'team'] as MatchCategory[]) {
    for (const bracket of ELO_BRACKETS) {
      sections[category][bracket] = { civs: {} };
      const bracketTotalsByMap = totalsByMap[category][bracket];

      for (const [civName, patches] of Object.entries(accumulator[category][bracket])) {
        sections[category][bracket].civs[civName] = {
          current: buildCivPatchStats(patches.current, totals[category][bracket].current, bracketTotalsByMap.current),
          previous: buildCivPatchStats(patches.previous, totals[category][bracket].previous, bracketTotalsByMap.previous),
        };
      }
    }
  }

  return { sections, totals, totalsByMap };
}

function buildCivPatchStats(
  acc: Accumulator,
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
  const balancePatches = await loadBalancePatches();

  let currentPatch: { version: number; date: string; title: string; civChanges?: Record<string, string[]>; generalChanges?: string[] };
  let previousPatch: typeof currentPatch;

  if (balancePatches && balancePatches.length >= 2) {
    const { current, previous } = findBalancePatchBoundaries(balancePatches);
    currentPatch = current;
    previousPatch = previous;
    log.info('Using balance-patches.json for patch boundaries');
  } else {
    const patches = await loadPatches();
    const { current, previous } = findMajorPatches(patches);
    currentPatch = current;
    previousPatch = previous;
    log.info('Fell back to findMajorPatches for patch boundaries');
  }

  log.info({
    currentPatch: { version: currentPatch.version, date: currentPatch.date },
    previousPatch: { version: previousPatch.version, date: previousPatch.date },
  }, 'Generating stats for patch periods');

  const mappings = await loadResolvedMappings(currentPatch.date, previousPatch.date);
  const rows = await queryCivStats(previousPatch.date, currentPatch.date);
  const { sections, totals, totalsByMap } = buildStats(rows, mappings);

  const civCount1v1 = Object.keys(sections['1v1'].all.civs).length;
  const civCountTeam = Object.keys(sections.team.all.civs).length;
  log.info({ civCount1v1, civCountTeam, totalRows: rows.length, eloBrackets: ELO_BRACKETS.length }, 'Stats built');

  const output: StatsOutput = {
    meta: {
      generatedAt: new Date().toISOString(),
      patches: {
        current: {
          version: currentPatch.version, date: currentPatch.date, title: currentPatch.title,
          ...(currentPatch.civChanges && { civChanges: currentPatch.civChanges }),
          ...(currentPatch.generalChanges && { generalChanges: currentPatch.generalChanges }),
        },
        previous: {
          version: previousPatch.version, date: previousPatch.date, title: previousPatch.title,
          ...(previousPatch.civChanges && { civChanges: previousPatch.civChanges }),
          ...(previousPatch.generalChanges && { generalChanges: previousPatch.generalChanges }),
        },
      },
      eloBrackets: ELO_BRACKETS,
      totalPicks: {
        '1v1': totals['1v1'],
        team: totals.team,
      },
      totalPicksByMap: {
        '1v1': totalsByMap['1v1'].all,
        team: totalsByMap.team.all,
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
      cacheControl: 'public, max-age=86400',
    },
  });

  log.info({ bucket: OUTPUT_BUCKET, path: OUTPUT_PATH }, 'Stats uploaded to GCS');

  const cfZoneId = process.env.CLOUDFLARE_ZONE_ID;
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  if (cfZoneId && cfToken) {
    const purgeResp = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/purge_cache`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: ['https://aoe2.site/data/civ-stats.json'] }),
      },
    );
    const purgeResult = await purgeResp.json() as { success: boolean };
    log.info({ success: purgeResult.success }, 'Cloudflare cache purged for civ-stats.json');
  } else {
    log.info('Skipping Cloudflare cache purge (no credentials)');
  }
}
