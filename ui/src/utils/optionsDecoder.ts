import { inflate } from 'pako';

export function decodeOptions(encoded: string): Record<string, string> {
    try {
        // 1) Base64 → zlib
        const blob = atob(encoded);
        const data = inflate(new Uint8Array(blob.split('').map(c => c.charCodeAt(0))));
        
        // 2) strip surrounding quotes if present
        let decodedText = new TextDecoder().decode(data);
        if (decodedText.startsWith('"') && decodedText.endsWith('"')) {
            decodedText = decodedText.slice(1, -1);
        }

        // 3) inner Base64 → raw bytes
        const raw = atob(decodedText);
        const rawBytes = new Uint8Array(raw.split('').map(c => c.charCodeAt(0)));

        // 4) regex out all "digits:alphanum+" segments
        const rawText = new TextDecoder().decode(rawBytes);
        const pairs = rawText.match(/(\d+):([0-9A-Za-z+/=]+)/g) || [];
        
        return pairs.reduce((acc, pair) => {
            const [key, value] = pair.split(':');
            acc[key] = value;
            return acc;
        }, {} as Record<string, string>);
    } catch (e) {
        console.error('Failed to decode options:', e);
        return {};
    }
} 