import type { Match, Player } from '../types/match';
import type { PersonalStats } from '../types/stats';
import { decodeOptions } from '../utils/optionsDecoder';
import { decodeSlotInfo } from '../utils/slotInfoDecoder';
import { getGameType } from '../utils/gameUtils';
import { getCivMap, getMapMap } from '../utils/mappingUtils';
import { groupPlayersIntoTeams, detectWinningTeams } from '../utils/teamUtils';

const API_URL = import.meta.env.VITE_AOE_API_URL!;
const DEFAULT_PROFILE_ID = '4764337';

interface MatchData {
  id: string;
  name: string;
  matches: any[];
}

// Helper function for processing player data
function processPlayerData(
  result: any,
  playerSlot: any,
  profileMap: Map<string, string>,
  ratingMap: Map<number, { oldRating: number; newRating: number }>,
  civMap: Record<string, string>
): Player {
  const teamId = playerSlot?.metaData?.teamId ? parseInt(playerSlot.metaData.teamId) : result.teamid + 1;
  const civId = result.civilization_id;
  const colorId = playerSlot?.metaData?.colorId ?? 0;
  const ratingInfo = ratingMap.get(result.profile_id);

  return {
    name: profileMap.get(result.profile_id.toString()) || result.profile_id.toString(),
    civ: civMap[civId.toString()] || civId,
    number: teamId,
    color_id: colorId,
    user_id: result.profile_id,
    winner: result.resulttype === 1,
    rating: ratingInfo?.newRating ?? null,
    rating_change: ratingInfo ? ratingInfo.newRating - ratingInfo.oldRating : null,
  };
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
    const profileMap = new Map<string, string>(
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
      
      return processPlayerData(result, playerSlot, profileMap, ratingMap, civMap);
    });

    // Group players into teams and detect winners
    const teams = groupPlayersIntoTeams(players);
    const { winningTeam, winningTeams } = detectWinningTeams(teams);

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
      teams: teams,
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
    throw new Error('Failed to fetch personal stats');
  }
  return response.json();
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
    console.error('Failed to fetch Steam avatar:', error);
    return undefined;
  }
}
