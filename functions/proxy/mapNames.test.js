const {
  getMapIdsForDisplayName,
  normalizeKnownMapOptions,
  normalizeMapDisplayName,
  resolveCanonicalMapName,
  resolveMapFromMappings,
} = require('./mapNames');
const fs = require('fs');
const path = require('path');

describe('mapNames', () => {
  const mapMap = {
    '1': 'Arabia',
    '2': 'Arena',
    '3': 'BlackForest',
    '4': 'Goldenpit',
    '5': 'Scandanavia',
    '10979': 'Glade',
    '11012': 'BorderDispute',
  };

  it('normalizes mapping keys and raw scenario filenames for display', () => {
    expect(normalizeMapDisplayName('BlackForest')).toBe('Black Forest');
    expect(normalizeMapDisplayName('AfricanClearing')).toBe('African Clearing');
    expect(normalizeMapDisplayName('BorderDispute')).toBe('Border Dispute');
    expect(normalizeMapDisplayName('rm_goldenpit.rms2')).toBe('Golden Pit');
    expect(normalizeMapDisplayName('Gold_Rush.rms')).toBe('Gold Rush');
    expect(normalizeMapDisplayName('Scandanavia')).toBe('Scandinavia');
  });

  it('resolves only canonical map IDs from the mapping table', () => {
    expect(resolveCanonicalMapName(mapMap, 3)).toBe('Black Forest');
    expect(resolveCanonicalMapName(mapMap, 10979)).toBe('Glade');
    expect(resolveCanonicalMapName(mapMap, 11012)).toBe('Border Dispute');
    expect(resolveCanonicalMapName(mapMap, 999)).toBeNull();
    expect(resolveMapFromMappings(mapMap, { options: { '10': '999' }, rawName: 'CustomMap.rms' })).toEqual({
      id: 999,
      name: 'Unknown',
    });
  });

  it('finds map IDs by canonical display name', () => {
    expect(getMapIdsForDisplayName(mapMap, 'Black Forest')).toEqual([3]);
    expect(getMapIdsForDisplayName(mapMap, 'Scandinavia')).toEqual([5]);
  });

  it('merges filter option counts by canonical mapped display name', () => {
    expect(normalizeKnownMapOptions([
      { map_id: 3, count: '2' },
      { map_id: 999, count: '10' },
      { map_id: 4, count: '5' },
    ], mapMap)).toEqual([
      { name: 'Golden Pit', count: 5 },
      { name: 'Black Forest', count: 2 },
    ]);
  });

  it('includes current map IDs missing from external reference data', () => {
    const mappingsPath = path.join(__dirname, '../../data/rl_api_mappings.json');
    const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));

    expect(mappings.maps.aoe2.Glade['5']).toBe(10979);
    expect(mappings.maps.aoe2.BorderDispute['5']).toBe(11012);
  });
});
