const {
  normalizeCivDisplayName,
  resolveCanonicalCivName,
  resolvePlayerCiv,
} = require('./civNames');

describe('civNames', () => {
  it('normalizes display-only civ name variants', () => {
    expect(normalizeCivDisplayName('Aztecs')).toBe('Aztec');
    expect(normalizeCivDisplayName('LacViet')).toBe('Lac Viet');
    expect(normalizeCivDisplayName('59')).toBeNull();
  });

  it('resolves civilization IDs through the provided mapping', () => {
    expect(resolveCanonicalCivName({ '59': 'Mapuche' }, 59)).toBe('Mapuche');
    expect(resolveCanonicalCivName({ '59': 'Mapuche' }, '59')).toBe('Mapuche');
    expect(resolveCanonicalCivName({ '59': 'Mapuche' }, '59abc')).toBeNull();
  });

  it('prefers versioned mapping IDs over stored names', () => {
    expect(resolvePlayerCiv({ '59': 'Mapuche' }, 'Malians', 59)).toBe('Mapuche');
  });

  it('does not invent a name when an ID is present but unmapped', () => {
    expect(resolvePlayerCiv({}, 'Malians', 59)).toBe(59);
  });

  it('uses a stored name only when there is no usable ID', () => {
    expect(resolvePlayerCiv({}, 'Malians', null)).toBe('Malians');
  });
});
