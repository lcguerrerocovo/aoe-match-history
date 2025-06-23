const {Firestore} = require('@google-cloud/firestore');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  prettyPrint: process.env.NODE_ENV === 'development'
});

class SessionManager {
    constructor() {
        this.db = new Firestore();
        this.collection = 'relic_sessions';
        this.docId = 'current_session';
        this.log = logger.child({ module: 'SessionManager' });
    }

    async getSession() {
        try {
            const doc = await this.db.collection(this.collection).doc(this.docId).get();
            
            if (!doc.exists) {
                this.log.debug('No session found in Firestore');
                return null;
            }

            const data = doc.data();
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
            this.log.error({ error: error.message }, 'Error getting session from Firestore');
            return null;
        }
    }

    async saveSession(sessionData) {
        try {
            const session = {
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
            this.log.error({ error: error.message }, 'Error saving session to Firestore');
            throw error;
        }
    }

    async updateLastCallTime(newTime) {
        try {
            await this.db.collection(this.collection).doc(this.docId).update({
                lastCallTime: newTime
            });
            this.log.debug({ lastCallTime: newTime }, 'Updated lastCallTime');
        } catch (error) {
            this.log.error({ error: error.message }, 'Error updating lastCallTime in Firestore');
        }
    }

    async incrementCallNumber() {
        try {
            const result = await this.db.collection(this.collection).doc(this.docId).update({
                callNumber: Firestore.FieldValue.increment(1)
            });
            
            // Get the updated document to return the new call number
            const doc = await this.db.collection(this.collection).doc(this.docId).get();
            const data = doc.data();
            
            this.log.debug({ callNumber: data.callNumber }, 'Incremented call number');
            return data.callNumber;
        } catch (error) {
            this.log.error({ error: error.message }, 'Error incrementing call number');
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

    async clearSession() {
        try {
            await this.db.collection(this.collection).doc(this.docId).delete();
            this.log.info('Session cleared from Firestore');
        } catch (error) {
            this.log.error({ error: error.message }, 'Error clearing session from Firestore');
        }
    }

    async isSessionValid() {
        const session = await this.getSession();
        return session !== null;
    }

    // Method to handle auth failures - clear session so next call will re-authenticate
    async handleAuthFailure() {
        this.log.warn('Auth failure detected, clearing session for re-authentication');
        await this.clearSession();
    }
}

module.exports = SessionManager; 