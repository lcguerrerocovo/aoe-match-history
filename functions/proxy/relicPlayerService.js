const axios = require('axios');
const SessionManager = require('./sessionManager');
const pino = require('pino');
const { inflateSync } = require('zlib');
const { decodeOptions, doubleBase64Decode, decodeSlotInfo } = require('./decoders');

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

const RELIC_API_HOST = "https://aoe-api.worldsedgelink.com/";

class RelicPlayerService {
    constructor() {
        this.sessionManager = new SessionManager();
        this.log = logger.child({ module: 'RelicPlayerService' });
    }

    async findProfiles(name) {
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

        const findProfilesParams = {
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
            const response = await axios.get(FULL_FIND_PROFILES_URL, {
                params: findProfilesParams,
                headers: {
                    'Accept-Encoding': 'identity',
                    'Accept': '*/*',
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-store',
                },
                timeout: 30000, // 30 second timeout
            });
            const requestEndTime = Date.now();
            const requestDuration = requestEndTime - requestStartTime;

            // Update lastCallTime in session to now
            await this.sessionManager.updateLastCallTime(now);

            const responseData = response.data;
            this.log.info({ 
                status: response.status, 
                apiStatus: responseData[0], 
                duration: requestDuration,
                totalDuration: Date.now() - startTime
            }, 'FindProfiles response received');

            if (response.status === 200 && responseData[0] === 0) {
                const profileCount = responseData[1]?.length || 0;
                this.log.info({ profileCount }, 'Profile search successful');
                
                // Log the complete API response for debugging
                this.log.debug({ 
                    fullResponse: JSON.stringify(responseData, null, 2)
                }, 'Complete API response');
                
                // Transform raw API response into structured player objects
                const processedResults = responseData[1]?.map((playerArray, index) => {
                    // Log first result for debugging
                    if (index === 0) {
                        this.log.debug({ 
                            playerArray: JSON.stringify(playerArray, null, 2)
                        }, 'First player array structure');
                    }
                    
                    // Based on real API response analysis:
                    // Index 1: profile ID (249641)
                    // Index 4: player name ("Viper")  
                    // Index 7: unclear field (1, 6, 0, 21) - not total matches
                    // For now, we'll use 0 for matches until we determine the correct field
                    return {
                        id: playerArray[1], // Profile ID
                        name: playerArray[4], // Player name
                        matches: playerArray[7] // TODO: Determine correct field for match count
                    };
                }) || [];
                
                return {
                    success: true,
                    data: processedResults,
                    fullResponse: responseData
                };
            } else {
                // Handle auth failure - clear session for re-authentication
                if (responseData[0] !== 0) {
                    this.log.warn({ apiError: responseData[0] }, 'Auth failure detected');
                    await this.sessionManager.handleAuthFailure();
                }
                
                return {
                    success: false,
                    error: `API Error: ${responseData[0]}`,
                    fullResponse: responseData,
                    authFailure: responseData[0] !== 0
                };
            }
        } catch (error) {
            this.log.error({ error: error.message }, 'FindProfiles request failed');
            if (axios.isAxiosError(error)) {
                // Check for 401 Unauthorized - session expired
                if (error.response?.status === 401) {
                    this.log.warn('401 Unauthorized detected - session expired');
                    await this.sessionManager.handleAuthFailure();
                }
                
                return {
                    success: false,
                    error: `HTTP Error: ${error.message}`,
                    status: error.response?.status,
                    responseData: error.response?.data,
                    authFailure: error.response?.status === 401
                };
            } else {
                return {
                    success: false,
                    error: `Unexpected Error: ${error.message}`
                };
            }
        }
    }

    /**
     * Fetch recent single–player match history for one or more profile IDs via authenticated endpoint.
     * @param {string[]} profileIds Array of profile IDs as strings.
     */
    async getRecentMatchSinglePlayerHistory(profileIds = []) {
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

        const params = {
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
            const response = await axios.get(FULL_URL, {
                params,
                headers: {
                    'Accept-Encoding': 'identity',
                    'Accept': '*/*',
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-store',
                },
                timeout: 30000,
            });
            const duration = Date.now() - requestStart;

            await this.sessionManager.updateLastCallTime(now);

            const respData = response.data;
            this.log.info({ status: response.status, apiStatus: respData[0], duration }, 'SinglePlayerHistory response');

            if (response.status === 200 && respData[0] === 0) {
                const processed = (respData[1] || []).map(matchArr => {
                    if (!Array.isArray(matchArr) || matchArr.length < 7) return matchArr;
                    // Settings use shared decodeOptions
                    const decodedSettings = decodeOptions(matchArr[5]);

                    // Players JSON is zlib+base64 – use decodeField then parse after the comma
                    const decodedPlayers = decodeSlotInfo(matchArr[6]);

                    if (decodedSettings && typeof decodedSettings.metaData === 'string') {
                        decodedSettings.metaData = doubleBase64Decode(decodedSettings.metaData);
                    }

                    return {
                        match_id: matchArr[0],
                        map_id: matchArr[1],
                        map_name: matchArr[2],
                        match_type: matchArr[3],
                        unknown: matchArr[4],
                        settings: decodedSettings,
                        players: decodedPlayers,
                        name: matchArr[7],
                        start_time: matchArr[8],
                        end_time: matchArr[9]
                    };
                });

                this.log.debug({ processedMatches: processed.length }, 'SinglePlayerHistory processed');

                return {
                    success: true,
                    data: processed,
                    fullResponse: respData
                };
            } else {
                if (respData[0] !== 0) {
                    await this.sessionManager.handleAuthFailure();
                }
                return { success: false, error: `API Error: ${respData[0]}`, fullResponse: respData, authFailure: respData[0] !== 0 };
            }
        } catch (error) {
            this.log.error({ error: error.message }, 'SinglePlayerHistory request failed');
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                await this.sessionManager.handleAuthFailure();
            }
            throw error;
        }
    }
}

module.exports = RelicPlayerService; 