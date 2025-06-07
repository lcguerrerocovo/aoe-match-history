import type { Match } from '../types/match';
import { decodeOptions } from '../utils/optionsDecoder';
import { decodeSlotInfo } from '../utils/slotInfoDecoder';

const BASE_URL = import.meta.env.PROD ? 'https://aoe2.site' : window.location.origin;
const API_URL = `${BASE_URL}/api`;

let civMap: Record<string, string> | null = null;
let mapMap: Record<string, string> | null = null;

interface RlMappings {
  civs: {
    aoe2: Record<string, Record<string, number>>;
  };
  maps: {
    aoe2: Record<string, Record<string, number>>;
  };
}

let rlMappings: RlMappings | null = null;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

let matchesCache: CacheEntry<any[]> | null = null;
const CACHE_DURATION = 60 * 1000; // 1 minute in milliseconds

async function loadRlMappings() {
  if (!rlMappings) {
    const response = await fetch('/data/rl_api_mappings.json');
    rlMappings = await response.json();
  }
  return rlMappings;
}

export async function getCivMap(): Promise<Record<string, string>> {
  if (!civMap) {
    const mappings = await loadRlMappings();
    if (!mappings?.civs?.aoe2) return {};
    civMap = {};
    for (const [civName, versions] of Object.entries(mappings.civs.aoe2)) {
      if (typeof versions === 'object' && versions !== null) {
        // Get the latest version number
        const versionNumbers = Object.keys(versions).map(Number);
        const latestVersion = Math.max(...versionNumbers);
        // Use the latest version's ID as the key
        const civId = versions[latestVersion.toString()];
        if (civId !== undefined) {
          civMap[civId.toString()] = civName;
        }
      }
    }
  }
  return civMap;
}

export async function getMapMap(): Promise<Record<string, string>> {
  if (!mapMap) {
    const mappings = await loadRlMappings();
    if (!mappings?.maps?.aoe2) return {};
    mapMap = {};
    for (const [mapName, versions] of Object.entries(mappings.maps.aoe2)) {
      if (typeof versions === 'object' && versions !== null) {
        // Get the latest version number
        const versionNumbers = Object.keys(versions).map(Number);
        const latestVersion = Math.max(...versionNumbers);
        // Use the latest version's ID as the key
        const mapId = versions[latestVersion.toString()];
        if (mapId !== undefined) {
          mapMap[mapId.toString()] = mapName;
        }
      }
    }
  }
  return mapMap;
}

export async function getMatches(): Promise<any[]> {
  const now = Date.now();
  if (matchesCache && now - matchesCache.timestamp < CACHE_DURATION) {
    return matchesCache.data;
  }

  const response = await fetch(`${API_URL}?title=age2&profile_ids=['4764337']`, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'aoe2-site'
    },
    mode: 'cors'
  });
  if (!response.ok) {
    throw new Error('Failed to fetch matches');
  }
  const data = await response.json();
  const mapMap = await getMapMap();
  const civMap = await getCivMap();

  const matches = data.matchHistoryStats.map((match: any) => {
    // Create a map of profile IDs to aliases
    const profileMap = new Map(
      data.profiles.map((profile: any) => [profile.profile_id.toString(), profile.alias])
    );

    // Find winning team from resulttype
    const winningTeamId = match.matchhistoryreportresults.find((r: any) => r.resulttype === 1)?.teamid;
    // Add 1 to convert from 0-based to 1-based team numbers
    const winningTeam = winningTeamId !== undefined ? winningTeamId + 1 : undefined;

    // Decode slotinfo for diplomacy info
    const slotInfo = decodeSlotInfo(match.slotinfo);

    // Group players by team
    const teams = match.matchhistoryreportresults.reduce((acc: any[], result: any) => {
      const teamIndex = result.teamid;
      if (!acc[teamIndex]) acc[teamIndex] = [];
      acc[teamIndex].push({
        name: profileMap.get(result.profile_id.toString()) || result.profile_id.toString(),
        civ: civMap[result.civilization_id] || result.civilization_id || 0,
        number: result.teamid + 1,
        color_id: (() => {
          const profileId = parseInt(result.profile_id);
          const playerSlot = slotInfo?.find(p => p['profileInfo.id'] === profileId);
          const stationId = playerSlot?.stationID || 0;
          return stationId > 0 ? stationId - 1 : 0;
        })(),
        user_id: result.profile_id,
        winner: result.resulttype === 1,
        rate_snapshot: 0
      });
      return acc;
    }, []);

    // Ensure we have all teams (even empty ones)
    const maxTeamId = Math.max(...match.matchhistoryreportresults.map((r: any) => r.teamid));
    for (let i = 0; i <= maxTeamId; i++) {
      if (!teams[i]) teams[i] = [];
    }

    // Decode options to get map ID and resolve map name
    const options = decodeOptions(match.options);
    const mapId = options['10'];
    const mapName = mapId ? mapMap[mapId] : match.mapname;

    const matchObject = {
      match_id: match.id.toString(),
      start_time: new Date(match.startgametime * 1000).toISOString(),
      diplomacy: {
        type: match.description || 'Unknown',
        team_size: match.maxplayers.toString(),
        slot_info: slotInfo
      },
      map: mapName,
      options: match.options,
      duration: match.completiontime - match.startgametime,
      teams: teams,
      players: match.matchhistoryreportresults.map((result: any) => {
        const profileId = parseInt(result.profile_id);
        const playerSlot = slotInfo?.find(p => p['profileInfo.id'] === profileId);
        const stationId = playerSlot?.stationID || 0;
        const colorId = stationId > 0 ? stationId - 1 : 0;
        return {
          name: profileMap.get(result.profile_id.toString()) || result.profile_id.toString(),
          civ: civMap[result.civilization_id] || result.civilization_id || 0,
          number: result.teamid + 1,
          color_id: colorId,
          user_id: result.profile_id,
          winner: result.resulttype === 1,
          rate_snapshot: 0
        };
      }),
      winning_team: winningTeam
    };

    return matchObject;
  });
  const sortedMatches = matches.sort((a: any, b: any) => b.start_time.localeCompare(a.start_time));
  matchesCache = { data: sortedMatches, timestamp: now };
  return sortedMatches;
}

export async function getMatch(id: string): Promise<Match> {
  const response = await fetch(`${BASE_URL}/data/matches/${id}.json`);
  if (!response.ok) {
    throw new Error('Failed to fetch match');
  }
  const match = await response.json();
  // Add APM chart links
  match.apmCharts = match.players.map((player: any) => ({
    player: typeof player === 'string' ? player : player.name,
    url: `${BASE_URL}/site/matches/${id}/${(typeof player === 'string' ? player : player.name).replace('/', '_')}/${id}_${(typeof player === 'string' ? player : player.name).replace('/', '_')}.html`,
  }));
  return match;
}
