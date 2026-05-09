import { decodeOptions, decodeSlotInfo } from './decoders';
import { log } from './config';
import type { RawMatch, RawProfile, ProcessedMatch, ProcessedPlayer, DecodedOptions, IdNameMap, ResolveMapInput, ResolvedMap } from './types';

interface RlMappings {
  civs?: { aoe2?: Record<string, Record<string, number>> };
  maps?: { aoe2?: Record<string, Record<string, number>> };
}

// Mapping version boundaries (unix seconds)
// v1→v2: Romans added at id 33 (patch 59165, 2022-02-22)
// v3→v4: Armenians(0) + Georgians(16) inserted, all IDs shifted (patch 95810, 2023-10-30)
// v4→v5: 9 new civs appended at end, no shifts (patch 162286, 2025-12-02)
const V2_BOUNDARY = Date.UTC(2022, 1, 22) / 1000; // 2022-02-22
const V4_BOUNDARY = Date.UTC(2023, 9, 30) / 1000; // 2023-10-30

type MappingVersion = 1 | 2 | 4;

function getMappingVersion(matchTimeUnix: number): MappingVersion {
  if (matchTimeUnix < V2_BOUNDARY) return 1;
  if (matchTimeUnix < V4_BOUNDARY) return 2;
  return 4;
}

// Module-level caches
let rlMappings: RlMappings | null = null;
let civMaps: Record<MappingVersion, IdNameMap> | null = null;
let mapMap: IdNameMap | null = null;

export async function loadMappings(): Promise<RlMappings> {
  if (!rlMappings) {
    const response = await fetch('https://aoe2.site/data/rl_api_mappings.json');
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }
    rlMappings = await response.json() as RlMappings;
  }
  return rlMappings as RlMappings;
}

async function buildCivMaps(): Promise<Record<MappingVersion, IdNameMap>> {
  if (civMaps) return civMaps;
  const mappings = await loadMappings();
  if (!mappings?.civs?.aoe2) {
    civMaps = { 1: {}, 2: {}, 4: {} };
    return civMaps;
  }
  const v1: IdNameMap = {};
  const v2: IdNameMap = {};
  const v4: IdNameMap = {};
  for (const [civName, versions] of Object.entries(mappings.civs.aoe2)) {
    if (typeof versions !== 'object' || versions === null) continue;
    const v = versions as Record<string, number>;
    const maxVer = Math.max(...Object.keys(v).map(Number));
    if (v['1'] !== undefined && v['1'] >= 0) v1[v['1'].toString()] = civName;
    // v2 and v3 have same mapping
    const v2Key = v['3'] ?? v['2'];
    if (v2Key !== undefined && v2Key >= 0) v2[v2Key.toString()] = civName;
    // v4+: prefer v5, then v4, then highest available
    const v4Key = v['5'] ?? v['4'] ?? v[maxVer.toString()];
    if (v4Key !== undefined && v4Key >= 0) v4[v4Key.toString()] = civName;
  }
  civMaps = { 1: v1, 2: v2, 4: v4 };
  return civMaps;
}

/** Current civ map (v4+) — use for live matches and current-version lookups */
export async function getCivMap(): Promise<IdNameMap> {
  const maps = await buildCivMaps();
  return maps[4];
}

/** Version-aware civ map — use for historical match data */
export async function getCivMapForDate(matchTimeUnix: number): Promise<IdNameMap> {
  const maps = await buildCivMaps();
  return maps[getMappingVersion(matchTimeUnix)];
}

export async function getMapMap(): Promise<IdNameMap> {
  if (!mapMap) {
    const mappings = await loadMappings();
    if (!mappings?.maps?.aoe2) return {};
    mapMap = {};
    for (const [mapName, versions] of Object.entries(mappings.maps.aoe2)) {
      if (typeof versions === 'object' && versions !== null) {
        const versionNumbers = Object.keys(versions).map(Number);
        const latestVersion = Math.max(...versionNumbers);
        const mapId = versions[latestVersion.toString()];
        if (mapId !== undefined) {
          mapMap[mapId.toString()] = mapName;
        }
      }
    }
  }
  return mapMap;
}

export function getGameType(matchTypeId: number): string | null {
  const gameTypes: Record<number, string> = {
    0: "Unranked",
    2: "DM 1v1",
    3: "DM Team",
    4: "DM Team",
    5: "DM Team",
    6: "RM 1v1",
    7: "RM Team",
    8: "RM Team",
    9: "RM Team",
    10: "Battle Royale",
    11: "Quick Match EW",
    12: "Quick Match EW Team",
    13: "Quick Match EW Team",
    14: "Quick Match EW Team",
    18: "Quick Match RM",
    19: "Quick Match RM Team",
    20: "Quick Match RM Team",
    21: "Quick Match RM Team",
    25: "Quick Match BR FFA",
    26: "EW 1v1",
    27: "EW Team",
    28: "EW Team",
    29: "EW Team"
  };
  return gameTypes[matchTypeId] || null;
}

