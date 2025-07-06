require('dotenv').config();
const functions = require('@google-cloud/functions-framework');
const cors = require('cors')({ 
  origin: [
    /^http:\/\/localhost:\d+$/,
    'https://aoe2.site',
    'https://api.aoe2.site'
  ]
});
const fetch = require('node-fetch');
const RelicAuthClient = require('./relicAuth');
const RelicPlayerService = require('./relicPlayerService');
const SessionManager = require('./sessionManager');
const pino = require('pino');
const { Firestore } = require('@google-cloud/firestore');
const { inflateSync } = require('zlib');

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const RELIC_AUTH_STEAM_USER = process.env.RELIC_AUTH_STEAM_USER;
const RELIC_AUTH_STEAM_PASS = process.env.RELIC_AUTH_STEAM_PASS;

// Endpoint of Python APM function (HTTP trigger)
const APM_API_URL = process.env.APM_API_URL || process.env.APM_FN_URL || null;

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

const log = logger.child({ module: 'Proxy' });

// Global instances
let authClient = null;
let playerService = null;
let sessionManager = null;
let rlMappings = null;
let civMap = null;
let mapMap = null;

// Duration of artificial latency in milliseconds (set via env or default 1500ms)
const SIMULATE_LATENCY_MS = process.env.SIMULATE_LATENCY_MS ? parseInt(process.env.SIMULATE_LATENCY_MS, 10) : 1500;

// Detailed AoE2 action type descriptions
const ACTION_TYPE_DESCRIPTIONS = {
  ERROR: 'Error or unknown action.',
  ORDER: 'Generic order issued to a unit (e.g., patrol, guard, gather, attack-move).',
  STOP: 'Orders a unit to halt its current action.',
  WORK: 'Villager or unit performs a work action (e.g., gather, build, repair).',
  MOVE: 'Orders a unit to move to a location.',
  CREATE: 'Creates a new unit.',
  ADD_ATTRIBUTE: 'Adds an attribute to a unit or object.',
  GIVE_ATTRIBUTE: 'Transfers an attribute (e.g., resource) to a unit or object.',
  AI_ORDER: 'Order issued by the AI.',
  RESIGN: 'Player resigns from the game.',
  SPECTATE: 'Spectator action.',
  ADD_WAYPOINT: 'Adds a waypoint for a unit or group.',
  STANCE: 'Changes the stance of a unit...',
  GUARD: 'Orders a unit to guard another unit or building.',
  FOLLOW: 'Orders a unit to follow another unit.',
  PATROL: 'Orders a unit to patrol between two points.',
  FORMATION: 'Changes formation.',
  SAVE: 'Save game action.',
  GROUP_MULTI_WAYPOINTS: 'Group movement with multiple waypoints.',
  CHAPTER: 'Campaign chapter action.',
  DE_ATTACK_MOVE: 'DE attack move command.',
  HD_UNKNOWN_34: 'Unknown action type (HD Edition).',
  DE_RETREAT: 'DE Retreat command.',
  DE_UNKNOWN_37: 'Unknown action type (DE).',
  DE_AUTOSCOUT: 'DE Auto-scout.',
  DE_UNKNOWN_39: 'Unknown action type (DE).',
  DE_UNKNOWN_40: 'Unknown action type (DE).',
  DE_TRANSFORM: 'DE Transform.',
  RATHA_ABILITY: 'DE Ratha ability.',
  DE_107_A: 'Unknown action type (DE).',
  DE_MULTI_GATHERPOINT: 'DE multiple gather points.',
  AI_COMMAND: 'AI command.',
  DE_UNKNOWN_80: 'Unknown action type (DE).',
  MAKE: 'Orders a building to produce a unit.',
  RESEARCH: 'Initiates research.',
  BUILD: 'Orders a villager to construct.',
  GAME: 'Game command.',
  WALL: 'Orders wall segment.',
  DELETE: 'Deletes unit/building.',
  ATTACK_GROUND: 'Attack ground.',
  TRIBUTE: 'Sends resources.',
  DE_UNKNOWN_109: 'Unknown action type (DE).',
  REPAIR: 'Repair action.',
  UNGARRISON: 'Ungarrison.',
  MULTIQUEUE: 'Multi-queue.',
  GATE: 'Build gate.',
  FLARE: 'Map flare.',
  SPECIAL: 'Special order.',
  QUEUE: 'Queue unit/tech.',
  GATHER_POINT: 'Set rally point.',
  SELL: 'Sells resources.',
  BUY: 'Buys resources.',
  DROP_RELIC: 'Drops relic.',
  TOWN_BELL: 'Town bell.',
  BACK_TO_WORK: 'Back to work.',
  DE_QUEUE: 'DE cancel queue.',
  DE_UNKNOWN_130: 'Unknown.',
  DE_UNKNOWN_131: 'Unknown.',
  DE_UNKNOWN_135: 'Unknown.',
  DE_UNKNOWN_136: 'Unknown.',
  DE_UNKNOWN_138: 'Unknown.',
  DE_107_B: 'Unknown.',
  DE_TRIBUTE: 'DE tribute.',
  POSTGAME: 'Postgame action.'
};

