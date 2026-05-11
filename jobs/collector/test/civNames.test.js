import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeCivDisplayName, resolveCanonicalCivName } from '../dist/civNames.js';

test('collector normalizes display-only civ name variants', () => {
  assert.equal(normalizeCivDisplayName('Aztecs'), 'Aztec');
  assert.equal(normalizeCivDisplayName('LacViet'), 'Lac Viet');
  assert.equal(normalizeCivDisplayName('59'), null);
});

test('collector resolves civilization IDs only through mappings', () => {
  const civMap = {
    '59': 'Mapuche',
  };

  assert.equal(resolveCanonicalCivName(civMap, 59), 'Mapuche');
  assert.equal(resolveCanonicalCivName(civMap, '59'), 'Mapuche');
  assert.equal(resolveCanonicalCivName(civMap, '59abc'), null);
  assert.equal(resolveCanonicalCivName(civMap, 999), null);
  assert.equal(resolveCanonicalCivName(civMap, null), null);
});
