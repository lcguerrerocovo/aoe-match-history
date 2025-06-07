import pako from 'pako';

function cleanStr(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
}

export function decodeSlotInfo(str: string) {
  let playersDataBlock: string;
  try {
    const binaryString = atob(str);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    playersDataBlock = pako.inflate(bytes, { to: 'string' });
  } catch (e) {
    throw new Error(`Could not decompress player data: ${str}`);
  }

  let playersDataStr: string = playersDataBlock.substr(
    playersDataBlock.indexOf(",") + 1
  );
  let playersData: any[];
  try {
    playersData = JSON.parse(cleanStr(playersDataStr)) as any[];
  } catch (e) {
    throw new Error(`Could not parse player data json: ${playersDataStr}`);
  }

  // Skip metadata decoding for now
  playersData.forEach(pd => pd.metaData = null);
  return playersData;
} 