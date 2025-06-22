interface RlMappings {
  civs: {
    aoe2: Record<string, Record<string, number>>;
  };
  maps: {
    aoe2: Record<string, Record<string, number>>;
  };
}

let rlMappings: RlMappings | null = null;
let civMap: Record<string, string> | null = null;
let mapMap: Record<string, string> | null = null;

async function loadRlMappings(): Promise<RlMappings> {
  if (!rlMappings) {
    const response = await fetch('/data/rl_api_mappings.json');
    rlMappings = await response.json();
  }
  return rlMappings!;
}

export async function getCivMap(): Promise<Record<string, string>> {
  if (!civMap) {
    const mappings = await loadRlMappings();
    if (!mappings?.civs?.aoe2) return {};
    civMap = {};
    for (const [civName, versions] of Object.entries(mappings.civs.aoe2)) {
      if (typeof versions === 'object' && versions !== null) {
        // Get the latest version number
        const versionNumbers = Object.keys(versions).map(Number);
        const latestVersion = Math.max(...versionNumbers);
        // Use the latest version's ID as the key
        const civId = versions[latestVersion.toString()];
        if (civId !== undefined) {
          civMap[civId.toString()] = civName;
        }
      }
    }
  }
  return civMap;
}

export async function getMapMap(): Promise<Record<string, string>> {
  if (!mapMap) {
    const mappings = await loadRlMappings();
    if (!mappings?.maps?.aoe2) return {};
    mapMap = {};
    for (const [mapName, versions] of Object.entries(mappings.maps.aoe2)) {
      if (typeof versions === 'object' && versions !== null) {
        // Get the latest version number
        const versionNumbers = Object.keys(versions).map(Number);
        const latestVersion = Math.max(...versionNumbers);
        // Use the latest version's ID as the key
        const mapId = versions[latestVersion.toString()];
        if (mapId !== undefined) {
          mapMap[mapId.toString()] = mapName;
        }
      }
    }
  }
  return mapMap;
}

// Leaderboard mapping and calculations
const LEADERBOARD_NAMES: { [key: number]: string } = {
  0: 'Unranked',
  1: 'DM 1v1',
  2: 'DM Team',
  3: 'RM 1v1',
  4: 'RM Team',
  13: 'EW 1v1',
  14: 'EW Team',
  15: 'RM 1v1 (UNR)',
  16: 'RM Team (UNR)',
  17: 'EW 1v1 (UNR)',
  18: 'EW Team (UNR)',
  19: 'RM 1v1 (QM)',
  20: 'RM Team (QM)',
  21: 'EW 1v1 (QM)',
  22: 'EW Team (QM)'
};

export function getLeaderboardName(id: number): string {
  return LEADERBOARD_NAMES[id] ?? 'UNR';
}

export function calculateWinRate(wins: number, losses: number): string {
  const totalGames = wins + losses;
  if (totalGames === 0) return '0.00';
  return (wins / totalGames * 100).toFixed(2);
}

export function calculatePercentile(rank: number, rankTotal: number): string {
  if (rank === -1 || rankTotal === 0) return '0.0';
  return (100 - (rank / rankTotal * 100)).toFixed(1);
} 