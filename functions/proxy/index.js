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

const STEAM_API_KEY = '91B31D3A113375C4B73F03925CFC4369';

async function handleSteamAvatar(steamId) {
  const targetUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_API_KEY}&steamids=${steamId}`;
  console.log('Fetching Steam avatar from:', targetUrl);
  const response = await fetch(targetUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'aoe2-site'
    }
  });
  const data = await response.json();
  console.log('Steam API response:', JSON.stringify(data, null, 2));
  const avatarUrl = data.response?.players?.[0]?.avatarfull;
  console.log('Extracted avatar URL:', avatarUrl);
  return { data: { avatarUrl } };
}

async function handleMatchHistory(profileId) {
  const targetUrl = `https://aoe-api.worldsedgelink.com/community/leaderboard/getRecentMatchHistory/?title=age2&profile_ids=["${profileId}"]`;
  const response = await fetch(targetUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'aoe2-site'
    }
  });
  const data = await response.json();
  return { data };
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
        console.log('Serving from cache:', cachedData.data);
        return res.status(200).json(cachedData.data);
      }

      const route = routes.find(r => r.pattern.test(req.url));
      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }

      const match = req.url.match(route.pattern);
      const response = await route.handler(match[1]);
      console.log('Handler response:', response);
      
      // Store in cache
      cache.set(cacheKey, {
        data: response.data,
        timestamp: now
      });

      console.log('Sending response:', response.data);
      res.status(200).json(response.data);
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).json({ error: 'Failed to fetch from API', details: error.message });
    }
  });
}; 