import type { IdNameMap } from './types';

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

function civNameKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function titleCaseCivName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}

export function normalizeCivDisplayName(name: string | null | undefined): string | null {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return null;
  }

  const cleanName = name.trim().replace(/\s+/g, ' ');
  if (/^\d+$/.test(cleanName)) return null;

  const override = DISPLAY_OVERRIDES[civNameKey(cleanName)];
  if (override) return override;

  return titleCaseCivName(cleanName);
}

export function resolveCanonicalCivName(
  civMap: IdNameMap,
  civilizationId: number | string | null | undefined,
): string | null {
  if (civilizationId === null || civilizationId === undefined || civilizationId === '') {
    return null;
  }
  if (typeof civilizationId === 'string' && civilizationId.trim() === '') {
    return null;
  }

  const parsedId = typeof civilizationId === 'number' ? civilizationId : Number(civilizationId);
  if (!Number.isFinite(parsedId)) return null;

  const mappedName = civMap[parsedId.toString()];
  return mappedName ? normalizeCivDisplayName(mappedName) : null;
}

function parseCivId(civilizationId: number | string | null | undefined): number | null {
  if (civilizationId === null || civilizationId === undefined || civilizationId === '') {
    return null;
  }
  if (typeof civilizationId === 'string' && civilizationId.trim() === '') {
    return null;
  }

  const parsedId = typeof civilizationId === 'number' ? civilizationId : Number(civilizationId);
  return Number.isFinite(parsedId) ? parsedId : null;
}

export function resolvePlayerCiv(
  civMap: IdNameMap,
  civilizationName: string | null,
  civilizationId: number | string | null,
): string | number {
  const parsedId = parseCivId(civilizationId);
  if (parsedId !== null) {
    return resolveCanonicalCivName(civMap, parsedId) ?? parsedId;
  }

  return normalizeCivDisplayName(civilizationName) ?? 0;
}
