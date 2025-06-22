import type { Match, Player } from '../types/match';
import type { PersonalStats } from '../types/stats';
import { decodeOptions } from '../utils/optionsDecoder';
import { decodeSlotInfo } from '../utils/slotInfoDecoder';

const API_URL = import.meta.env.VITE_AOE_API_URL!;
const DEFAULT_PROFILE_ID = '4764337';

let civMap: Record<string, string> | null = null;
let mapMap: Record<string, string> | null = null;

export function matchTypeIdToLeaderboardId(matchTypeId: number) {
  switch (matchTypeId) {
      case 0: return "Unranked";
      case 2: return "DM 1v1";
      case 3:
      case 4:
      case 5: return "DM Team";
      case 6: return "RM 1v1";
      case 7:
      case 8:
      case 9: return "RM Team";
      case 10: return "Battle Royale";
      case 11: return "Quick Match EW";
      case 12: return "Quick Match EW Team";
      case 13: return "Quick Match EW Team";
      case 14: return "Quick Match EW Team";
      case 18: return "Quick Match RM";
      case 19: return "Quick Match RM Team";
      case 20: return "Quick Match RM Team";
      case 21: return "Quick Match RM Team";
      case 25: return "Quick Match BR FFA";
      case 26: return "EW 1v1";
      case 27:
      case 28:
      case 29: return "EW Team";
  }
  return null;
}

const getGameType = (gameMode: number): string | null => {
  return matchTypeIdToLeaderboardId(gameMode);
};

interface RlMappings {
  civs: {
    aoe2: Record<string, Record<string, number>>;
  };
  maps: {
    aoe2: Record<string, Record<string, number>>;
  };
}

let rlMappings: RlMappings | null = null;

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

interface MatchData {
  id: string;
  name: string;
  matches: any[];
}

export async function getMatches(profileId: string = DEFAULT_PROFILE_ID): Promise<MatchData> {
  const response = await fetch(`${API_URL}/match-history/${profileId}`, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'aoe2-site'
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch matches');
  }
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Invalid response format');
  }
  const data = await response.json();
  const mapMap = await getMapMap();
  const civMap = await getCivMap();

  // Get profile info
  const profile = data.profiles.find((p: any) => p.profile_id.toString() === profileId);
  const profileInfo = {
    id: profileId,
    name: profile?.alias || profileId
  };

  const matches = data.matchHistoryStats.map((match: any) => {
    // Create a map of profile IDs to aliases
    const profileMap = new Map(
      data.profiles.map((profile: any) => [profile.profile_id.toString(), profile.alias])
    );

    const ratingMap = new Map<number, { oldRating: number, newRating: number }>(
      (match.matchhistorymember || []).map((member: any) => [
        member.profile_id,
        { oldRating: member.oldrating, newRating: member.newrating },
      ])
    );

    // Decode slotinfo for diplomacy info
    const slotInfo = decodeSlotInfo(match.slotinfo);

    const players: Player[] = match.matchhistoryreportresults.map((result: any) => {
      const profileId = parseInt(result.profile_id);
      const playerSlot = slotInfo?.find(p => p['profileInfo.id'] === profileId);
     
      let teamId = playerSlot?.metaData?.teamId ? playerSlot?.metaData?.teamId : result.teamid + 1
      teamId = parseInt(teamId);

      // figure out proper mapping for civ id from slot info before switching to this
      // const civId = playerSlot?.metaData?.civId ?? result.civilization_id;
      const civId = result.civilization_id;

      const colorId = playerSlot?.metaData?.colorId ?? 0;
      
      const ratingInfo = ratingMap.get(result.profile_id);

      return {
        name: profileMap.get(result.profile_id.toString()) || result.profile_id.toString(),
        civ: civMap[civId] || civId || 0,
        number: teamId,
        team_id: result.teamid,
        color_id: colorId,
        user_id: result.profile_id,
        winner: result.resulttype === 1,
        rating: ratingInfo?.newRating ?? null,
        rating_change: ratingInfo ? ratingInfo.newRating - ratingInfo.oldRating : null,
      };
    });

    const allSameTeam = players.length > 0 && players.every(p => p.number === players[0].number);

    // Group players by team
    const teams: Player[][] = players.reduce((acc: Player[][], player) => {
      // player.number is 1-based, so subtract 1 for a 0-based index.
      const key = allSameTeam ? player.color_id : (player.number + 1);

      const teamIndex = key;
      if (teamIndex >= 0) {
        if (!acc[teamIndex]) {
          acc[teamIndex] = [];
        }
        acc[teamIndex].push(player);
      }
      return acc;
    }, []);

    // Filter out empty teams that can result from non-sequential team numbers
    const finalTeams = teams.filter(team => team && team.length > 0);

    // Now, derive the winning teams from the final, cleaned teams array.
    const winningTeams = finalTeams
      .map((team, index) => {
        // A team is a winner if any player in it is a winner.
        // The new team number is the sequential, 1-based index of the finalTeams array.
        return team.some(player => player.winner) ? index + 1 : null;
      })
      .filter((teamNumber): teamNumber is number => teamNumber !== null);

    const winningTeam = winningTeams.length > 0 ? winningTeams[0] : undefined;

    // Decode options to get map ID and resolve map name
    const options = decodeOptions(match.options);
    const mapId = options['10'];
    const mapName = mapId ? mapMap[mapId] : match.mapname;

    const matchObject = {
      match_id: match.id.toString(),
      start_time: new Date(match.startgametime * 1000).toISOString(),
      description: match.description === "AUTOMATCH" ? getGameType(match.matchtype_id) : match.description,
      diplomacy: {
        type: getGameType(match.matchtype_id) || 'Unknown',
        team_size: match.maxplayers.toString(),
      },
      map: mapName,
      duration: match.completiontime - match.startgametime,
      teams: finalTeams,
      players: players,
      winning_team: winningTeam,
      winning_teams: winningTeams
    };

    return matchObject;
  });
  const sortedMatches = matches.sort((a: any, b: any) => b.start_time.localeCompare(a.start_time));
  return { ...profileInfo, matches: sortedMatches };
}

export async function getMatch(id: string): Promise<Match> {
  const response = await fetch(`/data/matches/${id}.json`);
  if (!response.ok) {
    throw new Error('Failed to fetch match');
  }
  const match = await response.json();
  // Add APM chart links
  match.apmCharts = match.players.map((player: any) => ({
    player: typeof player === 'string' ? player : player.name,
    url: `/site/matches/${id}/${(typeof player === 'string' ? player : player.name).replace('/', '_')}/${id}_${(typeof player === 'string' ? player : player.name).replace('/', '_')}.html`,
  }));
  return match;
}

export async function getPersonalStats(profileId: string): Promise<PersonalStats> {
  const response = await fetch(`${API_URL}/personal-stats/${profileId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch personal stats: ${response.statusText}`);
  }
  const data = await response.json();
  return data;
}

export function extractSteamId(name: string): string | null {
  const match = name.match(/\/steam\/(\d+)/);
  return match ? match[1] : null;
}

export async function getSteamAvatar(steamId: string): Promise<string | undefined> {
  
  try {
    const response = await fetch(`${API_URL}/steam/avatar/${steamId}`);
    if (!response.ok) {
      console.error('Failed to fetch Steam avatar:', response.status);
      return undefined;
    }
    const data = await response.json();
    return data.avatarUrl;
  } catch (error) {
    console.error('Error fetching Steam avatar:', error);
    return undefined;
  }
}
