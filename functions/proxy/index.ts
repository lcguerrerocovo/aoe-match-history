import cors from 'cors';
import type { Request, Response } from 'express';

// Import from extracted modules
import { log, getFirestoreClient } from './config';
import { handlePlayerSearch } from './playerSearch';
import { handleSteamAvatar } from './steamHandler';
import { __setPlayerService, __resetPlayerService } from './authService';
import { handleRawMatchHistory, handleMatchHistory, handlePersonalStats, handleRawMatch, handleMatch } from './matchHandlers';
import { handleFullMatchHistory } from './fullMatchHistoryHandler';
import { handleGameMatchHistory, handleProcessedGameMatchHistory } from './gameMatchHandlers';
import { handleReplayDownload } from './replayDownloadHandler';
import { checkReplayAvailability, checkApmStatus } from './replayService';
import { handleLiveMatches, handleLiveRatings } from './liveMatchHandler';
import type { HandlerResponse } from './types';

const corsMiddleware = cors({
  origin: [
    /^http:\/\/localhost:\d+$/,
    'https://aoe2.site',
    'https://api.aoe2.site'
  ],
  exposedHeaders: ['X-Partial'],
});

interface Route {
  pattern: RegExp;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (...args: any[]) => any;
}

const routes: Route[] = [
  {
    pattern: /^\/api\/steam\/avatar\/(\d+)(\?.*)?$/,
    handler: handleSteamAvatar
  },
  {
    pattern: /^\/api\/raw-match-history\/(\d+)(\?.*)?$/,
    handler: handleRawMatchHistory
  },
  {
    pattern: /^\/api\/match-history\/(\d+)\/full(\?.*)?$/,
    handler: handleFullMatchHistory
  },
  {
    pattern: /^\/api\/match-history\/(\d+)(\?.*)?$/,
    handler: handleMatchHistory
  },
  {
    pattern: /^\/api\/raw-match\/(\d+)(\?.*)?$/,
    handler: handleRawMatch
  },
  {
    pattern: /^\/api\/match\/(\d+)(\?.*)?$/,
    handler: handleMatch
  },
  {
    pattern: /^\/api\/personal-stats\/(\d+)(\?.*)?$/,
    handler: handlePersonalStats
  },
  {
    pattern: /^\/api\/raw-gamematch-history\/(\d+(?:,\d+)*)(\?.*)?$/,
    handler: handleGameMatchHistory
  },
  {
    pattern: /^\/api\/gamematch-history\/(\d+(?:,\d+)*)(\?.*)?$/,
    handler: handleProcessedGameMatchHistory
  },
  {
    pattern: /^\/api\/check-replay\/(\d+)\/(\d+)(\?.*)?$/,
    handler: async (gameId: string, profileId: string) => {
      const available = await checkReplayAvailability(gameId, profileId);
      return {
        data: { gameId, profileId, available },
        headers: {
          'Cache-Control': 'public, max-age=300',
          'Vary': 'Accept-Encoding'
        }
      };
    }
  },
  {
    pattern: /^\/api\/apm-status\/(\d+)\/(\d+)(\?.*)?$/,
    handler: async (gameId: string, profileId: string) => {
      const status = await checkApmStatus(gameId, profileId);
      return {
        data: { gameId, profileId, ...status },
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      };
    }
  },
  {
    pattern: /^\/api\/apm-status-match\/(\d+)(\?.*)?$/,
    handler: async (gameId: string) => {
      // Get match data to extract player IDs
      const matchData = await handleMatch(gameId);
      if (!matchData.data || !matchData.data.players) {
        return {
          data: { gameId, hasSaveGame: false, isProcessed: false, state: 'greyStatus' },
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        };
      }

      // Extract all player IDs
      const playerIds = matchData.data.players.map(p => p.user_id?.toString()).filter(Boolean);

      // Check each player until we find one with available replay
      for (const profileId of playerIds) {
        try {
          const status = await checkApmStatus(gameId, profileId);
          if (status.state !== 'greyStatus') {
            return {
              data: { gameId, profileId, ...status },
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            };
          }
        } catch (error) {
          log.warn({ err: (error as Error).message, gameId, profileId }, 'Failed to check APM status for player');
        }
      }

      // If no player has a replay, return grey status
      return {
        data: { gameId, hasSaveGame: false, isProcessed: false, state: 'greyStatus' },
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      };
    }
  },
  {
    pattern: /^\/api\/live\/ratings(\?.*)?$/,
    handler: handleLiveRatings
  },
  {
    pattern: /^\/api\/live(\?.*)?$/,
    handler: handleLiveMatches
  },
  {
    pattern: /^\/api\/player-search(\?.*)?$/,
    handler: (req: Request, res: Response) => {
      const name = req.query.name as string;
      if (!name) {
        return res.status(400).json({ error: 'Missing name parameter' });
      }
      return handlePlayerSearch(name);
    }
  },
  {
    pattern: /^\/api\/replay-download\/(\d+)\/(\d+)(\?.*)?$/,
    handler: (gameId: string, profileId: string, body?: Record<string, unknown>) =>
      handleReplayDownload(gameId, profileId, body?.replayData as string | undefined)
  }
];

const proxy = async (req: Request, res: Response): Promise<void> => {
  return corsMiddleware(req, res, async () => {
    try {
      const route = routes.find(r => r.pattern.test(req.url));

      if (!route) {
        return res.status(404).json({ error: 'Route not found' });
      }

      let response: HandlerResponse<unknown>;

      // Handle player-search route specially since it uses query parameters
      if (req.url.startsWith('/api/player-search')) {
        response = await (route.handler as (req: Request, res: Response) => Promise<HandlerResponse<unknown>>)(req, res);
      } else if (req.url.startsWith('/api/live/ratings')) {
        // POST with JSON body, or GET with query string
        const arg = req.method === 'POST' ? req.body : req.url.match(route.pattern)?.[1];
        response = await (route.handler as (a: unknown) => Promise<HandlerResponse<unknown>>)(arg);
      } else {
        // Handle other routes with path parameters
        const match = req.url.match(route.pattern);
        if (match && match.length >= 3) {
          // Routes with two captured parameters (e.g., check-replay, replay-download)
          // req.body is passed so replay-download can receive client-provided replayData;
          // other two-param routes simply ignore the extra argument
          response = await (route.handler as (a: string, b: string, body?: Record<string, unknown>) => Promise<HandlerResponse<unknown>>)(match[1], match[2], req.body);
        } else {
          response = await (route.handler as (a: string) => Promise<HandlerResponse<unknown>>)(match![1]);
        }
      }

      // Set headers from handler
      Object.entries(response.headers).forEach(([key, value]) => {
        res.set(key, value);
      });

      res.status(200).json(response.data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch from API', details: (error as Error).message });
    }
  });
};

export {
  proxy,
  checkApmStatus,
  getFirestoreClient,
  checkReplayAvailability,
  handleMatch,
  handleReplayDownload,
  routes,
};

// Also export test helpers if in test mode
export { __setPlayerService, __resetPlayerService };
