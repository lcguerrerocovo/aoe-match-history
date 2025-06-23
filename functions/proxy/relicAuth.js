const SteamUser = require('steam-user');
const axios = require('axios');

const APP_ID = 813780; // AoE 2 AppID
const GAME_TITLE = "age2";
const RELIC_API_HOST = "https://aoe-api.worldsedgelink.com/";
const RELIC_LOGIN_ENDPOINT = "game/login/platformlogin";

const RELIC_LOGIN_DEFAULTS = {
    "accountType": "STEAM",
    "activeMatchId": "-1",
    "callNum": "0",
    "clientLibVersion": "169",
    "connect_id": "",
    "country": "US",
    "installationType": "windows",
    "language": "en",
    "lastCallTime": "33072262",
    "macAddress": "57-4F-4C-4F-4C-4F",
    "majorVersion": "4.0.0",
    "minorVersion": "0",
    "startGameToken": "",
    "syncHash": "[3705476802, 2905248376]",
    "timeoutOverride": "0",
};

class RelicAuthClient {
    constructor() {
        this.client = new SteamUser();
        this.sessionId = null;
        this.lastAuthTime = null;
        this.authExpiry = 30 * 60 * 1000; // 30 minutes in milliseconds
    }

    async authenticate(steamUsername, steamPassword) {
        try {
            console.log('Logging into Steam...');
            
            // Steam login
            const steamData = await this._steamLogin(steamUsername, steamPassword);
            
            // Get encrypted app ticket
            const base64Ticket = await this._getEncryptedAppTicket();
            
            // Relic platform login
            const sessionId = await this._relicPlatformLogin(steamData, base64Ticket);
            
            this.sessionId = sessionId;
            this.lastAuthTime = Date.now();
            
            return {
                sessionId,
                steamId64: steamData.steamId64,
                steamUserName: steamData.steamUserName
            };
        } catch (error) {
            console.error('Authentication failed:', error);
            throw error;
        } finally {
            this.client.logOff();
        }
    }

    async _steamLogin(username, password) {
        return new Promise((resolve, reject) => {
            this.client.logOn({
                accountName: username,
                password: password
            });

            this.client.once('loggedOn', () => {
                console.log('Successfully logged into Steam.');
                
                if (!this.client.steamID) {
                    reject(new Error("SteamID not available after login."));
                    return;
                }

                const steamId64 = this.client.steamID.getSteamID64();
                let steamUserName = username;
                
                if (this.client.accountInfo && this.client.accountInfo.accountName) {
                    steamUserName = this.client.accountInfo.accountName;
                } else if (this.client.user && this.client.user.name) {
                    steamUserName = this.client.user.name;
                }

                console.log(`Logged in as: ${steamUserName} (SteamID64: ${steamId64})`);
                resolve({ steamId64, steamUserName });
            });

            this.client.once('webSession', () => {
                console.log('Web session established.');
            });

            this.client.once('steamGuard', (domain, callback) => {
                console.log(`Steam Guard code needed from ${domain || 'email/mobile app'}`);
                // For now, we'll need to handle this differently in a serverless context
                reject(new Error("Steam Guard required - not supported in serverless environment"));
            });

            this.client.once('error', (err) => {
                console.error('Steam login error:', err.message);
                reject(new Error(`Steam login failed: ${err.message}`));
            });
        });
    }

    async _getEncryptedAppTicket() {
        return new Promise((resolve, reject) => {
            this.client.getEncryptedAppTicket(APP_ID, Buffer.from("RLINK"), (err, ticket) => {
                if (err) {
                    reject(err);
                    return;
                }
                const base64Ticket = ticket.toString('base64');
                console.log('Generated Encrypted App Ticket');
                resolve(base64Ticket);
            });
        });
    }

    async _relicPlatformLogin(steamData, base64Ticket) {
        const loginData = {
            ...RELIC_LOGIN_DEFAULTS,
            "alias": steamData.steamUserName,
            "appID": String(APP_ID),
            "auth": base64Ticket,
            "platformUserID": String(steamData.steamId64),
            "title": GAME_TITLE,
        };

        const response = await axios.post(
            RELIC_API_HOST + RELIC_LOGIN_ENDPOINT,
            new URLSearchParams(loginData).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Accept-Encoding': 'identity',
                    'Accept': '*/*',
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-store',
                },
            }
        );

        const responseData = response.data;

        if (response.status === 200 && responseData[0] === 0) {
            const sessionId = responseData[1];
            console.log('Relic Link Platform Login successful');
            return sessionId;
        } else {
            throw new Error(`Relic login failed: ${JSON.stringify(responseData)}`);
        }
    }

    isSessionValid() {
        if (!this.sessionId || !this.lastAuthTime) {
            return false;
        }
        return (Date.now() - this.lastAuthTime) < this.authExpiry;
    }

    getSessionId() {
        if (!this.isSessionValid()) {
            throw new Error('Session expired or not authenticated');
        }
        return this.sessionId;
    }
}

module.exports = RelicAuthClient; 