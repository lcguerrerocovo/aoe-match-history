import { Firestore, FieldValue } from '@google-cloud/firestore';
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
            // Atomic server-side increment — safe across multiple Cloud Run instances
            await this.db.collection(this.collection).doc(this.docId).update({
                callNumber: FieldValue.increment(1)
            });

            // Update in-memory cache to avoid a Firestore get() round-trip
            if (this.memSession) {
                this.memSession.callNumber++;
                this.log.debug({ callNumber: this.memSession.callNumber }, 'Incremented call number');
                return this.memSession.callNumber;
            }

            // No in-memory cache — must read back from Firestore
            const doc = await this.db.collection(this.collection).doc(this.docId).get();
            const data = doc.data()!;

            this.log.debug({ callNumber: data.callNumber }, 'Incremented call number');
            return data.callNumber;
        } catch (error) {
            this.log.error({ error: (error as Error).message }, 'Error incrementing call number');
            const session = await this.getSession();
            if (session) {
                const newCallNumber = (session.callNumber || 0) + 1;
                await this.db.collection(this.collection).doc(this.docId).update({
                    callNumber: newCallNumber
                });
                return newCallNumber;
            }
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
