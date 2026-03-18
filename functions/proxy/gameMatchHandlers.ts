import { log, getFirestoreClient } from './config';
import { getCivMap, getMapMap, groupPlayersIntoTeams, resolveMap } from './matchProcessing';
import { withAuthRetry, getAuthenticatedPlayerService } from './authService';
import type { HandlerResponse, ProcessedMatch, ProcessedPlayer, IdNameMap, SinglePlayerMatch } from './types';

// Authenticated single-player recent match history via RelicPlayerService
export async function handleGameMatchHistory(idsStr: string): Promise<HandlerResponse<SinglePlayerMatch[]>> {
  const ids = idsStr.split(',').map(id => id.trim()).filter(Boolean);
  if (ids.length === 0) {
    throw new Error('No profile IDs provided');
  }

  const result = await withAuthRetry(async () => {
    const svc = await getAuthenticatedPlayerService();
    return svc.getRecentMatchSinglePlayerHistory(ids);
  });

  return {
    data: result.data!,
    headers: {
      'Cache-Control': 'private, max-age=60',
      'Vary': 'Accept-Encoding'
    }
  };
}

// Helper: batch fetch aliases from Firestore for given profile IDs
async function fetchAliases(profileIds: string[]): Promise<Map<string, string>> {
  if (!profileIds || profileIds.length === 0) return new Map();
  const db = getFirestoreClient();
  const aliasMap = new Map<string, string>();
  const chunkSize = 10; // Firestore "in" limit
  for (let i = 0; i < profileIds.length; i += chunkSize) {
    const chunk = profileIds.slice(i, i + chunkSize).map(id => parseInt(id, 10));
    try {
      const snap = await db.collection('players')
        .where('profile_id', 'in', chunk)
        .get();
      snap.forEach(doc => {
        const d = doc.data();
        const alias = d.alias || d.name || d.profile_id.toString();
        aliasMap.set(d.profile_id.toString(), alias);
      });
    } catch (e) {
      log.warn({ error: (e as Error).message, chunk }, 'Failed fetching aliases');
    }
  }
  return aliasMap;
}

// Processed variant
export async function handleProcessedGameMatchHistory(idsStr: string): Promise<HandlerResponse<{ id: string; name: string; matches: ProcessedMatch[] }>> {
  const raw = await handleGameMatchHistory(idsStr);

  // Pre-load civ mapping once for all matches
  const civMap = await getCivMap();
  const currentMapMap = await getMapMap();

  // Collect unique profile IDs across all matches
  const idSet = new Set<string>();
  (raw.data || []).forEach(m => {
    (m.players || []).forEach(p => {
      idSet.add((p as Record<string, unknown>)["profileInfo.id"]?.toString() || '');
    });
  });
  const aliasMap = await fetchAliases(Array.from(idSet));

  const transformMatch = (m: SinglePlayerMatch): ProcessedMatch => {
    // Build Player objects in UI-expected shape
    const rawPlayers = m.players || [];

    const players: ProcessedPlayer[] = rawPlayers.map((p) => {
      const profileIdStr = (p as Record<string, unknown>)["profileInfo.id"]?.toString() || '';
      const metaData = p.metaData as { civId?: string; colorId?: number; teamId?: string } | null;
      const civId = metaData?.civId ?? null;
      const colorId = metaData?.colorId ?? 0;
      const teamIdRaw = metaData?.teamId ?? (p as Record<string, unknown>).teamID ?? 0;
      const teamNumber = parseInt(String(teamIdRaw), 10) + 1;
      return {
        name: aliasMap.get(profileIdStr) || profileIdStr,
        civ: civMap[civId?.toString?.() ?? ""] || (civId as string | number),
        number: teamNumber,
        color_id: colorId,
        user_id: profileIdStr,
        winner: false,
        rating: null,
        rating_change: null
      };
    });

    // Group into teams using existing helper
    const teams = groupPlayersIntoTeams(players);

    // Resolve map using shared helper (single-player uses decoded settings)
    const { id: resolvedMapId, name: mapName } = resolveMap(currentMapMap, { settings: m.settings, mapId: m.map_id, rawName: m.map_name });

    return {
      match_id: m.match_id.toString(),
      map_id: resolvedMapId,
      start_time: new Date(m.start_time * 1000).toISOString(),
      description: m.name,
      diplomacy: { type: 'Single', team_size: teams.length.toString() },
      map: mapName,
      duration: m.end_time - m.start_time,
      teams,
      players,
      winning_team: undefined,
      winning_teams: []
    };
  };

  const processed = (raw.data || []).map(transformMatch);
  processed.sort((a, b) => b.start_time.localeCompare(a.start_time));

  // Derive name when single profile
  const respName = aliasMap.get(idsStr) || idsStr;

  return {
    data: { id: idsStr, name: respName, matches: processed },
    headers: raw.headers
  };
}
