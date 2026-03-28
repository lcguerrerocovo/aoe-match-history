import type { LiveMatch } from '../types/liveMatch';

const API_URL = import.meta.env.VITE_AOE_API_URL!;
const FETCH_TIMEOUT_MS = 15_000;

let abortController: AbortController | null = null;

export async function getLiveMatches(): Promise<LiveMatch[]> {
  // Cancel any in-flight request before starting a new one
  if (abortController) abortController.abort();
  const controller = new AbortController();
  abortController = controller;
  const signal = controller.signal;

  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}/live`, {
      headers: { 'Accept': 'application/json' },
      signal,
    });
    if (!response.ok) {
      throw new Error('Failed to fetch live matches');
    }
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response format');
    }
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getLiveMatchForPlayer(profileId: number): Promise<LiveMatch | null> {
  try {
    const response = await fetch(`${API_URL}/live?profile_ids=${profileId}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) return null;
    const matches: LiveMatch[] = await response.json();
    return matches.length > 0 ? matches[0] : null;
  } catch {
    return null;
  }
}
