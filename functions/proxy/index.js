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

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const RELIC_AUTH_STEAM_USER = process.env.RELIC_AUTH_STEAM_USER;
const RELIC_AUTH_STEAM_PASS = process.env.RELIC_AUTH_STEAM_PASS;

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

async function handleMatchHistory(profileId) {
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
    return { 
      data,
      headers: {
        'Cache-Control': 'public, max-age=60', // 1 minute for match history
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

// Initialize Firestore client
let firestoreDb = null;

function getFirestoreClient() {
  if (!firestoreDb) {
    firestoreDb = new Firestore();
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
    const snapshot = await db.collection('players')
      .where('name_no_special', '>=', cleanQuery)
      .where('name_no_special', '<', cleanQuery + '\uf8ff') // Unicode end character for prefix search
      .limit(limit)
      .get();
    
    const results = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      results.push({
        id: data.profile_id.toString(),
        name: data.name,                    // Original alias for display
        country: data.country || '',
        matches: data.total_matches || 0,   // Match count from enhanced data
        lastMatchDate: data.last_match_date, // Can be null
        profile_id: data.profile_id
      });
    });
    
    // Sort by match count (most active players first)
    results.sort((a, b) => b.matches - a.matches);
    
    return results;
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

const routes = [
  {
    pattern: /^\/api\/steam\/avatar\/(\d+)$/,
    handler: handleSteamAvatar
  },
  {
    pattern: /^\/api\/match-history\/(\d+)$/,
    handler: handleMatchHistory
  },
  {
    pattern: /^\/api\/personal-stats\/(\d+)$/,
    handler: handlePersonalStats
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
        response = await route.handler(match[1]);
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