export function groupPlayersIntoTeams(players: ProcessedPlayer[]): ProcessedPlayer[][] {
  const allSameTeam = players.length > 0 && players.every(p => p.number === players[0].number);

  const teams: (ProcessedPlayer[] | undefined)[] = players.reduce<(ProcessedPlayer[] | undefined)[]>((acc, player) => {
    const key = allSameTeam ? player.color_id : (player.number + 1);
    const teamIndex = key;
    if (teamIndex >= 0) {
      if (!acc[teamIndex]) acc[teamIndex] = [];
      acc[teamIndex]!.push(player);
    }
    return acc;
  }, []);

  return teams.filter((team): team is ProcessedPlayer[] => team != null && team.length > 0)
    .map(team => team.sort((a, b) => (a.color_id || 0) - (b.color_id || 0)));
}

export function detectWinningTeams(teams: ProcessedPlayer[][]): { winningTeam: number | undefined; winningTeams: number[] } {
  const winningTeams = teams
    .map((team, index) => team.some(player => player.winner) ? index + 1 : null)
    .filter((teamNumber): teamNumber is number => teamNumber !== null);

  return {
    winningTeam: winningTeams.length > 0 ? winningTeams[0] : undefined,
    winningTeams
  };
}

// Resolve map ID and friendly name from various sources
export function resolveMap(currentMapMap: IdNameMap, { options = null, settings = null, mapId = null, rawName = '' }: ResolveMapInput): ResolvedMap {
  const candidate = options?.['10'] || settings?.['10'] || mapId;
  const idStr = candidate?.toString?.();
  const name = idStr && currentMapMap[idStr] ? currentMapMap[idStr] : rawName;
  if (!name && idStr) {
    log.debug({ mapId: idStr, rawMap: rawName }, 'Map ID unresolved');
  }
  return { id: candidate ? parseInt(String(candidate), 10) : mapId, name };
}

export async function processMatch(match: RawMatch, profiles: RawProfile[]): Promise<ProcessedMatch> {
  const currentCivMap = await getCivMapForDate(match.startgametime);
  const currentMapMap = await getMapMap();

  // Create profile and rating maps
  const profileMap = new Map(profiles.map(p => [p.profile_id.toString(), p.alias]));
  const ratingMap = new Map((match.matchhistorymember || []).map(m => [
    m.profile_id,
    { oldRating: m.oldrating, newRating: m.newrating }
  ]));

  // Create save game URL map
  const saveGameMap = new Map((match.matchurls || []).map(url => [
    url.profile_id,
    {
      url: url.url,
      size: url.size || 0
    }
  ]));

  // Decode slot info (gracefully handle missing/invalid data)
  let slotInfo: Array<{ 'profileInfo.id': number; metaData?: { teamId?: string; colorId?: number | null } | null; [key: string]: unknown }> = [];
  try {
    slotInfo = decodeSlotInfo(match.slotinfo) as typeof slotInfo;
  } catch {
    // slotinfo may be undefined or malformed
  }

  // Process players with replay availability checking
  const players: ProcessedPlayer[] = await Promise.all(match.matchhistoryreportresults.map(async (result) => {
    const profileId = parseInt(String(result.profile_id));
    const playerSlot = slotInfo?.find(p => p['profileInfo.id'] === profileId);
    const metaData = playerSlot?.metaData as { teamId?: string; colorId?: number | null } | null | undefined;
    const teamId = metaData?.teamId ? parseInt(metaData.teamId) : result.teamid + 1;
    const civId = result.civilization_id;
    const colorId = metaData?.colorId ?? 0;
    const ratingInfo = ratingMap.get(result.profile_id);
    const saveGameInfo = saveGameMap.get(result.profile_id);

    // Find the original name with Steam ID from profiles
    const profile = profiles.find(p => p.profile_id === result.profile_id);
    const originalName = profile?.name || result.profile_id.toString();
    const displayName = profile?.alias || originalName;

    // Check replay availability
    const replayAvailable = null; // Will be checked asynchronously by the client

    return {
      name: displayName,
      original_name: originalName,
      civ: currentCivMap[civId.toString()] || civId,
      number: teamId,
      color_id: colorId,
      user_id: result.profile_id,
      winner: result.resulttype === 1,
      rating: ratingInfo?.newRating ?? null,
      rating_change: ratingInfo ? ratingInfo.newRating - ratingInfo.oldRating : null,
      save_game_url: saveGameInfo?.url || null,
      save_game_size: saveGameInfo?.size || null,
      match_id: match.id,
      replay_available: replayAvailable
    };
  }));

  // Group into teams and detect winners
  const teams = groupPlayersIntoTeams(players);
  const { winningTeam, winningTeams } = detectWinningTeams(teams);

  // Resolve map using shared helper
  const options = decodeOptions(match.options);
  const { id: resolvedMapId, name: mapName } = resolveMap(currentMapMap, { options, rawName: match.mapname });

  return {
    match_id: match.id.toString(),
    map_id: resolvedMapId,
    start_time: new Date(match.startgametime * 1000).toISOString(),
    description: match.description === "AUTOMATCH" ? getGameType(match.matchtype_id) : match.description,
    diplomacy: {
      type: getGameType(match.matchtype_id) || 'Unknown',
      team_size: match.maxplayers.toString(),
    },
    map: mapName,
    duration: match.completiontime - match.startgametime,
    teams: teams,
    players: players,
    winning_team: winningTeam,
    winning_teams: winningTeams
  };
}
