const axios = require('axios');
const SessionManager = require('./sessionManager');

const RELIC_API_HOST = "https://aoe-api.worldsedgelink.com/";

class RelicPlayerService {
    constructor() {
        this.sessionManager = new SessionManager();
    }

    async findProfiles(name) {
        const session = await this.sessionManager.getSession();
        if (!session) {
            throw new Error('No valid session available');
        }

        const callNumber = await this.sessionManager.incrementCallNumber();
        console.log(`[RelicPlayerService] Session ID: ${session.sessionId}, Call Number: ${callNumber}, Searching for: "${name}"`);
        
        const FIND_PROFILES_ENDPOINT = "game/account/FindProfiles";
        const FULL_FIND_PROFILES_URL = RELIC_API_HOST + FIND_PROFILES_ENDPOINT;

        const findProfilesParams = {
            "callNum": String(callNumber),
            "connect_id": session.sessionId,
            "lastCallTime": String(Date.now()),
            "name": name,
            "sessionID": session.sessionId,
        };

        console.log(`[RelicPlayerService] Making request to: ${FULL_FIND_PROFILES_URL}`);
        console.log(`[RelicPlayerService] Request params:`, JSON.stringify(findProfilesParams, null, 2));

        try {
            const response = await axios.get(FULL_FIND_PROFILES_URL, {
                params: findProfilesParams,
                headers: {
                    'Accept-Encoding': 'identity',
                    'Accept': '*/*',
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-store',
                },
            });

            const responseData = response.data;
            console.log(`[RelicPlayerService] Response status: ${response.status}, API status: ${responseData[0]}`);

            if (response.status === 200 && responseData[0] === 0) {
                console.log(`[RelicPlayerService] Success! Found ${responseData[1]?.length || 0} profiles`);
                return {
                    success: true,
                    data: responseData[1], // Profile data is typically in index 1
                    fullResponse: responseData
                };
            } else {
                // Handle auth failure - clear session for re-authentication
                if (responseData[0] !== 0) {
                    console.log(`Auth failure detected: API Error ${responseData[0]}`);
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
            console.error(`[RelicPlayerService] Request failed:`, error.message);
            if (axios.isAxiosError(error)) {
                // Check for 401 Unauthorized - session expired
                if (error.response?.status === 401) {
                    console.log(`[RelicPlayerService] 401 Unauthorized detected - session expired`);
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
}

module.exports = RelicPlayerService; 