function categorize(cmd) {
  // mgz-parser exposes cmd.type (string) for DE, or cmd.op numeric. Use whichever available.
  if (typeof cmd.type === 'string' && ACTION_TYPE_DESCRIPTIONS[cmd.type]) return cmd.type;
  if (cmd.action && ACTION_TYPE_DESCRIPTIONS[cmd.action]) return cmd.action;
  return 'OTHER';
}

// -------------------------------------------------------------
// Utility: artificial latency injection for UI testing
// -------------------------------------------------------------
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// When developing locally we sometimes want to slow down specific
// endpoints so that the frontend can display loading animations.
// Set SIMULATE_LATENCY_MS env var (in milliseconds) to override,
// Match processing utilities
async function loadMappings() {
  if (!rlMappings) {
    const response = await fetch('https://aoe2.site/data/rl_api_mappings.json');
    rlMappings = await response.json();
  }
  return rlMappings;
}

async function checkReplayAvailability(gameId, profileId) {
  const maxRetries = 2;
  let retryCount = 0;
  
  while (retryCount <= maxRetries) {
    try {
      const replayUrl = `https://aoe.ms/replay/?gameId=${gameId}&profileId=${profileId}`;
      
      // Add delay between requests to avoid rate limiting
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // 1s, 2s delays
      }
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 800); // 800ms timeout
      
      const response = await fetch(replayUrl, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      // Handle rate limiting
      if (response.status === 429) {
        retryCount++;
        log.warn({ gameId, profileId, retryCount }, 'Rate limited, retrying...');
        continue;
      }
      
      // Only mark as unavailable if we get a clear 404/410/405 or "Match not found" response
      if (response.status === 404 || response.status === 410 || response.status === 405) {
        return false;
      }
      
      // For successful responses, check if content contains "Match not found"
      if (response.ok) {
        try {
          const responseText = await response.text();
          if (responseText.includes('Match not found')) {
            return false;
          }
          // If we got here, it's a real file download response
          return true;
        } catch (textError) {
          // If we can't read the text, assume available
          return true;
        }
      }
      
      // For any other response, assume available
      return true;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        retryCount++;
        log.debug({ gameId, profileId, retryCount }, 'Request timeout, retrying...');
        if (retryCount <= maxRetries) {
          continue; // retry loop
        }
        // Exhausted retries – treat as unavailable to avoid false positives
        return false;
      }
      
      retryCount++;
      log.debug({ error: error.message, gameId, profileId, retryCount }, 'Request failed, retrying...');
      
      if (retryCount > maxRetries) {
        // If all retries failed, assume available (false negative is better than false positive)
        log.debug({ gameId, profileId }, 'All retries failed - assuming available');
        return true;
      }
    }
  }
  
  return true; // Default to available
}

async function getCivMap() {
  if (!civMap) {
    const mappings = await loadMappings();
    if (!mappings?.civs?.aoe2) return {};
    civMap = {};
    for (const [civName, versions] of Object.entries(mappings.civs.aoe2)) {
      if (typeof versions === 'object' && versions !== null) {
        const versionNumbers = Object.keys(versions).map(Number);
        const latestVersion = Math.max(...versionNumbers);
        const civId = versions[latestVersion.toString()];
        if (civId !== undefined) {
          civMap[civId.toString()] = civName;
        }
      }
    }
  }
  return civMap;
}

async function getMapMap() {
  if (!mapMap) {
    const mappings = await loadMappings();
    if (!mappings?.maps?.aoe2) return {};
    mapMap = {};
    for (const [mapName, versions] of Object.entries(mappings.maps.aoe2)) {
      if (typeof versions === 'object' && versions !== null) {
        const versionNumbers = Object.keys(versions).map(Number);
        const latestVersion = Math.max(...versionNumbers);
        const mapId = versions[latestVersion.toString()];
        if (mapId !== undefined) {
          mapMap[mapId.toString()] = mapName;
        }
      }
    }
  }
  return mapMap;
}

function getGameType(matchTypeId) {
  const gameTypes = {
    0: "Unranked",
    2: "DM 1v1",
    3: "DM Team",
    4: "DM Team",
    5: "DM Team",
    6: "RM 1v1",
    7: "RM Team",
    8: "RM Team",
    9: "RM Team",
    10: "Battle Royale",
    11: "Quick Match EW",
    12: "Quick Match EW Team",
    13: "Quick Match EW Team",
    14: "Quick Match EW Team",
    18: "Quick Match RM",
    19: "Quick Match RM Team",
    20: "Quick Match RM Team",
    21: "Quick Match RM Team",
    25: "Quick Match BR FFA",
    26: "EW 1v1",
    27: "EW Team",
    28: "EW Team",
    29: "EW Team"
  };
  return gameTypes[matchTypeId] || null;
}

function decodeOptions(encoded) {
  try {
    if (!encoded || typeof encoded !== 'string') return {};
    
    const blob = Buffer.from(encoded, 'base64');
    const data = inflateSync(blob);
    
    let decodedText = data.toString();
    if (decodedText.startsWith('"') && decodedText.endsWith('"')) {
      decodedText = decodedText.slice(1, -1);
    }
    
    const raw = Buffer.from(decodedText, 'base64');
    const rawText = raw.toString();
    const pairs = rawText.match(/(\d+):([0-9A-Za-z+/=]+)/g) || [];
    
    return pairs.reduce((acc, pair) => {
      const [key, value] = pair.split(':');
      acc[key] = value;
      return acc;
    }, {});
  } catch (e) {
    return {};
  }
}

