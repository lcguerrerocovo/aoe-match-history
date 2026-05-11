import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeMapDisplayName, resolveCanonicalMapName } from '../dist/mapNames.js';

test('normalizes mapping keys and raw scenario filenames for display', () => {
  assert.equal(normalizeMapDisplayName('BlackForest'), 'Black Forest');
  assert.equal(normalizeMapDisplayName('AfricanClearing'), 'African Clearing');
  assert.equal(normalizeMapDisplayName('BorderDispute'), 'Border Dispute');
  assert.equal(normalizeMapDisplayName('rm_goldenpit.rms2'), 'Golden Pit');
  assert.equal(normalizeMapDisplayName('Gold_Rush.rms'), 'Gold Rush');
  assert.equal(normalizeMapDisplayName('Scandanavia'), 'Scandinavia');
});

test('collector resolves only canonical map IDs from mappings', () => {
  const mapMap = {
    '1': 'Arabia',
    '2': 'BlackForest',
    '10979': 'Glade',
    '11012': 'BorderDispute',
  };

  assert.equal(resolveCanonicalMapName(mapMap, 2), 'Black Forest');
  assert.equal(resolveCanonicalMapName(mapMap, 10979), 'Glade');
  assert.equal(resolveCanonicalMapName(mapMap, 11012), 'Border Dispute');
  assert.equal(resolveCanonicalMapName(mapMap, 999), null);
  assert.equal(resolveCanonicalMapName(mapMap, null), null);
});
