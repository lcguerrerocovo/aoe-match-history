import pino from 'pino';

const log = pino({ name: 'stats-mappings' });

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

export interface Patch {
  version: number;
  date: string;
  title: string;
  type: string;
}

export type IdNameMap = Record<number, string>;

const MAPPINGS_URL = 'https://storage.googleapis.com/aoe2.site/data/rl_api_mappings.json';
const PATCHES_URL = 'https://storage.googleapis.com/aoe2.site/data/patches.json';

export async function loadPatches(): Promise<Patch[]> {
  const resp = await fetch(PATCHES_URL);
  if (!resp.ok) throw new Error(`Failed to load patches: HTTP ${resp.status}`);
  const patches = await resp.json() as Patch[];
  log.info({ count: patches.length }, 'Loaded patches from CDN');
  return patches;
}

export function findMajorPatches(patches: Patch[]): { current: Patch; previous: Patch } {
  const majors = patches
    .filter(p => p.type === 'major')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (majors.length < 2) {
    throw new Error(`Need at least 2 major patches, found ${majors.length}`);
  }

  return { current: majors[0], previous: majors[1] };
}

async function loadMappings(): Promise<RlMappings> {
  const resp = await fetch(MAPPINGS_URL);
  if (!resp.ok) throw new Error(`Failed to load mappings: HTTP ${resp.status}`);
  const data = await resp.json() as RlMappings;
  log.info('Loaded civ/map mappings from CDN');
  return data;
}

function parseVersionEntries(mappings: RlMappings): VersionEntry[] {
  const raw = mappings.versions?.aoe2;
  if (!raw || raw.length === 0) {
    throw new Error('No version entries in mappings');
  }
  return raw
    .map(v => ({
      key: v.key,
      startDate: v.startDate,
      startUnix: v.startDate ? Math.floor(new Date(v.startDate).getTime() / 1000) : 0,
    }))
    .sort((a, b) => a.startUnix - b.startUnix);
}

function getVersionForDate(dateStr: string, versions: VersionEntry[]): string {
  const unix = Math.floor(new Date(dateStr).getTime() / 1000);
  for (let i = versions.length - 1; i >= 0; i--) {
    if (unix >= versions[i].startUnix) {
      return versions[i].key;
    }
  }
  return versions[0].key;
}

function invertMapping(
  section: Record<string, Record<string, number>>,
  versionKey: string,
): IdNameMap {
  const result: IdNameMap = {};
  for (const [name, versionIds] of Object.entries(section)) {
    const id = versionIds[versionKey];
    if (id !== undefined && id >= 0) {
      result[id] = name;
    }
  }
  return result;
}

export interface ResolvedMappings {
  civs: { current: IdNameMap; previous: IdNameMap };
  maps: { current: IdNameMap; previous: IdNameMap };
  versions: { current: string; previous: string };
}

export async function loadResolvedMappings(
  currentPatchDate: string,
  previousPatchDate: string,
): Promise<ResolvedMappings> {
  const mappings = await loadMappings();
  const versions = parseVersionEntries(mappings);

  const currentVersion = getVersionForDate(currentPatchDate, versions);
  const previousVersion = getVersionForDate(previousPatchDate, versions);

  log.info({ currentVersion, previousVersion }, 'Resolved mapping versions for patch periods');

  const civSection = mappings.civs?.aoe2 ?? {};
  const mapSection = mappings.maps?.aoe2 ?? {};

  return {
    civs: {
      current: invertMapping(civSection, currentVersion),
      previous: invertMapping(civSection, previousVersion),
    },
    maps: {
      current: invertMapping(mapSection, currentVersion),
      previous: invertMapping(mapSection, previousVersion),
    },
    versions: {
      current: currentVersion,
      previous: previousVersion,
    },
  };
}
