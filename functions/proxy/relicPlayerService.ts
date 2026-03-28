import SessionManager from './sessionManager';
import { logger } from './config';
import { decodeOptions, doubleBase64Decode, decodeSlotInfo } from './decoders';
import type { FindProfilesResult, SinglePlayerHistoryResult, SinglePlayerMatch, DecodedOptions, SlotInfoPlayer, LiveMatchesResult } from './types';

const RELIC_API_HOST = "https://aoe-api.worldsedgelink.com/";

class RelicPlayerService {
    private sessionManager: SessionManager;
    private log: ReturnType<typeof logger.child>;

    constructor() {
        this.sessionManager = new SessionManager();
        this.log = logger.child({ module: 'RelicPlayerService' });
    }

    private async handleApiError(statusCode: number): Promise<{ success: false; error: string; authFailure: boolean }> {
        if (statusCode !== 0) {
            this.log.warn({ apiError: statusCode }, 'Auth failure detected');
            await this.sessionManager.handleAuthFailure();
        }
        return { success: false, error: `API Error: ${statusCode}`, authFailure: statusCode !== 0 };
    }

    async findProfiles(name: string): Promise<FindProfilesResult> {
        const startTime = Date.now();
        const session = await this.sessionManager.getSession();
        if (!session) {
            throw new Error('No valid session available');
        }

        const callNumber = await this.sessionManager.incrementCallNumber();
        this.log.info({
            sessionId: session.sessionId,
            callNumber,
            searchName: name
        }, 'Starting profile search');

        const FIND_PROFILES_ENDPOINT = "game/account/FindProfiles";
        const FULL_FIND_PROFILES_URL = RELIC_API_HOST + FIND_PROFILES_ENDPOINT;

        // Use lastCallTime from session if available, otherwise use now
        const prevLastCallTime = session.lastCallTime || Date.now();
        const now = Date.now();

        const findProfilesParams: Record<string, string> = {
            "callNum": String(callNumber),
            "connect_id": session.sessionId,
            "lastCallTime": String(prevLastCallTime),
            "name": name,
            "sessionID": session.sessionId,
        };

        this.log.debug({
            url: FULL_FIND_PROFILES_URL,
            params: findProfilesParams
        }, 'Making FindProfiles request');

        try {
            const requestStartTime = Date.now();
            const queryString = new URLSearchParams(findProfilesParams).toString();
            const response = await fetch(`${FULL_FIND_PROFILES_URL}?${queryString}`, {
                headers: {
                    'Accept-Encoding': 'identity',
                    'Accept': '*/*',
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-store',
                },
                signal: AbortSignal.timeout(30000),
            });
            const requestEndTime = Date.now();
            const requestDuration = requestEndTime - requestStartTime;

            // Update lastCallTime in session to now
            await this.sessionManager.updateLastCallTime(now);

            if (!response.ok) {
                await response.text();
                if (response.status === 401 || response.status === 403) {
                    return await this.handleApiError(response.status);
                }
                throw new Error(`API responded with status ${response.status}`);
            }
            const responseData = await response.json() as unknown[];
            this.log.info({
                status: response.status,
                apiStatus: responseData[0],
                duration: requestDuration,
                totalDuration: Date.now() - startTime
            }, 'FindProfiles response received');

            if (response.status === 200 && responseData[0] === 0) {
                const responseArray = responseData as [number, unknown[][] | undefined];
                const profileCount = responseArray[1]?.length || 0;
                this.log.info({ profileCount }, 'Profile search successful');

                // Log the complete API response for debugging
                this.log.debug({
                    fullResponse: JSON.stringify(responseData, null, 2)
                }, 'Complete API response');

                // Transform raw API response into structured player objects
                const processedResults = responseArray[1]?.map((playerArray: unknown[], index: number) => {
                    // Log first result for debugging
                    if (index === 0) {
                        this.log.debug({
                            playerArray: JSON.stringify(playerArray, null, 2)
                        }, 'First player array structure');
                    }

                    return {
                        id: playerArray[1] as number, // Profile ID
                        name: playerArray[4] as string, // Player name
                        matches: playerArray[7] as number // Total games played
                    };
                }) || [];

                return {
                    success: true,
                    data: processedResults,
                    fullResponse: responseData
                };
            } else {
                return { ...await this.handleApiError(responseData[0] as number), fullResponse: responseData };
            }
        } catch (error) {
            this.log.error({ error: (error as Error).message }, 'FindProfiles request failed');
            if (error instanceof TypeError || (error as { name?: string }).name === 'AbortError') {
                return {
                    success: false,
                    error: `HTTP Error: ${(error as Error).message}`
                };
            }
            // Check if we got a non-ok response that we need to handle
            return {
                success: false,
                error: `Unexpected Error: ${(error as Error).message}`
            };
        }
    }

