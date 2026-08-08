import { getFirestoreClient, logger } from './config';
import type { HandlerResponse } from './types';

const log = logger.child({ module: 'PlayerInfo' });

// Cached, no-Relic player header lookup. Used to render the profile header
// instantly while the slow Relic personal-stats call is still in flight.
// Returns whatever the indexing pipeline last wrote to Firestore `players`.
// Falls back to "not found" (the UI then waits for personal-stats).
export async function handlePlayerInfo(profileId: string): Promise<HandlerResponse<unknown>> {
    const pid = Number(profileId);
    if (!Number.isFinite(pid) || pid <= 0) {
        return { data: { id: profileId, found: false }, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' } };
    }

    try {
        const db = getFirestoreClient();
        // players docs are not keyed by profile_id (the doc id is opaque), so
        // look up by the profile_id field. limit(1) — profile_id is unique.
        const snap = await db.collection('players')
            .where('profile_id', '==', pid)
            .limit(1)
            .get();

        if (snap.empty) {
            return { data: { id: profileId, found: false }, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' } };
        }

        const d = snap.docs[0].data() as {
            profile_id?: number;
            alias?: string;
            name?: string;
            country?: string;
            clanlist_name?: string;
        };

        return {
            data: {
                id: String(pid),
                found: true,
                name: d.alias || d.name || '',
                country: d.country || '',
                clanlist_name: d.clanlist_name || '',
            },
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
        };
    } catch (error) {
        // Never let the cached-header lookup break the profile page; the UI
        // falls back to personal-stats if this is empty/erroring.
        log.warn({ error: (error as Error).message, profileId }, 'playerInfo lookup failed');
        return { data: { id: profileId, found: false }, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' } };
    }
}