function decodeSlotInfo(str) {
  try {
    const decompressed = inflateSync(Buffer.from(str, 'base64')).toString();
    const playersDataStr = decompressed.substr(decompressed.indexOf(',') + 1);
    const playersData = JSON.parse(playersDataStr.replace(/[\u0000-\u0019]+/g, ""));
    
    return playersData.map(pd => {
      if (pd.metaData?.length > 0) {
        const decoded = Buffer.from(Buffer.from(pd.metaData, 'base64').toString(), 'base64').toString();
        const cleaned = decoded.split('').map(ch => ch.charCodeAt(0) < 32 ? '-' : ch).join('');
        const parts = cleaned.replace(/-+/g, '-').split('-');
        
        pd.metaData = {
          civId: parts[2],
          colorId: parts[4] === '4294967295' ? null : parseInt(parts[4]) + 1,
          teamId: parts[6]
        };
      }
      return pd;
    });
  } catch (e) {
    return [];
  }
}

function groupPlayersIntoTeams(players) {
  const allSameTeam = players.length > 0 && players.every(p => p.number === players[0].number);
  
  const teams = players.reduce((acc, player) => {
    const key = allSameTeam ? player.color_id : (player.number + 1);
    const teamIndex = key;
    if (teamIndex >= 0) {
      if (!acc[teamIndex]) acc[teamIndex] = [];
      acc[teamIndex].push(player);
    }
    return acc;
  }, []);
  
  return teams.filter(team => team && team.length > 0)
    .map(team => team.sort((a, b) => (a.color_id || 0) - (b.color_id || 0)));
}

function detectWinningTeams(teams) {
  const winningTeams = teams
    .map((team, index) => team.some(player => player.winner) ? index + 1 : null)
    .filter(teamNumber => teamNumber !== null);
  
  return { 
    winningTeam: winningTeams.length > 0 ? winningTeams[0] : undefined,
    winningTeams 
  };
}

// Resolve map ID and friendly name from various sources
function resolveMap(mapMap, { options = null, settings = null, mapId = null, rawName = '' }) {
  const candidate = options?.['10'] || settings?.['10'] || mapId;
  const idStr = candidate?.toString?.();
  const name = idStr && mapMap[idStr] ? mapMap[idStr] : rawName;
  if (!name && idStr) {
    log.debug({ mapId: idStr, rawMap: rawName }, 'Map ID unresolved');
  }
  return { id: candidate ? parseInt(candidate, 10) : mapId, name };
}

async function processMatch(match, profiles) {
  const civMap = await getCivMap();
  const mapMap = await getMapMap();
  
  // Create profile and rating maps
  const profileMap = new Map(profiles.map(p => [p.profile_id.toString(), p.alias]));
  const ratingMap = new Map((match.matchhistorymember || []).map(m => [
    m.profile_id, 
    { oldRating: m.oldrating, newRating: m.newrating }
  ]));
  
  // Create save game URL map
  const saveGameMap = new Map((match.matchurls || []).map(url => [
    url.profile_id,
    {
      url: url.url,
      size: url.size || 0
    }
  ]));
  
  // Decode slot info
  const slotInfo = decodeSlotInfo(match.slotinfo);
  
  // Process players with replay availability checking
  const players = await Promise.all(match.matchhistoryreportresults.map(async (result) => {
    const profileId = parseInt(result.profile_id);
    const playerSlot = slotInfo?.find(p => p['profileInfo.id'] === profileId);
    const teamId = playerSlot?.metaData?.teamId ? parseInt(playerSlot.metaData.teamId) : result.teamid + 1;
    const civId = result.civilization_id;
    const colorId = playerSlot?.metaData?.colorId ?? 0;
    const ratingInfo = ratingMap.get(result.profile_id);
    const saveGameInfo = saveGameMap.get(result.profile_id);
    
    // Find the original name with Steam ID from profiles
    const profile = profiles.find(p => p.profile_id === result.profile_id);
    const originalName = profile?.name || result.profile_id.toString(); // This contains "/steam/123456789"
    const displayName = profile?.alias || originalName;
    
    // Check replay availability
    const replayAvailable = null; // Will be checked asynchronously by the client
    
    return {
      name: displayName, // Display name (alias)
      original_name: originalName, // Original name with Steam ID
      civ: civMap[civId.toString()] || civId,
      number: teamId,
      color_id: colorId,
      user_id: result.profile_id,
      winner: result.resulttype === 1,
      rating: ratingInfo?.newRating ?? null,
      rating_change: ratingInfo ? ratingInfo.newRating - ratingInfo.oldRating : null,
      save_game_url: saveGameInfo?.url || null,
      save_game_size: saveGameInfo?.size || null,
      match_id: match.id,
      replay_available: replayAvailable
    };
  }));
  
  // Group into teams and detect winners
  const teams = groupPlayersIntoTeams(players);
  const { winningTeam, winningTeams } = detectWinningTeams(teams);
  
  // Resolve map using shared helper
  const options = decodeOptions(match.options);
  const { id: resolvedMapId, name: mapName } = resolveMap(mapMap, { options, rawName: match.mapname });
  
  return {
    match_id: match.id.toString(),
    map_id: resolvedMapId,
    start_time: new Date(match.startgametime * 1000).toISOString(),
    description: match.description === "AUTOMATCH" ? getGameType(match.matchtype_id) : match.description,
    diplomacy: {
      type: getGameType(match.matchtype_id) || 'Unknown',
      team_size: match.maxplayers.toString(),
    },
    map: mapName,
    duration: match.completiontime - match.startgametime,
    teams: teams,
    players: players,
    winning_team: winningTeam,
    winning_teams: winningTeams
  };
}

