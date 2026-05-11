import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeMapDisplayName, resolveCanonicalMapName } from '../dist/mapNames.js';

test('normalizes mapping keys and raw scenario filenames for display', () => {
  assert.equal(normalizeMapDisplayName('BlackForest'), 'Black Forest');
  assert.equal(normalizeMapDisplayName('AfricanClearing'), 'African Clearing');
  assert.equal(normalizeMapDisplayName('rm_goldenpit.rms2'), 'Golden Pit');
  assert.equal(normalizeMapDisplayName('Gold_Rush.rms'), 'Gold Rush');
  assert.equal(normalizeMapDisplayName('Scandanavia'), 'Scandinavia');
});

test('collector resolves only canonical map IDs from mappings', () => {
  const mapMap = {
    '1': 'Arabia',
    '2': 'BlackForest',
  };

  assert.equal(resolveCanonicalMapName(mapMap, 2), 'Black Forest');
  assert.equal(resolveCanonicalMapName(mapMap, 999), null);
  assert.equal(resolveCanonicalMapName(mapMap, null), null);
});
