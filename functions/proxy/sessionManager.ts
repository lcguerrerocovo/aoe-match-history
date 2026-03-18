import { Firestore, FieldValue } from '@google-cloud/firestore';
import { logger } from './config';
import type { SessionData, AuthResult } from './types';

class SessionManager {
    private db: Firestore;
    private collection: string;
    private docId: string;
    private log: ReturnType<typeof logger.child>;

    constructor() {
        this.db = new Firestore();
        this.collection = 'relic_sessions';
        this.docId = 'current_session';
        this.log = logger.child({ module: 'SessionManager' });
    }

    async getSession(): Promise<SessionData | null> {
        try {
            const doc = await this.db.collection(this.collection).doc(this.docId).get();

            if (!doc.exists) {
                this.log.debug('No session found in Firestore');
                return null;
            }

            const data = doc.data()!;
            const now = Date.now();

            // Check if session is expired
            if (data.expiry && data.expiry < now) {
                this.log.info('Session expired, removing from Firestore');
                await this.clearSession();
                return null;
            }

            const minutesUntilExpiry = Math.round((data.expiry - now) / 1000 / 60);
            this.log.debug({ minutesUntilExpiry }, 'Retrieved valid session');

            return {
                sessionId: data.sessionId,
                steamId64: data.steamId64,
                steamUserName: data.steamUserName,
                base64Ticket: data.base64Ticket,
                expiry: data.expiry,
                callNumber: data.callNumber || 0,
                lastCallTime: data.lastCallTime || null
            };
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

            return session;
        } catch (error) {
            this.log.error({ error: (error as Error).message }, 'Error saving session to Firestore');
            throw error;
        }
    }

    async updateLastCallTime(newTime: number): Promise<void> {
        try {
            await this.db.collection(this.collection).doc(this.docId).update({
                lastCallTime: newTime
            });
            this.log.debug({ lastCallTime: newTime }, 'Updated lastCallTime');
        } catch (error) {
            this.log.error({ error: (error as Error).message }, 'Error updating lastCallTime in Firestore');
        }
    }

    async incrementCallNumber(): Promise<number> {
        try {
            await this.db.collection(this.collection).doc(this.docId).update({
                callNumber: FieldValue.increment(1)
            });

            // Get the updated document to return the new call number
            const doc = await this.db.collection(this.collection).doc(this.docId).get();
            const data = doc.data()!;

            this.log.debug({ callNumber: data.callNumber }, 'Incremented call number');
            return data.callNumber;
        } catch (error) {
            this.log.error({ error: (error as Error).message }, 'Error incrementing call number');
            // Fallback: get current session and manually increment
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