async function ensureAuthenticated() {
    const sessionManager = new SessionManager();
    const session = await sessionManager.getSession();
    
    if (!session) {
        log.info('No valid session found, authenticating...');
        
        const authClient = new RelicAuthClient();
        
        if (!RELIC_AUTH_STEAM_USER || !RELIC_AUTH_STEAM_PASS) {
            throw new Error('Steam credentials not configured');
        }
        
        try {
            const authResult = await authClient.authenticate(RELIC_AUTH_STEAM_USER, RELIC_AUTH_STEAM_PASS);
            await sessionManager.saveSession(authResult);
            log.info('Re-authentication with existing ticket successful');
            return authResult;
        } catch (error) {
            log.warn({ error: error.message }, 'Re-authentication with existing ticket failed, doing full authentication');
            
            const authResult = await authClient.authenticate(RELIC_AUTH_STEAM_USER, RELIC_AUTH_STEAM_PASS);
            await sessionManager.saveSession(authResult);
            log.info('Session saved and ready for use');
            return authResult;
        }
    }
    
    return session;
}

async function getAuthenticatedPlayerService() {
  if (!sessionManager) {
    sessionManager = new SessionManager();
  }

  // Check if we have a valid session
  if (!(await sessionManager.isSessionValid())) {
    if (!RELIC_AUTH_STEAM_USER || !RELIC_AUTH_STEAM_PASS) {
      throw new Error('RELIC_AUTH_STEAM_USER and RELIC_AUTH_STEAM_PASS environment variables are required for player search');
    }
    
    // Try to get the last session data for ticket reuse
    const lastSession = await sessionManager.getSession();
    
    log.info('No valid session found, authenticating...');
    authClient = new RelicAuthClient();
    
    let authResult;
    if (lastSession && lastSession.base64Ticket) {
      // Try re-authentication with existing ticket first
      try {
        const steamData = { steamId64: lastSession.steamId64, steamUserName: lastSession.steamUserName };
        authResult = await authClient.authenticate(RELIC_AUTH_STEAM_USER, RELIC_AUTH_STEAM_PASS, lastSession.base64Ticket, steamData);
        log.info('Re-authentication with existing ticket successful');
      } catch (error) {
        log.warn({ error: error.message }, 'Re-authentication with existing ticket failed, doing full authentication');
        authResult = await authClient.authenticate(RELIC_AUTH_STEAM_USER, RELIC_AUTH_STEAM_PASS);
      }
    } else {
      // No existing ticket, do full authentication
      authResult = await authClient.authenticate(RELIC_AUTH_STEAM_USER, RELIC_AUTH_STEAM_PASS);
    }
    
    // Save the session to Firestore
    await sessionManager.saveSession(authResult);
    log.info('Session saved and ready for use');
  }

  if (!playerService) {
    playerService = new RelicPlayerService();
  }

  return playerService;
}

async function handleSteamAvatar(steamId) {
  log.debug({ steamId }, 'handleSteamAvatar called');
  if (!STEAM_API_KEY) {
    log.error('STEAM_API_KEY environment variable is not set');
    throw new Error('STEAM_API_KEY environment variable is not set');
  }
  const targetUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;
  log.debug({ targetUrl }, 'Fetching Steam avatar');
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'aoe2-site'
      }
    });
    if (!response.ok) {
      log.warn({ status: response.status, statusText: response.statusText }, 'Steam API returned error for avatar');
      return {
        data: { avatarUrl: null },
        headers: {
          'Cache-Control': 'public, max-age=600', // cache fallback for 10 min
          'Vary': 'Accept-Encoding'
        }
      };
    }
    const data = await response.json();
    log.debug({ data }, 'Steam API response for avatar');
    const avatarUrl = data.response?.players?.[0]?.avatarfull;
    log.debug({ avatarUrl }, 'Extracted avatarUrl');
    return { 
      data: { avatarUrl },
      headers: {
        'Cache-Control': 'public, max-age=86400', // 24 hours for Steam avatars
        'Vary': 'Accept-Encoding'
      }
    };
  } catch (error) {
    log.error({ error: error.message, stack: error.stack }, 'Error in handleSteamAvatar');
    // Eat the error and return null avatar
    return {
      data: { avatarUrl: null },
      headers: {
        'Cache-Control': 'public, max-age=600', // cache fallback for 10 min
        'Vary': 'Accept-Encoding'
      }
    };
  }
}

