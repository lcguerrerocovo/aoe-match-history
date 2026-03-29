import { log, getFirestoreClient } from './config';
import type { HandlerResponse } from './types';

interface AnalysisStatusRequest {
  matchIds: string[];
}

interface AnalysisStatusResponse {
  analyzed: string[];
}

export async function handleAnalysisStatus(body: AnalysisStatusRequest): Promise<HandlerResponse<AnalysisStatusResponse>> {
  const noCache = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  const matchIds = body?.matchIds || [];
  if (!matchIds.length) {
    return { data: { analyzed: [] }, headers: noCache };
  }

  const db = getFirestoreClient();
  if (!db) {
    return { data: { analyzed: [] }, headers: noCache };
  }

  try {
    const refs = matchIds.map(id => db.collection('matches').doc(String(id)));
    const docs = await db.getAll(...refs);

    const analyzed: string[] = [];
    for (const doc of docs) {
      if (doc.exists) {
        const data = doc.data();
        if (data?.apm) {
          analyzed.push(doc.id);
        }
      }
    }

    log.debug({ requested: matchIds.length, analyzed: analyzed.length }, 'Analysis status check');
    return { data: { analyzed }, headers: noCache };
  } catch (err) {
    log.error({ err: (err as Error).message }, 'Analysis status check failed');
    return { data: { analyzed: [] }, headers: noCache };
  }
}
