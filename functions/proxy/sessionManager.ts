import { Firestore } from '@google-cloud/firestore';
import { logger } from './config';
import type { SessionData, AuthResult } from './types';

class SessionManager {
    private db: Firestore;
    private collection: string;
    private docId: string;
    private log: ReturnType<typeof logger.child>;
    private memSession: SessionData | null = null;
    private memSessionTime = 0;
    private static readonly MEM_TTL_MS = 10_000; // 10s in-memory cache

    constructor() {
        this.db = new Firestore();
        this.collection = 'relic_sessions';
        this.docId = 'current_session';
        this.log = logger.child({ module: 'SessionManager' });
    }

    async getSession(): Promise<SessionData | null> {
        // Return in-memory cached session if fresh
        if (this.memSession && Date.now() - this.memSessionTime < SessionManager.MEM_TTL_MS) {
            const now = Date.now();
            if (this.memSession.expiry && this.memSession.expiry < now) {
                this.memSession = null;
                await this.clearSession();
                return null;
            }
            return { ...this.memSession };
        }

        try {
            const doc = await this.db.collection(this.collection).doc(this.docId).get();

            if (!doc.exists) {
                this.log.debug('No session found in Firestore');
                this.memSession = null;
                return null;
            }

            const data = doc.data()!;
            const now = Date.now();

            // Check if session is expired
            if (data.expiry && data.expiry < now) {
                this.log.info('Session expired, removing from Firestore');
                this.memSession = null;
                await this.clearSession();
                return null;
            }

            const minutesUntilExpiry = Math.round((data.expiry - now) / 1000 / 60);
            this.log.debug({ minutesUntilExpiry }, 'Retrieved valid session');

            const session: SessionData = {
                sessionId: data.sessionId,
                steamId64: data.steamId64,
                steamUserName: data.steamUserName,
                base64Ticket: data.base64Ticket,
                expiry: data.expiry,
                callNumber: data.callNumber || 0,
                lastCallTime: data.lastCallTime || null
            };

            this.memSession = session;
            this.memSessionTime = Date.now();
            return { ...session };
        } catch (error) {
            this.log.error({ error: (error as Error).message }, 'Error getting session from Firestore');
            return null;
        }
    }

    async saveSession(sessionData: AuthResult): Promise<SessionData> {
        try {
            const session: SessionData = {
                sessionId: sessionData.sessionId,
                steamId64: sessionData.steamId64,
                steamUserName: sessionData.steamUserName,
                base64Ticket: sessionData.base64Ticket,
                expiry: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
                callNumber: 0, // Start at 0, first API call will be 1
                createdAt: Date.now(),
                lastCallTime: Date.now()
            };

            await this.db.collection(this.collection).doc(this.docId).set(session);
            this.log.info('Session saved to Firestore with call number starting at 0');

            this.memSession = session;
            this.memSessionTime = Date.now();
            return session;
        } catch (error) {
            this.log.error({ error: (error as Error).message }, 'Error saving session to Firestore');
            throw error;
        }
    }

    async updateLastCallTime(newTime: number): Promise<void> {
        if (this.memSession) {
            this.memSession.lastCallTime = newTime;
        }
        // Non-blocking Firestore sync
        this.db.collection(this.collection).doc(this.docId).update({
            lastCallTime: newTime
        }).catch(err => this.log.warn({ error: (err as Error).message }, 'Background lastCallTime sync failed'));
    }

    async incrementCallNumber(): Promise<number> {
        try {
            const ref = this.db.collection(this.collection).doc(this.docId);

            // Reserve a unique, strictly-increasing callNumber via a Firestore
            // transaction that returns the exact value reserved. The previous
            // implementation returned a local in-memory counter
            // (memSession.callNumber++), which is unsafe across multiple Cloud
            // Run instances: two instances sharing a cached base value both
            // returned the same number and sent a duplicate callNum to Relic,
            // causing the recurring 401s (issue #37). The transaction
            // reads-then-writes the actual document value, so every caller
            // across every instance gets the exact number it reserved.
            // (Concurrent transactions on this doc are serialized by Firestore,
            // with automatic retries on contention.)
            const newCallNumber = await this.db.runTransaction(async (transaction) => {
                const doc = await transaction.get(ref);
                const current = (doc.data()?.callNumber as number) ?? 0;
                const next = current + 1;
                // Use set+merge (not update) so a missing document — cleared by
                // handleAuthFailure()/clearSession() on another instance while
                // this instance's 10s in-memory session cache still holds a
                // stale entry — does NOT throw NOT_FOUND. The subsequent Relic
                // call then 401s on the stale sessionId and self-corrects via
                // the existing auth-retry path (handleApiError → clearSession →
                // ensureAuthenticated → saveSession overwrites this write).
                transaction.set(ref, { callNumber: next }, { merge: true });
                return next;
            });

            // Keep the in-memory cache roughly in sync (best-effort; the
            // transaction result is the source of truth, not this cached value).
            if (this.memSession) {
                this.memSession.callNumber = newCallNumber;
            }

            this.log.debug({ callNumber: newCallNumber }, 'Incremented call number');
            return newCallNumber;
        } catch (error) {
            this.log.error({ error: (error as Error).message }, 'Error incrementing call number');
            throw error;
        }
    }

    async clearSession(): Promise<void> {
        this.memSession = null;
        try {
            await this.db.collection(this.collection).doc(this.docId).delete();
            this.log.info('Session cleared from Firestore');
        } catch (error) {
            this.log.error({ error: (error as Error).message }, 'Error clearing session from Firestore');
        }
    }

    async isSessionValid(): Promise<boolean> {
        const session = await this.getSession();
        return session !== null;
    }

    // Method to handle auth failures - clear session so next call will re-authenticate
    async handleAuthFailure(): Promise<void> {
        this.log.warn('Auth failure detected, clearing session for re-authentication');
        await this.clearSession();
    }
}

export = SessionManager;