// Pure API call - just fetch and cache raw data
async function handleRawMatchHistory(profileId) {
  const targetUrl = `https://aoe-api.worldsedgelink.com/community/leaderboard/getRecentMatchHistory/?title=age2&profile_ids=["${profileId}"]`;
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'aoe2-site'
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API responded with status ${response.status}`);
    }
    const data = await response.json();
    
    // Save raw individual matches to Firebase with profiles data
    if (data.matchHistoryStats && data.matchHistoryStats.length > 0) {
      const db = getFirestoreClient();
      
      // Sort matches by start time (most recent first)
      const sortedMatches = [...data.matchHistoryStats].sort((a, b) => b.startgametime - a.startgametime);
      
      // Process matches in background with smart batching
      setImmediate(async () => {
        try {
          log.debug({ profileId, totalMatches: sortedMatches.length }, 'Starting smart async match storage');
          
          // Process in smaller batches of 5 matches at a time
          const BATCH_SIZE = 5;
          const DELAY_BETWEEN_BATCHES = 100; // 100ms delay between batches
          
          for (let i = 0; i < sortedMatches.length; i += BATCH_SIZE) {
            const batch = db.batch();
            const currentBatch = sortedMatches.slice(i, i + BATCH_SIZE);
            
            currentBatch.forEach(match => {
              if (match.id) {
                try {
                  const matchRef = db.collection('matches').doc(match.id.toString());
                  const matchData = {
                    raw: match,
                    profiles: data.profiles,
                    updated: new Date().toISOString()
                  };
                  
                  batch.set(matchRef, matchData, { merge: true });
                } catch (error) {
                  log.error({ error: error.message, matchId: match.id }, 'Error adding match to batch');
                }
              }
            });
            
            // Commit this batch
            await batch.commit();
            log.debug({ 
              profileId, 
              batchNumber: Math.floor(i / BATCH_SIZE) + 1, 
              totalBatches: Math.ceil(sortedMatches.length / BATCH_SIZE),
              matchesInBatch: currentBatch.length 
            }, 'Batch committed successfully');
            
            // Small delay between batches to avoid overwhelming Firebase
            if (i + BATCH_SIZE < sortedMatches.length) {
              await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
            }
          }
          
          log.info({ profileId, totalMatches: sortedMatches.length }, 'All matches stored successfully');
        } catch (error) {
          log.error({ 
            error: error.message, 
            stack: error.stack,
            profileId 
          }, 'Failed to save raw matches to Firebase (smart async)');
        }
      });
      
      log.debug('Smart storage queued for background processing');
    }
    
    // Don't cache the full response - we store individual matches
    
    return { 
      data,
      headers: {
        'Cache-Control': 'public, max-age=60', // 1 minute for raw match history
        'Vary': 'Accept-Encoding'
      }
    };
  } catch (error) {
    throw error;
  }
}

// Transformation route - fetch raw data and process
async function handleMatchHistory(profileId) {
  try {
    // Always fetch fresh raw data and store individual matches
    log.info({ profileId }, 'Fetching raw match history');
    const rawResult = await handleRawMatchHistory(profileId);
    const data = rawResult.data;
    
    // Process matches from raw data
    const processedMatches = await Promise.all(
      data.matchHistoryStats.map(match => processMatch(match, data.profiles))
    );
    
    // Get profile info
    const profile = data.profiles.find(p => p.profile_id.toString() === profileId);
    const processedData = {
      id: profileId,
      name: profile?.alias || profileId,
      matches: processedMatches.sort((a, b) => b.start_time.localeCompare(a.start_time))
    };
    
    return { 
      data: processedData,
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutes for processed data
        'Vary': 'Accept-Encoding'
      }
    };
  } catch (error) {
    throw error;
  }
}

async function handlePersonalStats(profileId) {
  const targetUrl = `https://aoe-api.worldsedgelink.com/community/leaderboard/GetPersonalStat?title=age2&profile_ids=["${profileId}"]`;
  const response = await fetch(targetUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'aoe2-site'
    }
  });
  const data = await response.json();
  return { 
    data,
    headers: {
      'Cache-Control': 'public, max-age=60', // 1 minute for personal stats
      'Vary': 'Accept-Encoding'
    }
  };
}

// Raw match - just return cached raw data
async function handleRawMatch(matchId) {
  try {
    const db = getFirestoreClient();
    const matchRef = db.collection('matches').doc(matchId.toString());
    const matchDoc = await matchRef.get();
    
    if (!matchDoc.exists) {
      throw new Error('Match not found');
    }
    
    const matchData = matchDoc.data();
    
    return { 
      data: matchData.raw || matchData,
      headers: {
        'Cache-Control': 'public, max-age=86400', // 24 hours for raw match data
        'Vary': 'Accept-Encoding'
      }
    };
  } catch (error) {
    throw error;
  }
}

// Processed match - apply transformation to cached raw data
async function handleMatch(matchId) {
  try {
    log.info({ matchId, docId: matchId.toString() }, 'Attempting to load match');
    const db = getFirestoreClient();
    const matchRef = db.collection('matches').doc(matchId.toString());
    const matchDoc = await matchRef.get();
    log.info({ matchId, exists: matchDoc.exists }, 'Match document check');
          // Use stored data
    let docData = matchDoc.data();
    let rawMatch = docData.raw || docData;
    let profiles = docData.profiles || [];
    
    const processedMatch = await processMatch(rawMatch, profiles);
    
    // Attach APM data if available in Firestore doc
    const storedApm = docData ? docData.apm : undefined;
    log.info({ storedApm }, 'Stored APM data');
    if (storedApm) {
      processedMatch.apm = storedApm;
    }
    
    return { 
      data: processedMatch,
      headers: {
        'Cache-Control': 'private, max-age=0, must-revalidate',
        'Vary': 'Accept-Encoding'
      }
    };
  } catch (error) {
    throw error;
  }
}

