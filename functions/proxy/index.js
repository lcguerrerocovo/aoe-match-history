const cors = require('cors')({ 
  origin: [
    /^http:\/\/localhost:\d+$/,
    'https://aoe2.site'
  ]
});
const fetch = require('node-fetch');

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 60 * 1000; // 1 minute

const STEAM_API_KEY = '676056921CB63B6825BFED99BB7AAE1E';

async function handleSteamAvatar(steamId) {
  const targetUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;
  const response = await fetch(targetUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'aoe2-site'
    }
  });
  const data = await response.json();
  const avatarUrl = data.response?.players?.[0]?.avatarfull;
  return { data: { avatarUrl } };
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
    return { data };
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
  return { data };
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
  }
];

exports.proxy = async (req, res) => {
  return cors(req, res, async () => {
    try {
      
      const cacheKey = req.url || '';
      const now = Date.now();
      
      // Check cache
      const cachedData = cache.get(cacheKey);
      if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
        return res.status(200).json(cachedData.data);
      }

      const route = routes.find(r => r.pattern.test(req.url));
      
      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }

      const match = req.url.match(route.pattern);
      const response = await route.handler(match[1]);
      
      // Store in cache
      cache.set(cacheKey, {
        data: response.data,
        timestamp: now
      });

      res.status(200).json(response.data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch from API', details: error.message });
    }
  });
}; 