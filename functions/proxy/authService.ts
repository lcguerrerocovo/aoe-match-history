import RelicAuthClient from './relicAuth';
import RelicPlayerService from './relicPlayerService';
import SessionManager from './sessionManager';
import { log, RELIC_AUTH_STEAM_USER, RELIC_AUTH_STEAM_PASS } from './config';
import type { AuthResult, SessionData } from './types';

// Global instances
let authClient: RelicAuthClient | null = null;
let playerService: RelicPlayerService | null = null;
let sessionManager: SessionManager | null = null;

async function authenticateWithFallback(
    authClient: RelicAuthClient,
    existingTicket?: string,
    steamData?: { steamId64: string; steamUserName: string }
): Promise<AuthResult> {
    if (!RELIC_AUTH_STEAM_USER || !RELIC_AUTH_STEAM_PASS) {
        throw new Error('Steam credentials not configured');
    }

    if (existingTicket && steamData) {
        try {
            return await authClient.authenticate(RELIC_AUTH_STEAM_USER, RELIC_AUTH_STEAM_PASS, existingTicket, steamData);
        } catch {
            log.warn('Re-auth with existing ticket failed, doing full authentication');
        }
    }
    return authClient.authenticate(RELIC_AUTH_STEAM_USER, RELIC_AUTH_STEAM_PASS);
}

export async function ensureAuthenticated(): Promise<AuthResult | SessionData> {
    const sessionManager = new SessionManager();
    const session = await sessionManager.getSession();

    if (!session) {
        log.info('No valid session found, authenticating...');
        const authClient = new RelicAuthClient();
        const authResult = await authenticateWithFallback(authClient);
        await sessionManager.saveSession(authResult);
        log.info('Session saved and ready for use');
        return authResult;
    }

    return session;
}

export async function getAuthenticatedPlayerService(): Promise<RelicPlayerService> {
  if (!sessionManager) {
    sessionManager = new SessionManager();
  }

  if (!(await sessionManager.isSessionValid())) {
    const lastSession = await sessionManager.getSession();

    log.info('No valid session found, authenticating...');
    authClient = new RelicAuthClient();

    const steamData = lastSession?.base64Ticket
      ? { steamId64: lastSession.steamId64, steamUserName: lastSession.steamUserName }
      : undefined;
    const authResult = await authenticateWithFallback(authClient, lastSession?.base64Ticket, steamData);

    await sessionManager.saveSession(authResult);
    log.info('Session saved and ready for use');
  }

  if (!playerService) {
    playerService = new RelicPlayerService();
  }

  return playerService;
}

export async function withAuthRetry<T extends { success: boolean; authFailure?: boolean }>(
  fn: () => Promise<T>
): Promise<T> {
  await ensureAuthenticated();
  const result = await fn();

  if (!result.success && result.authFailure) {
    await ensureAuthenticated();
    return fn();
  }

  return result;
}

// Test-only helpers
export function __setPlayerService(svc: RelicPlayerService): void { playerService = svc; }
export function __resetPlayerService(): void { playerService = null; }