// Initialize Firestore client
let firestoreDb = null;

function getFirestoreClient() {
  if (!firestoreDb) {
    firestoreDb = new Firestore();
    log.info('Firestore client initialized with default credentials');
  }
  return firestoreDb;
}

function cleanForSearch(text) {
  if (!text || typeof text !== 'string') return '';
  // Remove all non-alphanumeric characters, convert to lowercase (same as upload script)
  return text.replace(/[^\w]/g, '').toLowerCase();
}

async function searchFirestore(db, query, limit = 20) {
  const cleanQuery = cleanForSearch(query);
  if (!cleanQuery) return [];
  
  try {
    const resultMap = new Map(); // Use Map to deduplicate by profile_id
    
    // 1. Prefix search on name_no_special (handles full names like "nttornasol")
    log.info({ 
      query: `collection('players').where('name_no_special', '>=', '${cleanQuery}').where('name_no_special', '<', '${cleanQuery}\uf8ff').orderBy('name_no_special').orderBy('total_matches', 'desc').limit(${limit})`,
      operation: 'prefix_search'
    }, 'Firestore query');
    
    const prefixSnapshot = await db.collection('players')
      .where('name_no_special', '>=', cleanQuery)
      .where('name_no_special', '<', cleanQuery + '\uf8ff')
      .orderBy('name_no_special')
      .orderBy('total_matches', 'desc')
      .limit(limit)
      .get();
    
    prefixSnapshot.forEach(doc => {
      const data = doc.data();
      resultMap.set(data.profile_id, {
        id: data.profile_id.toString(),
        name: data.name,
        country: data.country || '',
        matches: data.total_matches || 0,
        lastMatchDate: data.last_match_date,
        profile_id: data.profile_id
      });
    });
    
    // 2. Token search - search for user query as a token (handles "tornasol" finding "<NT>.tornasol")
    if (cleanQuery.length >= 3) { // Only search meaningful tokens (3+ chars to avoid noise)
      try {
        log.info({ 
          query: `collection('players').where('name_tokens', 'array-contains', '${cleanQuery}').orderBy('total_matches', 'desc').limit(${limit})`,
          operation: 'token_search'
        }, 'Firestore query');
        
        const tokenSnapshot = await db.collection('players')
          .where('name_tokens', 'array-contains', cleanQuery)
          .orderBy('total_matches', 'desc')
          .limit(limit)
          .get();
        
        tokenSnapshot.forEach(doc => {
          const data = doc.data();
          // Add to results if not already present
          if (!resultMap.has(data.profile_id)) {
            resultMap.set(data.profile_id, {
              id: data.profile_id.toString(),
              name: data.name,
              country: data.country || '',
              matches: data.total_matches || 0,
              lastMatchDate: data.last_match_date,
              profile_id: data.profile_id
            });
          }
        });
      } catch (tokenError) {
        // Log but don't fail entire search if token search fails
        log.error({ error: tokenError.message, token: cleanQuery }, 'Token search failed');
      }
    }
    
    // Convert Map to array and sort by match count
    const results = Array.from(resultMap.values());
    results.sort((a, b) => b.matches - a.matches);
    
    return results.slice(0, limit);
    
  } catch (error) {
    log.error({ error: error.message, query }, 'Error in Firestore search');
    return [];
  }
}

async function handlePlayerSearch(name) {
  try {
    const cleanName = cleanForSearch(name);
    
    // Validate input
    if (!cleanName) {
      return {
        data: [],
        headers: {
          'Cache-Control': 'public, max-age=300', // 5 minutes for empty queries
          'Vary': 'Accept-Encoding'
        }
      };
    }
    
    // Too short - suggest typing more
    if (cleanName.length < 2) {
      return {
        data: [],
        headers: {
          'Cache-Control': 'public, max-age=300',
          'Vary': 'Accept-Encoding'
        }
      };
    }
    
    const db = getFirestoreClient();
    const results = await searchFirestore(db, cleanName, 100);
    
    log.info({ query: name, cleanQuery: cleanName, resultCount: results.length }, 'Player search completed');
    
    return {
      data: results,
      headers: {
        'Cache-Control': 'public, max-age=1800', // 30 minutes for search results
        'Vary': 'Accept-Encoding'
      }
    };
  } catch (error) {
    log.error({ error: error.message, name }, 'Player search error');
    throw error;
  }
}

