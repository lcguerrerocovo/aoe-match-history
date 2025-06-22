// SPDX-License-Identifier: AGPL-3.0-or-later

import { inflate } from 'pako';

// Add parseColor function
function parseColor(color: string) {
  // 4294967296 is not set
  if (color == '4294967295') return null;
    return parseInt(color) + 1;
}


// https://codebeautify.org/gzip-decompress-online
export function decompressZlib(str: string) {
    let compressData: any = atob(str);
    compressData = compressData.split('').map(function (e: string) {
        return e.charCodeAt(0);
    });
    return inflate(compressData, { to: 'string' });
}

// https://stackoverflow.com/a/27725393/1106753
export function cleanStr(s: string) {
    // preserve newlines, etc - use valid JSON
    s = s.replace(/\\n/g, "\\n")
        .replace(/\\'/g, "\\'")
        .replace(/\\"/g, '\\"')
        .replace(/\\&/g, "\\&")
        .replace(/\\r/g, "\\r")
        .replace(/\\t/g, "\\t")
        .replace(/\\b/g, "\\b")
        .replace(/\\f/g, "\\f");
    // remove non-printable and other non-valid JSON chars
    // eslint-disable-next-line no-control-regex
    s = s.replace(/[\u0000-\u0019]+/g, "");
    return s;
}

// https://codebeautify.org/base64-to-text-converter
export const Base64 = {
    _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", encode: function (input: string) {
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;
        input = Base64._utf8_encode(input);
        while (i < input.length) {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;
            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }
            output = output +
                this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
                this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
        }
        return output;
    }, decode: function (input: string) {
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
        output = Base64._utf8_decode(output);
        return output;
    }, _utf8_encode: function (string: string) {
        string = string.replace(/\r\n/g, "\n");
        var utftext = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            } else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            } else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    }, _utf8_decode: function (utftext: string) {
        var string = "";
        var i = 0;
        let c = 0;
        //let c1 = 0;
        let c2 = 0;
        let c3 = 0;
        while (i < utftext.length) {
            c = utftext.charCodeAt(i);
            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            } else if ((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i + 1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            } else {
                c2 = utftext.charCodeAt(i + 1);
                c3 = utftext.charCodeAt(i + 2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }
        }
        return string;
    }
}


function parsePlayerMetadata(playerMetadata: string) {
  if (!playerMetadata) return null;

  // ♥☺0☺7‼ScenarioPlayerIndex☺7♦Team☺3
  // -----0----7----ScenarioPlayerIndex----7----Team----3
  // -0-7-ScenarioPlayerIndex-7-Team-3

  // [ '', '1', '28', '0', '1', 'ScenarioPlayerIndex', '1', 'Team', '3' ]
  // [ '', '1', '33', '0', '2', 'ScenarioPlayerIndex', '2', 'Team', '1' ]
  // [ '', '1', '23', '0', '3', 'ScenarioPlayerIndex', '3', 'Team', '4' ]
  // [ '', '1', '39', '0', '5', 'ScenarioPlayerIndex', '5', 'Team', '4' ]
  // [ '', '1', '37', '0', '6', 'ScenarioPlayerIndex', '6', 'Team', '3' ]
  // [ '', '1', '21', '0', '7', 'ScenarioPlayerIndex', '7', 'Team', '3' ]
  // [ '', '1', '26', '0', '4', 'ScenarioPlayerIndex', '4', 'Team', '3' ]
  // [ '', '1', '10', '0', '0', 'ScenarioPlayerIndex', '0', 'Team', '6' ]

  // Team 1 is -
  // Team 2-5 is 1-4
  // Team 6 is ?

  playerMetadata = playerMetadata.split('').map(ch => ch.charCodeAt(0) < 32 ? '-' : ch).join('');
  playerMetadata = playerMetadata.replace(/-+/g, '-');
  const playerMetadataArr = playerMetadata.split('-');

  console.log("playerMetadataArr", playerMetadataArr);
  return {
      unknown1: playerMetadataArr[1],
      civId: playerMetadataArr[2],
      colorId: parseColor(playerMetadataArr[4]),
      teamId: playerMetadataArr[6],
  };
}

export function decodeSlotInfo(str: string) {
    let playersDataBlock: string;
    try {
        playersDataBlock = decompressZlib(str);
    } catch (e) {
        throw new Error(`Could not decompress player data: ${str}`);
    }

    // 12,[{"profileInfo.id":  ...  }]

    let playersDataStr: string;
    let playersData: any[];
    try {
        playersDataStr = playersDataBlock.substr(playersDataBlock.indexOf(',') + 1);
        playersData = JSON.parse(cleanStr(playersDataStr)) as any[];
    } catch (e) {
        throw new Error("Could not parse player data json:");
    }

    // console.log('playersData', playersData);

    try {
        playersData.forEach(pd => pd.metaData = pd.metaData?.length > 0 ? parsePlayerMetadata(Base64.decode(Base64.decode(pd.metaData))) : null);
        // console.log('playersData', playersData);
        return playersData;
    } catch (e) {
        throw new Error(`Could not decode player metadata: ${playersData.map(pd => pd.metaData)}`);
    }
}