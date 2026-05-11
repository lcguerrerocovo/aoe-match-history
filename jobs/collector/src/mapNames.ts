const DISPLAY_OVERRIDES: Record<string, string> = {
  africanclearing: 'African Clearing',
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
  realworldblacksea: 'Real World Black Sea',
  realworldhornofafrica: 'Real World Horn of Africa',
  ringfortress: 'Ring Fortress',
  riverdivide: 'River Divide',
  sacredsprings: 'Sacred Springs',
  saltmarsh: 'Salt Marsh',
  scandanavia: 'Scandinavia',
  scandinavia: 'Scandinavia',
  seizethemountain: 'Seize the Mountain',
  sherwoodforest: 'Sherwood Forest',
  specialmapborderstones: 'Border Stones',
  specialmapenemyislands: 'Enemy Islands',
  specialmapfrontline: 'Front Line',
  specialmapinnercircle: 'Inner Circle',
  specialmapjungleislands: 'Jungle Islands',
  specialmapjunglelanes: 'Jungle Lanes',
  specialmapopenplains: 'Open Plains',
  specialmapringofwater: 'Ring of Water',
  specialmapsnakepit: 'Snake Pit',
  specialmaptheeye: 'The Eye',
  specialmapyinyang: 'Yin Yang',
  teamglaciers: 'Team Glaciers',
  teamislands: 'Team Islands',
  themajapahitempire: 'The Majapahit Empire',
  theunknown: 'The Unknown',
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

export function resolveCanonicalMapName(
  mapMap: Record<string, string>,
  mapId: string | number | null | undefined,
): string | null {
  const resolvedMapId = parseMapId(mapId);
  if (resolvedMapId === null) return null;

  const mappedName = mapMap[resolvedMapId.toString()];
  return mappedName ? normalizeMapDisplayName(mappedName) : null;
}