// Authenticated single-player recent match history via RelicPlayerService
async function handleGameMatchHistory(idsStr) {
  const ids = idsStr.split(',').map(id => id.trim()).filter(Boolean);
  if (ids.length === 0) {
    throw new Error('No profile IDs provided');
  }

  const executeRequest = async () => {
    const svc = await getAuthenticatedPlayerService();
    return svc.getRecentMatchSinglePlayerHistory(ids);
  };

  try {
    // Ensure we have a session and make the primary request
    await ensureAuthenticated();
    const result = await executeRequest();

    // If service indicates auth failure, force re-auth and retry once
    if (!result.success && result.authFailure) {
      await ensureAuthenticated(true);
      return await executeRequest();
    }

    return {
      data: result.data,
      headers: {
        'Cache-Control': 'private, max-age=60',
        'Vary': 'Accept-Encoding'
      }
    };
  } catch (err) {
    // Detect 401 (or auth) errors thrown as exceptions, then retry once after re-auth
    const status = err?.response?.status || err?.status;
    if (status === 401) {
      // Force re-auth then retry
      await ensureAuthenticated(true);
      const retryResult = await executeRequest();
      return {
        data: retryResult.data,
        headers: {
          'Cache-Control': 'private, max-age=60',
          'Vary': 'Accept-Encoding'
        }
      };
    }
    // Re-throw other errors
    throw err;
  }
}

// Helper: batch fetch aliases from Firestore for given profile IDs
async function fetchAliases(profileIds) {
  if (!profileIds || profileIds.length === 0) return new Map();
  const db = getFirestoreClient();
  const aliasMap = new Map();
  const chunkSize = 10; // Firestore "in" limit
  for (let i = 0; i < profileIds.length; i += chunkSize) {
    const chunk = profileIds.slice(i, i + chunkSize).map(id => parseInt(id, 10));
    try {
      const snap = await db.collection('players')
        .where('profile_id', 'in', chunk)
        .get();
      snap.forEach(doc => {
        const d = doc.data();
        const alias = d.alias || d.name || d.profile_id.toString();
        aliasMap.set(d.profile_id.toString(), alias);
      });
    } catch (e) {
      log.warn({ error: e.message, chunk }, 'Failed fetching aliases');
    }
  }
  return aliasMap;
}

// Processed variant
async function handleProcessedGameMatchHistory(idsStr) {
  const raw = await handleRawGameMatchHistory(idsStr);

  // Pre-load civ mapping once for all matches
  const civMap = await getCivMap();
  const mapMap = await getMapMap();

  // Collect unique profile IDs across all matches
  const idSet = new Set();
  (raw.data || []).forEach(m => {
    (m.players || []).forEach(p => {
      idSet.add(p["profileInfo.id"].toString());
    });
  });
  const aliasMap = await fetchAliases(Array.from(idSet));

  const transformMatch = (m) => {
    // Build Player objects in UI-expected shape
    const rawPlayers = m.players || [];

    const players = rawPlayers.map((p) => {
      const profileIdStr = p["profileInfo.id"].toString();
      const civId = p.metaData?.civId ?? null;
      const colorId = p.metaData?.colorId ?? 0;
      const teamIdRaw = p.metaData?.teamId ?? p.teamID ?? 0;
      const teamNumber = parseInt(teamIdRaw, 10) + 1;
      return {
        name: aliasMap.get(profileIdStr) || profileIdStr,
        civ: civMap[civId?.toString?.() ?? ""] || civId, // fallback to id if unknown
        number: teamNumber,
        color_id: colorId,
        user_id: profileIdStr,
        winner: false,
        rating: null,
        rating_change: null
      };
    });

    // Group into teams using existing helper
    const teams = groupPlayersIntoTeams(players);

    // Resolve map using shared helper (single-player uses decoded settings)
    const { id: resolvedMapId, name: mapName } = resolveMap(mapMap, { settings: m.settings, mapId: m.map_id, rawName: m.map_name });

    return {
      match_id: m.match_id.toString(),
      map_id: resolvedMapId,
      start_time: new Date(m.start_time * 1000).toISOString(),
      description: m.name,
      diplomacy: { type: 'Single', team_size: teams.length.toString() },
      map: mapName,
      duration: m.end_time - m.start_time,
      teams,
      players,
      winning_team: undefined,
      winning_teams: []
    };
  };

  const processed = (raw.data || []).map(transformMatch);
  processed.sort((a, b) => b.start_time.localeCompare(a.start_time));

  // Derive name when single profile
  const respName = aliasMap.get(idsStr) || idsStr;

  return {
    data: { id: idsStr, name: respName, matches: processed },
    headers: raw.headers
  };
}

