const cors = require('cors')({ 
  origin: [
    'http://localhost:4173',
    'http://localhost:5173',
    'https://aoe2.site'
  ]
});
const fetch = require('node-fetch');

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 60 * 1000; // 1 minute

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

      const targetUrl = 'https://aoe-api.worldsedgelink.com/community/leaderboard/getRecentMatchHistory' + cacheKey;
      const response = await fetch(targetUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'aoe2-site'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Store in cache
      cache.set(cacheKey, {
        data,
        timestamp: now
      });

      res.status(200).json(data);
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).json({ error: 'Failed to fetch from API', details: error.message });
    }
  });
}; 