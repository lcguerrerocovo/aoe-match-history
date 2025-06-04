import type { Match } from '../types/match';

const BASE_URL = import.meta.env.PROD ? 'https://aoe2.site' : window.location.origin;

let civMap: Record<string, string> | null = null;

export async function getCivMap(): Promise<Record<string, string>> {
  if (civMap) return civMap;

  const response = await fetch(`${BASE_URL}/data/100.json`);
  if (!response.ok) {
    throw new Error('Failed to fetch civ mapping');
  }
  const data = await response.json();
  civMap = {};
  Object.entries(data.civilizations).forEach(([id, civ]: [string, any]) => {
    civMap![id] = civ.name;
  });
  return civMap;
}

export async function getMatches(): Promise<any[]> {
  const response = await fetch(`${BASE_URL}/data/matches/index.json`);
  if (!response.ok) {
    throw new Error('Failed to fetch matches index');
  }
  const indexData = await response.json();
  // Return the summary objects as an array, sorted by start_time descending
  return Object.values(indexData).sort((a: any, b: any) =>
    (b.start_time || '').localeCompare(a.start_time || '')
  );
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