async function handleReplayDownload(gameId, profileId) {
  try {
    // Inject artificial latency for UI spinner demonstration
    if (SIMULATE_LATENCY_MS > 0) {
      await sleep(SIMULATE_LATENCY_MS);
    }

    const url = `https://aoe.ms/replay/?gameId=${gameId}&profileId=${profileId}`;

    // Log outgoing request details
    log.info({ gameId, profileId, url }, 'Fetching replay file');

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/octet-stream',
        'User-Agent': 'aoe2-site'
      }
    });

    // Log response headers & status
    const respHeaders = {};
    response.headers.forEach((v, k) => { respHeaders[k] = v; });
    log.info({ gameId, profileId, status: response.status, headers: respHeaders }, 'Replay fetch response');

    if (response.ok) {
      const buffer = await response.arrayBuffer();
      // Send to external Python APM service if configured
      const apmData = await invokeExternalAPM(buffer, gameId, profileId);

      const apmSuccess = apmData && !apmData.error;

      // If APM processed, persist into Firestore under matches collection
      if (apmSuccess) {
        try {
          const db = getFirestoreClient();
          if (db) {
            const matchRef = db.collection('matches').doc(String(gameId));
            await matchRef.set({ apm: apmData }, { merge: true });
          }
        } catch (persistErr) {
          log.warn({ err: persistErr.message, gameId }, 'Failed to persist APM data');
        }
      }

      log.info({ gameId, profileId, size: buffer.byteLength, apmData }, 'Replay downloaded and APM processed');
      return {
        data: { size: buffer.byteLength, downloaded: apmSuccess, apm: apmData },
        headers: {
          'Cache-Control': 'private, max-age=0',
          'Vary': 'Accept-Encoding'
        }
      };
    }

    // Read small portion of body for debugging (if text)
    let bodySnippet = '';
    try {
      const text = await response.text();
      bodySnippet = text.slice(0, 200);
    } catch (_) {
      bodySnippet = '<non-text body>';
    }

    // Gracefully handle non-OK responses – treat as unavailable but not an error
    log.warn({ gameId, profileId, status: response.status, body: bodySnippet }, 'Replay download returned non-OK status');
    return {
      data: { downloaded: false, status: response.status },
      headers: {
        'Cache-Control': 'private, max-age=0',
        'Vary': 'Accept-Encoding'
      }
    };
  } catch (error) {
    log.error({ error: error.message, gameId, profileId }, 'Replay download error');
    return {
      data: { downloaded: false, error: error.message },
      headers: {
        'Cache-Control': 'private, max-age=0',
        'Vary': 'Accept-Encoding'
      }
    };
  }
}

async function invokeExternalAPM(buffer, gameId, profileId) {
  if (!APM_API_URL) return null;
  try {
    const resp = await fetch(APM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, profileId })
    });

    const responseText = await resp.text();

    if (!resp.ok) {
      // Surface body for easier debugging of 4xx/5xx coming from Python
      log.warn({ status: resp.status, body: responseText }, 'APM service responded non-OK');
      return { error: `APM ${resp.status}`, body: safeJsonParse(responseText) || responseText };
    }

    // Successful – try to parse JSON, but fall back to raw body if parse fails
    return safeJsonParse(responseText) || responseText;
  } catch (e) {
    log.error({ err: e.message }, 'Failed to call APM service');
    return { error: e.message };
  }
}

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch (_) { return null; }
}

const routes = [
  {
    pattern: /^\/api\/steam\/avatar\/(\d+)$/,
    handler: handleSteamAvatar
  },
  {
    pattern: /^\/api\/raw-match-history\/(\d+)$/,
    handler: handleRawMatchHistory
  },
  {
    pattern: /^\/api\/match-history\/(\d+)$/,
    handler: handleMatchHistory
  },
  {
    pattern: /^\/api\/raw-match\/(\d+)$/,
    handler: handleRawMatch
  },
  {
    pattern: /^\/api\/match\/(\d+)$/,
    handler: handleMatch
  },
  {
    pattern: /^\/api\/personal-stats\/(\d+)$/,
    handler: handlePersonalStats
  },
  {
    pattern: /^\/api\/raw-gamematch-history\/(\d+(?:,\d+)*)$/,
    handler: handleGameMatchHistory
  },
  {
    pattern: /^\/api\/gamematch-history\/(\d+(?:,\d+)*)$/,
    handler: handleProcessedGameMatchHistory
  },
  {
    pattern: /^\/api\/check-replay\/(\d+)\/(\d+)$/,
    handler: async (gameId, profileId) => {
      const available = await checkReplayAvailability(gameId, profileId);
      return {
        data: { gameId, profileId, available },
        headers: {
          'Cache-Control': 'public, max-age=300', // 5 minutes for replay checks
          'Vary': 'Accept-Encoding'
        }
      };
    }
  },
  {
    pattern: /^\/api\/player-search(\?.*)?$/,
    handler: (req, res) => {
      const name = req.query.name;
      if (!name) {
        return res.status(400).json({ error: 'Missing name parameter' });
      }
      return handlePlayerSearch(name);
    }
  },
  {
    pattern: /^\/api\/replay-download\/(\d+)\/(\d+)$/,
    handler: (gameId, profileId) => handleReplayDownload(gameId, profileId)
  }
];

exports.proxy = async (req, res) => {
  return cors(req, res, async () => {
    try {
      const route = routes.find(r => r.pattern.test(req.url));
      
      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }

      let response;
      
      // Handle player-search route specially since it uses query parameters
      if (req.url.startsWith('/api/player-search')) {
        response = await route.handler(req, res);
      } else {
        // Handle other routes with path parameters
        const match = req.url.match(route.pattern);
        if (match && match.length >= 3) {
          // Routes with two captured parameters (e.g., check-replay, replay-download)
          response = await route.handler(match[1], match[2]);
        } else {
          response = await route.handler(match[1]);
        }
      }
      
      // Set headers from handler
      Object.entries(response.headers).forEach(([key, value]) => {
        res.set(key, value);
      });

      res.status(200).json(response.data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch from API', details: error.message });
    }
  });
};

// Test-only: allow resetting/injecting playerService for tests
if (process.env.NODE_ENV === 'test') {
  exports.__setPlayerService = (svc) => { playerService = svc; };
  exports.__resetPlayerService = () => { playerService = null; };
} 