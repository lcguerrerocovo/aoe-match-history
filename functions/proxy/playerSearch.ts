import { log, MEILISEARCH_URL, MEILISEARCH_API_KEY } from './config';
import type { Firestore } from '@google-cloud/firestore';
import type { HandlerResponse, PlayerSearchResult } from './types';

export function cleanForSearch(text: string): string {
  if (!text || typeof text !== 'string') return '';
  // Remove all non-alphanumeric characters, convert to lowercase (same as upload script)
  return text.replace(/[^\w]/g, '').toLowerCase();
}

export async function searchMeilisearch(query: string, limit: number = 20): Promise<PlayerSearchResult[]> {
  const cleanQuery = cleanForSearch(query);
  if (!cleanQuery) return [];

  try {
    const meilisearchUrl = `${MEILISEARCH_URL.replace(/\/$/, '')}/indexes/players/search`;
    log.info({ query: cleanQuery, limit, meilisearchUrl }, 'Meilisearch search');

    const response = await fetch(meilisearchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MEILISEARCH_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: cleanQuery,
        limit: limit,
        sort: ['total_matches:desc', 'last_match_date:desc']
      })
    });

    if (!response.ok) {
      throw new Error(`Meilisearch request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json() as { hits: Array<{ profile_id: number; alias?: string; name?: string; country?: string; total_matches?: number; last_match_date?: string; clanlist_name?: string }> };

    // Transform Meilisearch results to match expected format
    const results: PlayerSearchResult[] = result.hits.map(hit => ({
      id: hit.profile_id.toString(),
      name: hit.alias || hit.name || '',
      country: hit.country || '',
      matches: hit.total_matches || 0,
      lastMatchDate: hit.last_match_date,
      profile_id: hit.profile_id,
      clanlist_name: hit.clanlist_name || ''
    }));

    log.info({ query: cleanQuery, resultCount: results.length }, 'Meilisearch search completed');
    return results;

  } catch (error) {
    log.error({ error: (error as Error).message, query: cleanQuery }, 'Error in Meilisearch search');
    return [];
  }
}

export async function searchFirestore(db: Firestore, query: string, limit: number = 20): Promise<PlayerSearchResult[]> {
  const cleanQuery = cleanForSearch(query);
  if (!cleanQuery) return [];

  try {
    const resultMap = new Map<number, PlayerSearchResult>(); // Use Map to deduplicate by profile_id

    // 1. Prefix search on name_no_special (handles full names like "nttornasol")
    log.info({
      query: `collection('players').where('name_no_special', '>=', '${cleanQuery}').where('name_no_special', '<', '${cleanQuery}\uf8ff').orderBy('name_no_special').orderBy('total_matches', 'desc').limit(${limit})`,
      operation: 'prefix_search'
    }, 'Firestore query');

    const prefixSnapshot = await db.collection('players')
      .where('name_no_special', '>=', cleanQuery)
      .where('name_no_special', '<', cleanQuery + '\uf8ff')
      .orderBy('name_no_special')
      .orderBy('total_matches', 'desc')
      .limit(limit)
      .get();

    prefixSnapshot.forEach(doc => {
      const data = doc.data();
      resultMap.set(data.profile_id, {
        id: data.profile_id.toString(),
        name: data.name,
        country: data.country || '',
        matches: data.total_matches || 0,
        lastMatchDate: data.last_match_date,
        profile_id: data.profile_id
      });
    });

    // 2. Token search - search for user query as a token (handles "tornasol" finding "<NT>.tornasol")
    if (cleanQuery.length >= 3) { // Only search meaningful tokens (3+ chars to avoid noise)
      try {
        log.info({
          query: `collection('players').where('name_tokens', 'array-contains', '${cleanQuery}').orderBy('total_matches', 'desc').limit(${limit})`,
          operation: 'token_search'
        }, 'Firestore query');

        const tokenSnapshot = await db.collection('players')
          .where('name_tokens', 'array-contains', cleanQuery)
          .orderBy('total_matches', 'desc')
          .limit(limit)
          .get();

        tokenSnapshot.forEach(doc => {
          const data = doc.data();
          // Add to results if not already present
          if (!resultMap.has(data.profile_id)) {
            resultMap.set(data.profile_id, {
              id: data.profile_id.toString(),
              name: data.name,
              country: data.country || '',
              matches: data.total_matches || 0,
              lastMatchDate: data.last_match_date,
              profile_id: data.profile_id
            });
          }
        });
      } catch (tokenError) {
        // Log but don't fail entire search if token search fails
        log.error({ error: (tokenError as Error).message, token: cleanQuery }, 'Token search failed');
      }
    }

    // Convert Map to array and sort by match count
    const results = Array.from(resultMap.values());
    results.sort((a, b) => b.matches - a.matches);

    return results.slice(0, limit);

  } catch (error) {
    log.error({ error: (error as Error).message, query }, 'Error in Firestore search');
    return [];
  }
}

export async function handlePlayerSearch(name: string): Promise<HandlerResponse<PlayerSearchResult[]>> {
  try {
    const cleanName = cleanForSearch(name);

    // Validate input
    if (!cleanName) {
      return {
        data: [],
        headers: {
          'Cache-Control': 'public, max-age=300', // 5 minutes for empty queries
          'Vary': 'Accept-Encoding'
        }
      };
    }

    // Too short - suggest typing more
    if (cleanName.length < 2) {
      return {
        data: [],
        headers: {
          'Cache-Control': 'public, max-age=300',
          'Vary': 'Accept-Encoding'
        }
      };
    }

    // Use Meilisearch for fast, typo-tolerant search
    const results = await searchMeilisearch(cleanName, 100);
    log.info({ query: name, cleanQuery: cleanName, resultCount: results.length }, 'Player search completed');

    return {
      data: results,
      headers: {
        'Cache-Control': 'public, max-age=1800', // 30 minutes for search results
        'Vary': 'Accept-Encoding'
      }
    };
  } catch (error) {
    log.error({ error: (error as Error).message, name }, 'Player search error');
    throw error;
  }
}
