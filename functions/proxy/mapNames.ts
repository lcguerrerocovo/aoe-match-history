import type { IdNameMap, ResolveMapInput, ResolvedMap } from './types';

const DISPLAY_OVERRIDES: Record<string, string> = {
  africanclearing: 'African Clearing',
  alpinecraft: 'Alpine Craft',
  alpinelakes: 'Alpine Lakes',
  amazontunnel: 'Amazon Tunnel',
  battleontheice: 'Battle on the Ice',
  blackforest: 'Black Forest',
  bogislands: 'Bog Islands',
  cityoflakes: 'City of Lakes',
  coastalforest: 'Coastal Forest',
  craterlake: 'Crater Lake',
  fallofaxum: 'Fall of Axum',
  fallofrome: 'Fall of Rome',
  fourlakes: 'Four Lakes',
  frigidlake: 'Frigid Lake',
  ghostlake: 'Ghost Lake',
  goldenpit: 'Golden Pit',
  goldenstream: 'Golden Stream',
  goldenswamp: 'Golden Swamp',
  goldrush: 'Gold Rush',
  hollowwoodlands: 'Hollow Woodlands',
  landmadness: 'Land Madness',
  landnomad: 'Land Nomad',
  mangrovejungle: 'Mangrove Jungle',
  megarandom: 'Mega Random',
  mountaindunes: 'Mountain Dunes',
  mountainpass: 'Mountain Pass',
  mountainrange: 'Mountain Range',
  mountainridge: 'Mountain Ridge',
  niledelta: 'Nile Delta',
  northernisles: 'Northern Isles',
  pacificislands: 'Pacific Islands',
  paradiseisland: 'Paradise Island',
  realworldamazon: 'Real World Amazon',
  realworldantarctica: 'Real World Antarctica',
  realworldaralsea: 'Real World Aral Sea',
  realworldaustralia: 'Real World Australia',
  realworldblacksea: 'Real World Black Sea',
  realworldbohemia: 'Real World Bohemia',
  realworldbyzantium: 'Real World Byzantium',
  realworldcaribbean: 'Real World Caribbean',
  realworldcaucasus: 'Real World Caucasus',
  realworldchina: 'Real World China',
  realworldearth: 'Real World Earth',
  realworldengland: 'Real World England',
  realworldfrance: 'Real World France',
  realworldhornofafrica: 'Real World Horn of Africa',
  realworldindia: 'Real World India',
  realworldindochina: 'Real World Indochina',
  realworldindonesia: 'Real World Indonesia',
  realworlditaly: 'Real World Italy',
  realworldjutland: 'Real World Jutland',
  realworldmadagascar: 'Real World Madagascar',
  realworldmalacca: 'Real World Malacca',
  realworldmideast: 'Real World Mideast',
  realworldnippon: 'Real World Nippon',
  realworldphilippines: 'Real World Philippines',
  realworldsiberia: 'Real World Siberia',
  realworldspain: 'Real World Spain',
  realworldtexas: 'Real World Texas',
  realworldwestafrica: 'Real World West Africa',
  ringfortress: 'Ring Fortress',
  riverdivide: 'River Divide',
  runestones: 'Runestones',
  sacredsprings: 'Sacred Springs',
  saltmarsh: 'Salt Marsh',
  scandanavia: 'Scandinavia',
  scandinavia: 'Scandinavia',
  seizethemountain: 'Seize the Mountain',
  sherwoodforest: 'Sherwood Forest',
  snakeforestspecial: 'Snake Forest Special',
  specialmaparchipelago: 'Archipelago',
  specialmapborderstones: 'Border Stones',
  specialmapcanyons: 'Canyons',
  specialmapenemyislands: 'Enemy Islands',
  specialmapfarout: 'Far Out',
  specialmapfrontline: 'Front Line',
  specialmapholyline: 'Holy Line',
  specialmapinnercircle: 'Inner Circle',
  specialmapjungleislands: 'Jungle Islands',
  specialmapjunglelanes: 'Jungle Lanes',
  specialmapmotherland: 'Motherland',
  specialmapopenplains: 'Open Plains',
  specialmapringofwater: 'Ring of Water',
  specialmapsnakepit: 'Snake Pit',
  specialmaptheeye: 'The Eye',
  specialmapyinyang: 'Yin Yang',
  sprawlingstreamsspecial: 'Sprawling Streams Special',
  swirlingriverspecial: 'Swirling River Special',
  teamglaciers: 'Team Glaciers',
  teamislands: 'Team Islands',
  themajapahitempire: 'The Majapahit Empire',
  theunknown: 'The Unknown',
  twinforestsspecial: 'Twin Forests Special',
  volcanicisland: 'Volcanic Island',
  waternomad: 'Water Nomad',
  wolfhill: 'Wolf Hill',
};

function cleanRawMapName(name: string): string {
  return name
    .trim()
    .split(/[\\/]/)
    .pop()!
    .replace(/\.rms2?$/i, '')
    .replace(/^(rm|sm|rwm|qs)[_-]/i, '')
    .trim();
}

function mapNameKey(name: string): string {
  return cleanRawMapName(name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function titleCaseMapName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase())
    .replace(/\bOf\b/g, 'of')
    .replace(/\bThe\b/g, 'the');
}

export function normalizeMapDisplayName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return 'Unknown';
  }

  const cleanName = cleanRawMapName(name);
  if (!cleanName) return 'Unknown';

  const override = DISPLAY_OVERRIDES[mapNameKey(cleanName)];
  if (override) return override;

  const spacedName = cleanName
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

  return titleCaseMapName(spacedName);
}

function parseMapId(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getCandidateMapId({
  options = null,
  settings = null,
  mapId = null,
}: Pick<ResolveMapInput, 'options' | 'settings' | 'mapId'>): number | null {
  return parseMapId(options?.['10'] ?? settings?.['10'] ?? mapId);
}

export function resolveCanonicalMapName(mapMap: IdNameMap, mapId: string | number | null | undefined): string | null {
  const resolvedMapId = parseMapId(mapId);
  if (resolvedMapId === null) return null;

  const mappedName = mapMap[resolvedMapId.toString()];
  return mappedName ? normalizeMapDisplayName(mappedName) : null;
}

export function resolveMapFromMappings(mapMap: IdNameMap, input: ResolveMapInput): ResolvedMap {
  const id = getCandidateMapId(input);
  const name = resolveCanonicalMapName(mapMap, id) || 'Unknown';
  return { id, name };
}

export function getMapIdsForDisplayName(mapMap: IdNameMap, displayName: string): number[] {
  const normalized = normalizeMapDisplayName(displayName);
  if (normalized === 'Unknown') return [];

  return Object.entries(mapMap)
    .filter(([, mappedName]) => normalizeMapDisplayName(mappedName) === normalized)
    .map(([id]) => parseInt(id, 10))
    .filter(id => Number.isFinite(id));
}

export function resolveMapNameFromRow(mapMap: IdNameMap, mapId: number | string | null | undefined): string {
  return resolveCanonicalMapName(mapMap, mapId) || 'Unknown';
}

export function normalizeKnownMapOptions(
  rows: Array<{ map_id: number | string | null; count: string }>,
  mapMap: IdNameMap,
): { name: string; count: number }[] {
  const mapsByName = new Map<string, number>();

  for (const row of rows) {
    const name = resolveCanonicalMapName(mapMap, row.map_id);
    if (!name) continue;

    mapsByName.set(name, (mapsByName.get(name) || 0) + parseInt(row.count, 10));
  }

  return Array.from(mapsByName.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
