import pino from 'pino';
import { normalizeCivDisplayName } from './civNames.js';
import { normalizeMapDisplayName } from './mapNames.js';
import type { IdNameMap } from './types.js';

const log = pino({ name: 'match-collector' });

interface VersionEntry {
  key: string;
  startDate: string | null;
  startUnix: number;
}

interface RlMappings {
  versions?: { aoe2?: Array<{ key: string; startDate: string | null }> };
  civs?: { aoe2?: Record<string, Record<string, number>> };
  maps?: { aoe2?: Record<string, Record<string, number>> };
}

const LEGACY_VERSIONS: VersionEntry[] = [
  { key: '1', startDate: null, startUnix: 0 },
  { key: '3', startDate: '2022-02-22T00:00:00Z', startUnix: Math.floor(Date.UTC(2022, 1, 22) / 1000) },
  { key: '4', startDate: '2023-10-30T00:00:00Z', startUnix: Math.floor(Date.UTC(2023, 9, 30) / 1000) },
  { key: '5', startDate: '2025-12-02T00:00:00Z', startUnix: Math.floor(Date.UTC(2025, 11, 2) / 1000) },
];

let mappingsPromise: Promise<RlMappings> | null = null;
let civMaps: Record<string, IdNameMap> | null = null;
let versionEntries: VersionEntry[] = [];
let mapMap: IdNameMap | null = null;

export async function loadMappings(): Promise<RlMappings> {
  if (!mappingsPromise) {
    mappingsPromise = (async () => {
      const response = await fetch('https://storage.googleapis.com/aoe2.site/data/rl_api_mappings.json');
      if (!response.ok) {
        mappingsPromise = null;
        throw new Error(`Failed to load mappings: HTTP ${response.status}`);
      }
      const data = await response.json() as RlMappings;
      log.info('Loaded civ/map mappings from CDN');
      return data;
    })();
  }
  return mappingsPromise;
}

function parseVersionEntries(mappings: RlMappings): VersionEntry[] {
  const raw = mappings.versions?.aoe2;
  if (raw && raw.length > 0) {
    return raw
      .map(v => ({
        key: v.key,
        startDate: v.startDate,
        startUnix: v.startDate ? Math.floor(new Date(v.startDate).getTime() / 1000) : 0,
      }))
      .sort((a, b) => a.startUnix - b.startUnix);
  }
  return LEGACY_VERSIONS;
}

function getMappingVersion(matchTimeUnix: number): string {
  for (let i = versionEntries.length - 1; i >= 0; i--) {
    if (matchTimeUnix >= versionEntries[i].startUnix) {
      return versionEntries[i].key;
    }
  }
  return versionEntries[0]?.key || '1';
}

async function buildCivMaps(): Promise<Record<string, IdNameMap>> {
  if (civMaps) return civMaps;
  const mappings = await loadMappings();
  versionEntries = parseVersionEntries(mappings);

  const maps: Record<string, IdNameMap> = {};
  for (const entry of versionEntries) {
    maps[entry.key] = {};
  }

  if (mappings?.civs?.aoe2) {
    for (const [civName, versions] of Object.entries(mappings.civs.aoe2)) {
      if (typeof versions !== 'object' || versions === null) continue;
      const v = versions as Record<string, number>;
      for (const entry of versionEntries) {
        const id = v[entry.key];
        if (id !== undefined && id >= 0) {
          maps[entry.key][id.toString()] = normalizeCivDisplayName(civName) || civName;
        }
      }
    }
  }

  civMaps = maps;
  return civMaps;
}

export async function getCivMap(): Promise<IdNameMap> {
  const maps = await buildCivMaps();
  return maps[versionEntries[versionEntries.length - 1].key];
}

export async function getCivMapForDate(matchTimeUnix: number): Promise<IdNameMap> {
  const maps = await buildCivMaps();
  return maps[getMappingVersion(matchTimeUnix)];
}

/** Synchronous version — only call after getCivMap() or getCivMapForDate() has resolved once */
export function getCivMapForDateSync(matchTimeUnix: number): IdNameMap {
  if (!civMaps) throw new Error('Call getCivMap() first to initialize maps');
  return civMaps[getMappingVersion(matchTimeUnix)];
}

export async function getMapMap(): Promise<IdNameMap> {
  if (!mapMap) {
    const mappings = await loadMappings();
    if (!mappings?.maps?.aoe2) return {};
    mapMap = {};
    for (const [mapName, versions] of Object.entries(mappings.maps.aoe2)) {
      if (typeof versions === 'object' && versions !== null) {
        for (const mapId of Object.values(versions)) {
          if (mapId !== undefined && mapId >= 0) {
            mapMap[mapId.toString()] = normalizeMapDisplayName(mapName);
          }
        }
      }
    }
  }
  return mapMap;
}
