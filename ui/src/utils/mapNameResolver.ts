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

/**
 * Convert API map name to various possible CDN filename patterns
 */
export function resolveMapFilename(apiName: string): string[] {
  const patterns: string[] = [];
  
  // Convert camelCase to different formats
  const nameLower = apiName.toLowerCase();
  const nameUnderscore = apiName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  const nameHyphen = apiName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
  
  // Common CDN patterns
  patterns.push(
    // Standard rm_ pattern (most common)
    `rm_${nameUnderscore}.png`,
    `rm_${nameHyphen}.png`,
    `rm_${nameLower}.png`,
    
    // Without rm_ prefix
    `${nameUnderscore}.png`,
    `${nameHyphen}.png`,
    `${nameLower}.png`,
    
    // Special cases for certain map types
    `sm_${nameUnderscore}.png`, // Small maps
    `sm_${nameHyphen}.png`,
    `sm_${nameLower}.png`,
    
    // Real world maps
    `rwm_${nameUnderscore}.png`,
    `rwm_${nameHyphen}.png`,
    `rwm_${nameLower}.png`,
    
    // Quick start maps
    `qs_${nameUnderscore}.png`,
    `qs_${nameHyphen}.png`,
    `qs_${nameLower}.png`
  );
  
  // Handle special cases and common variations
  const specialCases: Record<string, string[]> = {
    'BlackForest': ['rm_black-forest.png', 'rm_black_forest.png', 'black-forest.png'],
    'GoldRush': ['rm_gold-rush.png', 'rm_gold_rush.png', 'gold-rush.png'],
    'CraterLake': ['rm_crater-lake.png', 'rm_crater_lake.png', 'crater-lake.png'],
    'TeamIslands': ['rm_team-islands.png', 'rm_team_islands.png', 'team-islands.png'],
    'SaltMarsh': ['rm_salt-marsh.png', 'rm_salt_marsh.png', 'salt-marsh.png'],
    'GhostLake': ['rm_ghost-lake.png', 'rm_ghost_lake.png', 'ghost-lake.png'],
    'Scandanavia': ['rm_scandinavia.png', 'rm_scandanavia.png', 'scandinavia.png'], // Note: API has typo
    'Nomad': ['rm_nomad.png', 'nomad.png', 'qs_nomad.png'],
    'Arena': ['rm_arena.png', 'arena.png', 'qs_arena.png'],
    'Arabia': ['rm_arabia.png', 'arabia.png', 'qs_arabia.png'],
    'AmazonTunnel': ['rm_amazon_tunnels.png', 'rm_amazon_tunnel.png', 'amazon_tunnels.png', 'amazon_tunnel.png'], // Handle plural filename
  };
  
  if (specialCases[apiName]) {
    patterns.unshift(...specialCases[apiName]);
  }
  
  // Remove duplicates while preserving order
  return [...new Set(patterns)];
}

/**
 * Get the most likely filename for a map (prioritizes common patterns)
 */
export function getMostLikelyMapFilename(apiName: string): string {
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