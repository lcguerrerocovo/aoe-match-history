import { inflateSync } from 'zlib';
import type { DecodedOptions, PlayerMetadata, SlotInfoPlayer } from './types.js';

/**
 * Decode Relic "options" string (double base64 with zlib layer).
 * Returns object mapping numeric keys to raw values.
 */
export function decodeOptions(encoded: string): DecodedOptions {
  try {
    if (!encoded || typeof encoded !== 'string') return {};

    const blob = Buffer.from(encoded, 'base64');
    const data = inflateSync(blob);

    let decodedText = data.toString();
    if (decodedText.startsWith('"') && decodedText.endsWith('"')) {
      decodedText = decodedText.slice(1, -1);
    }

    const raw = Buffer.from(decodedText, 'base64');
    const rawText = raw.toString();

    const pairs = rawText.match(/(\d+):([0-9A-Za-z+/=]+)/g) || [];
    return pairs.reduce<DecodedOptions>((acc, pair) => {
      const [key, value] = pair.split(':');
      acc[key] = value;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

// ---------------- SlotInfo decoder -----------------
function parseColor(color: string): number | null {
  if (color === '4294967295') return null;
  return parseInt(color, 10) + 1;
}

function parsePlayerMetadata(meta: string): PlayerMetadata | null {
  if (!meta) return null;
  const cleaned = meta.split('').map(ch => ch.charCodeAt(0) < 32 ? '-' : ch).join('').replace(/-+/g, '-');
  const parts = cleaned.split('-');
  return {
    unknown1: parts[1],
    civId: parts[2],
    colorId: parseColor(parts[4]),
    teamId: parts[6]
  };
}

function base64DecodeSafe(str: string): string {
  try { return Buffer.from(str, 'base64').toString('utf8'); } catch { return str; }
}

export function decompressZlib(b64: string): string {
  const buf = Buffer.from(b64, 'base64');
  return inflateSync(buf).toString();
}

export function decodeSlotInfo(str: string): SlotInfoPlayer[] {
  const block = decompressZlib(str);
  const commaIdx = block.indexOf(',');
  if (commaIdx < 0) return [];
  const jsonPart = block.slice(commaIdx + 1).replace(/\u0000$/, '');
  let players: SlotInfoPlayer[] = [];
  try { players = JSON.parse(jsonPart); } catch { return []; }
  players.forEach(p => {
    if (p.metaData && typeof p.metaData === 'string' && p.metaData.length > 0) {
      const metaDecoded = base64DecodeSafe(base64DecodeSafe(p.metaData));
      p.metaData = parsePlayerMetadata(metaDecoded);
    }
  });
  return players;
}
