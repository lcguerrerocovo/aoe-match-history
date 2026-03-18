import SteamUser from 'steam-user';
import { logger } from './config';
import type { AuthResult } from './types';

const APP_ID = 813780; // AoE 2 AppID
const GAME_TITLE = "age2";
const RELIC_API_HOST = "https://aoe-api.worldsedgelink.com/";
const RELIC_LOGIN_ENDPOINT = "game/login/platformlogin";

const RELIC_LOGIN_DEFAULTS: Record<string, string> = {
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

interface SteamData {
    steamId64: string;
    steamUserName: string;
}

class RelicAuthClient {
    private client: SteamUser;
    private sessionId: string | null;
    private lastAuthTime: number | null;
    private authExpiry: number;
    private log: ReturnType<typeof logger.child>;

    constructor() {
        this.client = new SteamUser();
        this.sessionId = null;
        this.lastAuthTime = null;
        this.authExpiry = 30 * 60 * 1000; // 30 minutes in milliseconds
        this.log = logger.child({ module: 'RelicAuth' });
    }

    async authenticate(steamUsername: string, steamPassword: string, existingTicket: string | null = null, existingSteamData: SteamData | null = null): Promise<AuthResult> {
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
            this.log.error({ error: (error as Error).message, duration: Date.now() - authStartTime }, 'Authentication failed');
            throw error;
        }
    }

    async _steamLogin(username: string, password: string): Promise<SteamData> {
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

            this.client.on('steamGuard', (domain: string, callback: (code: string) => void, lastCodeWrong: boolean) => {
                this.log.info({ domain }, 'Steam Guard code needed');
                reject(new Error('Steam Guard required but not implemented'));
            });

            this.client.on('error', (err: Error) => {
                this.log.error({ error: err.message }, 'Steam login error');
                reject(err);
            });
        });
    }

    async _getEncryptedAppTicket(): Promise<string> {
        return new Promise((resolve, reject) => {
            this.client.getEncryptedAppTicket(APP_ID, Buffer.from("RLINK"), (err: Error | null, ticket: Buffer) => {
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

    async _relicPlatformLogin(steamData: SteamData, base64Ticket: string): Promise<string> {
        const loginData: Record<string, string> = {
            ...RELIC_LOGIN_DEFAULTS,
            "alias": steamData.steamUserName,
            "appID": String(APP_ID),
            "auth": base64Ticket,
            "platformUserID": String(steamData.steamId64),
            "title": GAME_TITLE,
        };

        const response = await fetch(RELIC_API_HOST + RELIC_LOGIN_ENDPOINT, {
            method: 'POST',
            body: new URLSearchParams(loginData).toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Accept-Encoding': 'identity',
                'Accept': '*/*',
                'Pragma': 'no-cache',
                'Cache-Control': 'no-store',
            },
            signal: AbortSignal.timeout(30000)
        });

        const data = await response.json() as unknown[];

        if (response.status === 200 && data && data[0] === 0) {
            this.log.info('Relic Link Platform Login successful');
            return data[1] as string; // sessionId is typically in index 1
        } else {
            throw new Error(`Relic login failed: ${data ? data[0] : response.status}`);
        }
    }

    isSessionValid(): boolean {
        if (!this.sessionId || !this.lastAuthTime) {
            return false;
        }
        return (Date.now() - this.lastAuthTime) < this.authExpiry;
    }

    getSessionId(): string {
        if (!this.isSessionValid()) {
            throw new Error('Session expired or not authenticated');
        }
        return this.sessionId!;
    }
}

export = RelicAuthClient;
