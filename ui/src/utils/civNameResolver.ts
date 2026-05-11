const DISPLAY_OVERRIDES: Record<string, string> = {
  aztecs: 'Aztec',
  hindustani: 'Hindustanis',
  hindustanis: 'Hindustanis',
  lacviet: 'Lac Viet',
  macedonian: 'Macedonians',
  macedonians: 'Macedonians',
  mapuche: 'Mapuche',
  muisca: 'Muisca',
  tupi: 'Tupi',
};

const ICON_FILENAME_OVERRIDES: Record<string, string> = {
  aztec: 'aztecs.png',
  hindustanis: 'indians.png',
  lacviet: 'lacviet.png',
  macedonians: 'macedonian.png',
};

const EMBLEM_FILENAME_OVERRIDES: Record<string, string> = {
  aztec: 'aztecs.png',
  lacviet: 'lacviet.png',
  macedonians: 'macedonian.png',
};

function civNameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function titleCaseCivName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}

export function normalizeCivDisplayName(name: string | number | null | undefined): string {
  if (name === null || name === undefined) return '';

  const cleanName = String(name).trim().replace(/\s+/g, ' ');
  if (!cleanName) return '';
  if (/^\d+$/.test(cleanName)) return '';

  const override = DISPLAY_OVERRIDES[civNameKey(cleanName)];
  if (override) return override;

  return titleCaseCivName(cleanName);
}

export function getCivAssetFilename(civName: string | number, assetType: 'icon' | 'emblem'): string {
  const normalizedName = normalizeCivDisplayName(civName);
  const key = civNameKey(normalizedName);
  if (!key) return 'unknown.png';

  const overrides = assetType === 'icon' ? ICON_FILENAME_OVERRIDES : EMBLEM_FILENAME_OVERRIDES;

  return overrides[key] ?? `${key}.png`;
}
