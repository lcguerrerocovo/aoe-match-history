require('dotenv').config();

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

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const RELIC_AUTH_STEAM_USER = process.env.RELIC_AUTH_STEAM_USER;
const RELIC_AUTH_STEAM_PASS = process.env.RELIC_AUTH_STEAM_PASS;

// Global instances
let authClient = null;
let playerService = null;
let sessionManager = null;

async function getAuthenticatedPlayerService() {
  if (!sessionManager) {
    sessionManager = new SessionManager();
  }

  // Check if we have a valid session
  if (!(await sessionManager.isSessionValid())) {
    if (!RELIC_AUTH_STEAM_USER || !RELIC_AUTH_STEAM_PASS) {
      throw new Error('RELIC_AUTH_STEAM_USER and RELIC_AUTH_STEAM_PASS environment variables are required for player search');
    }
    
    console.log('No valid session found, authenticating...');
    authClient = new RelicAuthClient();
    const authResult = await authClient.authenticate(RELIC_AUTH_STEAM_USER, RELIC_AUTH_STEAM_PASS);
    
    // Save the session to Firestore
    await sessionManager.saveSession(authResult);
    console.log('Session saved and ready for use');
  }

  if (!playerService) {
    playerService = new RelicPlayerService();
  }

  return playerService;
}

async function handleSteamAvatar(steamId) {
  if (!STEAM_API_KEY) {
    throw new Error('STEAM_API_KEY environment variable is not set');
  }
  const targetUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;
  const response = await fetch(targetUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'aoe2-site'
    }
  });
  const data = await response.json();
  const avatarUrl = data.response?.players?.[0]?.avatarfull;
  return { 
    data: { avatarUrl },
    headers: {
      'Cache-Control': 'public, max-age=86400', // 24 hours for Steam avatars
      'Vary': 'Accept-Encoding'
    }
  };
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

async function handlePlayerSearch(name) {
  try {
    const service = await getAuthenticatedPlayerService();
    const result = await service.findProfiles(name);
    
    // If we got an auth failure, retry once with re-authentication
    if (!result.success && (result.authFailure || result.status === 401)) {
      console.log('Auth failure detected, retrying with re-authentication...');
      
      // Clear the failed session
      await sessionManager.clearSession();
      
      // Re-authenticate and retry
      authClient = new RelicAuthClient();
      const authResult = await authClient.authenticate(RELIC_AUTH_STEAM_USER, RELIC_AUTH_STEAM_PASS);
      await sessionManager.saveSession(authResult);
      
      // Retry the call
      const retryResult = await service.findProfiles(name);
      return { 
        data: retryResult,
        headers: {
          'Cache-Control': 'public, max-age=604800', // 1 week for player search results
          'Vary': 'Accept-Encoding'
        }
      };
    }
    
    return { 
      data: result,
      headers: {
        'Cache-Control': 'public, max-age=604800', // 1 week for player search results
        'Vary': 'Accept-Encoding'
      }
    };
  } catch (error) {
    console.error('Player search error:', error);
    throw new Error(`Player search failed: ${error.message}`);
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