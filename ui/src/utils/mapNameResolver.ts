/**
 * Smart Map Name Resolver
 * 
 * Converts API map names to various CDN filename patterns used by AoE2 assets.
 * Handles different naming conventions automatically without manual mapping.
 */

export interface MapNameMapping {
  apiName: string;
  possibleFilenames: string[];
}

const DISPLAY_OVERRIDES: Record<string, string> = {
  africanclearing: 'African Clearing',
  alpinecraft: 'Alpine Craft',
  alpinelakes: 'Alpine Lakes',
  amazontunnel: 'Amazon Tunnel',
  battleontheice: 'Battle on the Ice',
  blackforest: 'Black Forest',
  borderdispute: 'Border Dispute',
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

/**
 * Convert API map name to various possible CDN filename patterns
 */
export function resolveMapFilename(apiName: string): string[] {
  const patterns: string[] = [];

  const cleanName = normalizeMapDisplayName(apiName);
  const nameUnderscore = cleanName.replace(/\s+/g, '_').toLowerCase();
  const nameHyphen = cleanName.replace(/\s+/g, '-').toLowerCase();
  const nameCompact = cleanName.replace(/\s+/g, '').toLowerCase();
  
  // Common CDN patterns
  patterns.push(
    // Standard rm_ pattern (most common)
    `rm_${nameUnderscore}.png`,
    `rm_${nameHyphen}.png`,
    `rm_${nameCompact}.png`,
    
    // Without rm_ prefix
    `${nameUnderscore}.png`,
    `${nameHyphen}.png`,
    `${nameCompact}.png`,
    
    // Special cases for certain map types
    `sm_${nameUnderscore}.png`, // Small maps
    `sm_${nameHyphen}.png`,
    `sm_${nameCompact}.png`,
    
    // Real world maps
    `rwm_${nameUnderscore}.png`,
    `rwm_${nameHyphen}.png`,
    `rwm_${nameCompact}.png`,
    
    // Quick start maps
    `qs_${nameUnderscore}.png`,
    `qs_${nameHyphen}.png`,
    `qs_${nameCompact}.png`
  );
  
  // Handle special cases and common variations
  const specialCases: Record<string, string[]> = {
    blackforest: ['rm_black-forest.png', 'rm_black_forest.png', 'black-forest.png'],
    goldrush: ['rm_gold-rush.png', 'rm_gold_rush.png', 'gold-rush.png'],
    craterlake: ['rm_crater-lake.png', 'rm_crater_lake.png', 'crater-lake.png'],
    teamislands: ['rm_team-islands.png', 'rm_team_islands.png', 'team-islands.png'],
    saltmarsh: ['rm_salt-marsh.png', 'rm_salt_marsh.png', 'salt-marsh.png'],
    ghostlake: ['rm_ghost-lake.png', 'rm_ghost_lake.png', 'ghost-lake.png'],
    hillfort: ['rm_hill-fort.png', 'rm_hill_fort.png', 'hill-fort.png'],
    mountainridge: ['rm_mountain-ridge.png', 'rm_mountain_ridge.png', 'mountain-ridge.png'],
    fourlakes: ['rm_four-lakes.png', 'rm_four_lakes.png', 'four-lakes.png'],
    scandinavia: ['rm_scandinavia.png', 'rm_scandanavia.png', 'scandinavia.png'],
    nomad: ['rm_nomad.png', 'nomad.png', 'qs_nomad.png'],
    arena: ['rm_arena.png', 'arena.png', 'qs_arena.png'],
    arabia: ['rm_arabia.png', 'arabia.png', 'qs_arabia.png'],
    amazontunnel: ['rm_amazon_tunnels.png', 'rm_amazon_tunnel.png', 'amazon_tunnels.png', 'amazon_tunnel.png'],
    megarandom: ['rm_megarandom.png', 'rm_mega_random.png', 'rm_mega-random.png', 'megarandom.png'],
    goldenpit: ['rm_golden-pit.png', 'rm_goldenpit.png', 'rm_golden_pit.png', 'golden-pit.png', 'goldenpit.png'],
  };
  
  const specialCase = specialCases[mapNameKey(cleanName)];
  if (specialCase) {
    patterns.unshift(...specialCase);
  }
  
  // Remove duplicates while preserving order
  return [...new Set(patterns)];
}

/**
 * Get the most likely filename for a map (prioritizes common patterns)
 */
export function getMostLikelyMapFilename(apiName: string): string {
  // Safety check: return generic map for empty/invalid names
  if (!apiName || typeof apiName !== 'string' || apiName.trim().length === 0) {
    return 'cm_generic.png';
  }

  if (apiName.trim().toLowerCase() === 'unknown') {
    return 'cm_generic.png';
  }
  
  const patterns = resolveMapFilename(apiName);
  
  // Prioritize rm_ patterns as they're most common
  const rmPattern = patterns.find(p => p.startsWith('rm_'));
  if (rmPattern) return rmPattern;
  
  // Fall back to first pattern
  return patterns[0] || `${apiName.toLowerCase()}.png`;
}

/**
 * Get all possible filenames for a map
 */
export function getAllPossibleMapFilenames(apiName: string): string[] {
  return resolveMapFilename(apiName);
}

/**
 * Check if a filename matches a map name (useful for validation)
 */
export function isMapFilename(filename: string, apiName: string): boolean {
  const patterns = resolveMapFilename(apiName);
  return patterns.some(pattern => pattern === filename);
}
