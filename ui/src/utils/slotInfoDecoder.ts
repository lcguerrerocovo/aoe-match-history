import pako from 'pako';

function cleanStr(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
}

// Add parseColor function
function parseColor(color: string) {
  // 4294967296 is not set
  if (color == '4294967295') return null;
  return parseInt(color) + 1;
}

// Base64 decoding utility
const Base64 = {
  _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
  decode: function (input: string) {
    var output = "";
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;
    input = input.replace(/[^A-Za-z0-9+/=]/g, "");
    while (i < input.length) {
      enc1 = this._keyStr.indexOf(input.charAt(i++));
      enc2 = this._keyStr.indexOf(input.charAt(i++));
      enc3 = this._keyStr.indexOf(input.charAt(i++));
      enc4 = this._keyStr.indexOf(input.charAt(i++));
      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;
      output = output + String.fromCharCode(chr1);
      if (enc3 != 64) {
        output = output + String.fromCharCode(chr2);
      }
      if (enc4 != 64) {
        output = output + String.fromCharCode(chr3);
      }
    }
    output = this._utf8_decode(output);
    return output;
  },
  _utf8_decode: function (utftext: string) {
    var string = "";
    var i = 0;
    let c = 0;
    // @ts-ignore: Unused variable necessary for structure
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let c1 = 0;
    let c2 = 0;
    let c3 = 0;
    while (i < utftext.length) {
      c = utftext.charCodeAt(i);
      if (c < 128) {
        string += String.fromCharCode(c);
        i++;
      } else if (c > 191 && c < 224) {
        c2 = utftext.charCodeAt(i + 1);
        string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
        i += 2;
      } else {
        c2 = utftext.charCodeAt(i + 1);
        c3 = utftext.charCodeAt(i + 2);
        string += String.fromCharCode(
          ((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63)
        );
        i += 3;
      }
    }
    return string;
  },
};

// Parse player metadata
function parsePlayerMetadata(playerMetadata: string) {
  if (!playerMetadata) return null;

  // ♥☺0☺7‼ScenarioPlayerIndex☺7♦Team☺3
  // -----0----7----ScenarioPlayerIndex----7----Team----3
  // -0-7-ScenarioPlayerIndex-7-Team-3

  // [ '', '1', '28', '0', '1', 'ScenarioPlayerIndex', '1', 'Team', '3' ]
  // [ '', '1', '33', '0', '2', 'ScenarioPlayerIndex', '2', 'Team', '4' ]
  // [ '', '1', '23', '0', '3', 'ScenarioPlayerIndex', '3', 'Team', '4' ]
  // [ '', '1', '39', '0', '5', 'ScenarioPlayerIndex', '5', 'Team', '4' ]
  // [ '', '1', '37', '0', '6', 'ScenarioPlayerIndex', '6', 'Team', '3' ]
  // [ '', '1', '21', '0', '7', 'ScenarioPlayerIndex', '7', 'Team', '3' ]
  // [ '', '1', '26', '0', '4', 'ScenarioPlayerIndex', '4', 'Team', '3' ]
  // [ '', '1', '10', '0', '0', 'ScenarioPlayerIndex', '0', 'Team', '6' ]

  // Team 1 is -
  // Team 2-5 is 1-4
  // Team 6 is ?

  playerMetadata = playerMetadata
    .split("")
    .map((ch) => (ch.charCodeAt(0) < 32 ? "-" : ch))
    .join("");
  playerMetadata = playerMetadata.replace(/-+/g, "-");
  const playerMetadataArr = playerMetadata.split("-");

  return {
    unknown1: playerMetadataArr[1],
    civ: playerMetadataArr[2],
    scenarioToPlayerIndex: playerMetadataArr[4],
    team: playerMetadataArr[6],
  };
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

  // Decode metadata for each player and add color information
  try {
    console.log('🔍 Decoding metadata for', playersData.length, 'players');
    
    playersData.forEach(
      (pd, index) => {
        if (pd.metaData?.length > 0) {
          const firstDecode = Base64.decode(pd.metaData);
          const secondDecode = Base64.decode(firstDecode);
          const decodedMetadata = parsePlayerMetadata(secondDecode);
          
          console.log(`Player ${index + 1}:`, {
            name: pd.name,
            rawMetadata: pd.metaData,
            firstDecode: firstDecode,
            secondDecode: secondDecode,
            decoded: decodedMetadata,
            scenarioToPlayerIndex: decodedMetadata?.scenarioToPlayerIndex,
            team: decodedMetadata?.team,
            civ: decodedMetadata?.civ
          });
          
          pd.metaData = decodedMetadata;
          // Add color information based on scenarioToPlayerIndex
          if (decodedMetadata) {
            const rawColor = decodedMetadata.scenarioToPlayerIndex;
            const parsedColor = parseColor(rawColor);
            pd.colorId = parsedColor || 0;
            console.log(`  → Color: raw=${rawColor}, parsed=${parsedColor}, colorId=${pd.colorId}`);
          } else {
            pd.colorId = 0;
            console.log(`  → Color: no metadata, colorId=0`);
          }
        } else {
          pd.metaData = null;
          pd.colorId = 0;
          console.log(`Player ${index + 1}: ${pd.name} - no metadata, colorId=0`);
        }
      }
    );
    return playersData;
  } catch (e) {
    throw new Error(
      `Could not decode player metadata: ${playersData.map(
        (pd) => pd.metaData
      )}`
    );
  }
} 