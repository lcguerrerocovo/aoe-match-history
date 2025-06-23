const {Firestore} = require('@google-cloud/firestore');

class SessionManager {
    constructor() {
        this.db = new Firestore();
        this.collection = 'relic_sessions';
        this.docId = 'current_session';
    }

    async getSession() {
        try {
            const doc = await this.db.collection(this.collection).doc(this.docId).get();
            
            if (!doc.exists) {
                return null;
            }

            const data = doc.data();
            const now = Date.now();

            // Check if session is expired
            if (data.expiry && data.expiry < now) {
                console.log('Session expired, removing from Firestore');
                await this.clearSession();
                return null;
            }

            return {
                sessionId: data.sessionId,
                steamId64: data.steamId64,
                steamUserName: data.steamUserName,
                expiry: data.expiry,
                callNumber: data.callNumber || 0
            };
        } catch (error) {
            console.error('Error getting session from Firestore:', error);
            return null;
        }
    }

    async saveSession(sessionData) {
        try {
            const session = {
                sessionId: sessionData.sessionId,
                steamId64: sessionData.steamId64,
                steamUserName: sessionData.steamUserName,
                expiry: Date.now() + (30 * 60 * 1000), // 30 minutes
                callNumber: 1, // Start at 1 for new sessions
                createdAt: Date.now()
            };

            await this.db.collection(this.collection).doc(this.docId).set(session);
            console.log('Session saved to Firestore with call number starting at 1');
            
            return session;
        } catch (error) {
            console.error('Error saving session to Firestore:', error);
            throw error;
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
            
            return data.callNumber;
        } catch (error) {
            console.error('Error incrementing call number:', error);
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
            console.log('Session cleared from Firestore');
        } catch (error) {
            console.error('Error clearing session from Firestore:', error);
        }
    }

    async isSessionValid() {
        const session = await this.getSession();
        return session !== null;
    }

    // Method to handle auth failures - clear session so next call will re-authenticate
    async handleAuthFailure() {
        console.log('Auth failure detected, clearing session for re-authentication');
        await this.clearSession();
    }
}

module.exports = SessionManager; 