    /**
     * Fetch recent single-player match history for one or more profile IDs via authenticated endpoint.
     */
    async getRecentMatchSinglePlayerHistory(profileIds: string[] = []): Promise<SinglePlayerHistoryResult> {
        const startTime = Date.now();
        const session = await this.sessionManager.getSession();
        if (!session) {
            throw new Error('No valid session available');
        }

        const callNumber = await this.sessionManager.incrementCallNumber();
        const prevLastCallTime = session.lastCallTime || Date.now();
        const now = Date.now();

        const ENDPOINT = "game/Leaderboard/getRecentMatchHistory";
        const FULL_URL = RELIC_API_HOST + ENDPOINT;

        // Ensure profileIds is a JSON array string ["id1","id2"]
        const profileIdsParam = JSON.stringify(profileIds.map(id => id.toString()));

        const params: Record<string, string> = {
            callNum: String(callNumber),
            connect_id: session.sessionId,
            lastCallTime: String(prevLastCallTime),
            sessionID: session.sessionId,
            profile_ids: profileIdsParam,
            title: 'age2',
        };

        this.log.debug({ url: FULL_URL, params }, 'Making getRecentMatchHistory request');

        try {
            const requestStart = Date.now();
            const queryString = new URLSearchParams(params).toString();
            const response = await fetch(`${FULL_URL}?${queryString}`, {
                headers: {
                    'Accept-Encoding': 'identity',
                    'Accept': '*/*',
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-store',
                },
                signal: AbortSignal.timeout(30000),
            });
            const duration = Date.now() - requestStart;

            await this.sessionManager.updateLastCallTime(now);

            if (!response.ok) {
                await response.text();
                if (response.status === 401 || response.status === 403) {
                    return await this.handleApiError(response.status);
                }
                throw new Error(`API responded with status ${response.status}`);
            }
            const respData = await response.json() as unknown[];
            this.log.info({ status: response.status, apiStatus: respData[0], duration }, 'SinglePlayerHistory response');

            if (response.status === 200 && respData[0] === 0) {
                const processed: SinglePlayerMatch[] = ((respData[1] || []) as unknown[][]).map((matchArr: unknown[]) => {
                    if (!Array.isArray(matchArr) || matchArr.length < 7) return matchArr as unknown as SinglePlayerMatch;
                    // Settings use shared decodeOptions
                    const decodedSettings = decodeOptions(matchArr[5] as string);

                    // Players JSON is zlib+base64 - use decodeField then parse after the comma
                    const decodedPlayers = decodeSlotInfo(matchArr[6] as string);

                    if (decodedSettings && typeof (decodedSettings as Record<string, unknown>).metaData === 'string') {
                        (decodedSettings as Record<string, unknown>).metaData = doubleBase64Decode((decodedSettings as Record<string, unknown>).metaData as string);
                    }

                    return {
                        match_id: matchArr[0] as number,
                        map_id: matchArr[1] as number,
                        map_name: matchArr[2] as string,
                        match_type: matchArr[3] as number,
                        unknown: matchArr[4],
                        settings: decodedSettings,
                        players: decodedPlayers,
                        name: matchArr[7] as string,
                        start_time: matchArr[8] as number,
                        end_time: matchArr[9] as number
                    };
                });

                this.log.debug({ processedMatches: processed.length }, 'SinglePlayerHistory processed');

                return {
                    success: true,
                    data: processed,
                    fullResponse: respData
                };
            } else {
                return { ...await this.handleApiError(respData[0] as number), fullResponse: respData };
            }
        } catch (error) {
            this.log.error({ error: (error as Error).message }, 'SinglePlayerHistory request failed');
            throw error;
        }
    }
    async findObservableAdvertisements(gameVersion: number, count: number = 50, start: number = 0, profileIds?: number[]): Promise<LiveMatchesResult> {
        const startTime = Date.now();
        const session = await this.sessionManager.getSession();
        if (!session) {
            throw new Error('No valid session available');
        }

        const callNumber = await this.sessionManager.incrementCallNumber();
        const prevLastCallTime = session.lastCallTime || Date.now();
        const now = Date.now();

        const ENDPOINT = 'game/advertisement/findObservableAdvertisements';
        const FULL_URL = RELIC_API_HOST + ENDPOINT;

        const params: Record<string, string> = {
            appBinaryChecksum: String(gameVersion),
            callNum: String(callNumber),
            connect_id: session.sessionId,
            count: String(count),
            dataChecksum: '0',
            desc: '1',
            lastCallTime: String(prevLastCallTime),
            matchType_id: '0',
            modDLLChecksum: '0',
            modDLLFile: 'INVALID',
            modName: 'INVALID',
            modVersion: 'INVALID',
            sessionID: session.sessionId,
            sortOrder: '1',
            start: String(start),
            versionFlags: '56950784',
        };

        if (profileIds && profileIds.length > 0) {
            params.profile_ids = JSON.stringify(profileIds);
        }

        this.log.debug({ url: FULL_URL, gameVersion, count, start, profileIds }, 'Making findObservableAdvertisements request');

        try {
            const requestStart = Date.now();
            const queryString = new URLSearchParams(params).toString();
            const response = await fetch(`${FULL_URL}?${queryString}`, {
                headers: {
                    'Accept-Encoding': 'identity',
                    'Accept': '*/*',
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-store',
                },
                signal: AbortSignal.timeout(30000),
            });
            const duration = Date.now() - requestStart;

            await this.sessionManager.updateLastCallTime(now);

            if (!response.ok) {
                await response.text();
                if (response.status === 401 || response.status === 403) {
                    return await this.handleApiError(response.status);
                }
                throw new Error(`API responded with status ${response.status}`);
            }
            const respData = await response.json() as unknown[];
            this.log.info({
                status: response.status,
                apiStatus: respData[0],
                duration,
                totalDuration: Date.now() - startTime,
            }, 'findObservableAdvertisements response');

            if (response.status === 200 && respData[0] === 0) {
                const matches = (respData[1] || []) as unknown[][];
                const players = (respData[2] || []) as unknown[][];
                this.log.info({ matchCount: matches.length, playerCount: players.length }, 'Observable advertisements fetched');

                // Log first match and player for field mapping discovery
                if (matches.length > 0) {
                    this.log.debug({ firstMatch: JSON.stringify(matches[0]) }, 'First match structure');
                }
                if (players.length > 0) {
                    this.log.debug({ firstPlayer: JSON.stringify(players[0]) }, 'First player structure');
                }

                return {
                    success: true,
                    data: { matches, players },
                };
            } else {
                return await this.handleApiError(respData[0] as number);
            }
        } catch (error) {
            this.log.error({ error: (error as Error).message }, 'findObservableAdvertisements request failed');
            throw error;
        }
    }
}

export = RelicPlayerService;
