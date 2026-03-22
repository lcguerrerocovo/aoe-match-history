import pino from 'pino';
import type { IdNameMap } from './types.js';

const log = pino({ name: 'match-collector' });

interface RlMappings {
  civs?: { aoe2?: Record<string, Record<string, number>> };
  maps?: { aoe2?: Record<string, Record<string, number>> };
}

let mappingsPromise: Promise<RlMappings> | null = null;
let civMap: IdNameMap | null = null;
let mapMap: IdNameMap | null = null;

export async function loadMappings(): Promise<RlMappings> {
  if (!mappingsPromise) {
    mappingsPromise = (async () => {
      const response = await fetch('https://aoe2.site/data/rl_api_mappings.json');
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

function buildIdMap(entries: Record<string, Record<string, number>>): IdNameMap {
  const result: IdNameMap = {};
  for (const [name, versions] of Object.entries(entries)) {
    if (typeof versions === 'object' && versions !== null) {
      const versionNumbers = Object.keys(versions).map(Number);
      const latestVersion = Math.max(...versionNumbers);
      const id = versions[latestVersion.toString()];
      if (id !== undefined) {
        result[id.toString()] = name;
      }
    }
  }
  return result;
}

export async function getCivMap(): Promise<IdNameMap> {
  if (!civMap) {
    const mappings = await loadMappings();
    civMap = mappings?.civs?.aoe2 ? buildIdMap(mappings.civs.aoe2) : {};
  }
  return civMap;
}

export async function getMapMap(): Promise<IdNameMap> {
  if (!mapMap) {
    const mappings = await loadMappings();
    mapMap = mappings?.maps?.aoe2 ? buildIdMap(mappings.maps.aoe2) : {};
  }
  return mapMap;
}
