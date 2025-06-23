const SteamUser = require('steam-user');
const axios = require('axios');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  } : undefined
});

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
        this.log = logger.child({ module: 'RelicAuth' });
    }

    async authenticate(steamUsername, steamPassword, existingTicket = null, existingSteamData = null) {
        const authStartTime = Date.now();
        try {
            if (existingTicket && existingSteamData) {
                this.log.info('Attempting re-authentication with existing ticket...');
                
                const relicStartTime = Date.now();
                const sessionId = await this._relicPlatformLogin(existingSteamData, existingTicket);
                const relicEndTime = Date.now();
                this.log.debug({ duration: relicEndTime - relicStartTime }, 'Relic platform login with existing ticket completed');
                
                this.sessionId = sessionId;
                this.lastAuthTime = Date.now();
                
                const totalAuthTime = Date.now() - authStartTime;
                this.log.info({ totalAuthTime }, 'Total re-authentication completed');
                
                return { sessionId, steamId64: existingSteamData.steamId64, steamUserName: existingSteamData.steamUserName, base64Ticket: existingTicket };
            }
            
            this.log.info('Starting full authentication process...');
            
            const steamStartTime = Date.now();
            const steamData = await this._steamLogin(steamUsername, steamPassword);
            const steamEndTime = Date.now();
            this.log.debug({ duration: steamEndTime - steamStartTime }, 'Steam login completed');
            
            const ticketStartTime = Date.now();
            const base64Ticket = await this._getEncryptedAppTicket();
            const ticketEndTime = Date.now();
            this.log.debug({ duration: ticketEndTime - ticketStartTime }, 'Getting encrypted app ticket completed');
            
            const relicStartTime = Date.now();
            const sessionId = await this._relicPlatformLogin(steamData, base64Ticket);
            const relicEndTime = Date.now();
            this.log.debug({ duration: relicEndTime - relicStartTime }, 'Relic platform login completed');
            
            this.sessionId = sessionId;
            this.lastAuthTime = Date.now();
            
            const totalAuthTime = Date.now() - authStartTime;
            this.log.info({ totalAuthTime }, 'Total authentication completed');
            
            return { sessionId, steamId64: steamData.steamId64, steamUserName: steamData.steamUserName, base64Ticket };
        } catch (error) {
            this.log.error({ error: error.message, duration: Date.now() - authStartTime }, 'Authentication failed');
            throw error;
        }
    }

    async _steamLogin(username, password) {
        return new Promise((resolve, reject) => {
            this.client.logOn({
                accountName: username,
                password: password
            });

            this.client.on('loggedOn', () => {
                this.log.info('Successfully logged into Steam.');
                const steamId64 = this.client.steamID.getSteamID64();
                const steamUserName = this.client.accountInfo?.name || username;
                resolve({ steamId64, steamUserName });
            });

            this.client.on('webSession', () => {
                this.log.info('Web session established.');
            });

            this.client.on('steamGuard', (domain, callback, lastCodeWrong) => {
                this.log.info({ domain }, 'Steam Guard code needed');
                // For now, we'll just reject - in a real implementation you'd need to handle 2FA
                reject(new Error('Steam Guard required but not implemented'));
            });

            this.client.on('error', (err) => {
                this.log.error({ error: err.message }, 'Steam login error');
                reject(err);
            });
        });
    }

    async _getEncryptedAppTicket() {
        return new Promise((resolve, reject) => {
            this.client.getEncryptedAppTicket(APP_ID, Buffer.from("RLINK"), (err, ticket) => {
                if (err) {
                    this.log.error({ error: err.message }, 'Failed to get encrypted app ticket');
                    reject(err);
                    return;
                }
                const base64Ticket = ticket.toString('base64');
                this.log.info('Generated Encrypted App Ticket');
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
                timeout: 30000
            }
        );

        if (response.status === 200 && response.data && response.data[0] === 0) {
            this.log.info('Relic Link Platform Login successful');
            return response.data[1]; // sessionId is typically in index 1
        } else {
            throw new Error(`Relic login failed: ${response.data ? response.data[0] : response.status}`);
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