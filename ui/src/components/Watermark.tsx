import type { CSSProperties, FC } from 'react';
import { Box } from '@chakra-ui/react';

type WatermarkVariant = 'swords' | 'compass' | 'trebuchet';

interface WatermarkProps {
  variant: WatermarkVariant;
  size?: number;
  style?: CSSProperties;
}

function SwordsSvg() {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* === SWORDS (behind shield) === */}

      {/* Left sword — pommel top-left, blade tip bottom-right */}
      <line x1="38" y1="18" x2="148" y2="185" stroke="#3B2614" strokeWidth="2.2" />
      <line x1="35" y1="20" x2="145" y2="187" stroke="#3B2614" strokeWidth="0.5" />
      <path d="M146,184 L150,190 L143,188" stroke="#3B2614" strokeWidth="1" strokeLinejoin="round" />
      <path d="M28,36 Q36,28 48,38" stroke="#3B2614" strokeWidth="2" strokeLinecap="round" />
      <path d="M30,38 Q37,31 46,39" stroke="#3B2614" strokeWidth="0.6" />
      <line x1="36" y1="24" x2="39" y2="21" stroke="#3B2614" strokeWidth="0.6" />
      <line x1="34" y1="22" x2="37" y2="19" stroke="#3B2614" strokeWidth="0.6" />
      <circle cx="34" cy="14" r="5" stroke="#3B2614" strokeWidth="1.8" />
      <circle cx="34" cy="14" r="1.5" stroke="#3B2614" strokeWidth="0.8" />

      {/* Right sword — pommel top-right, blade tip bottom-left */}
      <line x1="162" y1="18" x2="52" y2="185" stroke="#3B2614" strokeWidth="2.2" />
      <line x1="165" y1="20" x2="55" y2="187" stroke="#3B2614" strokeWidth="0.5" />
      <path d="M54,184 L50,190 L57,188" stroke="#3B2614" strokeWidth="1" strokeLinejoin="round" />
      <path d="M152,38 Q164,28 172,36" stroke="#3B2614" strokeWidth="2" strokeLinecap="round" />
      <path d="M154,39 Q163,31 170,38" stroke="#3B2614" strokeWidth="0.6" />
      <line x1="161" y1="24" x2="164" y2="21" stroke="#3B2614" strokeWidth="0.6" />
      <line x1="163" y1="22" x2="166" y2="19" stroke="#3B2614" strokeWidth="0.6" />
      <circle cx="166" cy="14" r="5" stroke="#3B2614" strokeWidth="1.8" />
      <circle cx="166" cy="14" r="1.5" stroke="#3B2614" strokeWidth="0.8" />

      {/* === SHIELD (in front of swords) === */}
      <path
        d="M100 28 L145 48 L145 108 Q145 148 100 172 Q55 148 55 108 L55 48 Z"
        stroke="#3B2614" strokeWidth="2.5" strokeLinejoin="round"
      />
      <path
        d="M100 38 L136 54 L136 105 Q136 138 100 160 Q64 138 64 105 L64 54 Z"
        stroke="#3B2614" strokeWidth="1.2"
      />

      {/* Rivets along rim */}
      <circle cx="100" cy="31" r="1.5" stroke="#3B2614" strokeWidth="0.8" />
      <circle cx="88" cy="35" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="112" cy="35" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="76" cy="42" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="60" cy="52" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="57" cy="65" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="56" cy="80" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="56" cy="95" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="57" cy="110" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="61" cy="123" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="68" cy="135" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="78" cy="146" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="90" cy="155" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="124" cy="42" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="140" cy="52" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="143" cy="65" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="144" cy="80" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="144" cy="95" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="143" cy="110" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="139" cy="123" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="132" cy="135" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="122" cy="146" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="110" cy="155" r="1.3" stroke="#3B2614" strokeWidth="0.7" />
      <circle cx="100" cy="165" r="1.3" stroke="#3B2614" strokeWidth="0.7" />

      {/* Da Vinci cross-hatching */}
      <line x1="72" y1="62" x2="92" y2="82" stroke="#3B2614" strokeWidth="0.3" />
      <line x1="78" y1="58" x2="95" y2="75" stroke="#3B2614" strokeWidth="0.3" />
      <line x1="84" y1="56" x2="96" y2="68" stroke="#3B2614" strokeWidth="0.3" />
      <line x1="108" y1="62" x2="128" y2="82" stroke="#3B2614" strokeWidth="0.3" />
      <line x1="112" y1="58" x2="128" y2="74" stroke="#3B2614" strokeWidth="0.3" />
      <line x1="116" y1="56" x2="126" y2="66" stroke="#3B2614" strokeWidth="0.3" />
      <line x1="72" y1="100" x2="90" y2="118" stroke="#3B2614" strokeWidth="0.25" />
      <line x1="76" y1="108" x2="88" y2="120" stroke="#3B2614" strokeWidth="0.25" />
      <line x1="110" y1="100" x2="128" y2="118" stroke="#3B2614" strokeWidth="0.25" />
      <line x1="112" y1="108" x2="124" y2="120" stroke="#3B2614" strokeWidth="0.25" />
    </svg>
  );
}

function CompassSvg() {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer rings */}
      <circle cx="100" cy="100" r="90" stroke="#3B2614" strokeWidth="1" />
      <circle cx="100" cy="100" r="85" stroke="#3B2614" strokeWidth="2" />
      <circle cx="100" cy="100" r="80" stroke="#3B2614" strokeWidth="0.5" />
      {/* Inner decorative ring */}
      <circle cx="100" cy="100" r="38" stroke="#3B2614" strokeWidth="0.8" />
      <circle cx="100" cy="100" r="25" stroke="#3B2614" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="5" stroke="#3B2614" strokeWidth="2" />
      {/* Cardinal points — wider diamond shapes */}
      <polygon points="100,15 92,42 100,75 108,42" stroke="#3B2614" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="100,185 92,158 100,125 108,158" stroke="#3B2614" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="185,100 158,92 125,100 158,108" stroke="#3B2614" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="15,100 42,92 75,100 42,108" stroke="#3B2614" strokeWidth="2" strokeLinejoin="round" />
      {/* Half-fill on cardinal points for depth */}
      <polygon points="100,15 100,75 108,42" stroke="none" fill="#3B2614" fillOpacity="0.08" />
      <polygon points="100,185 100,125 108,158" stroke="none" fill="#3B2614" fillOpacity="0.08" />
      <polygon points="185,100 125,100 158,108" stroke="none" fill="#3B2614" fillOpacity="0.08" />
      <polygon points="15,100 75,100 42,108" stroke="none" fill="#3B2614" fillOpacity="0.08" />
      {/* Intercardinal points — thinner, shorter */}
      <polygon points="38,38 68,72 74,66" stroke="#3B2614" strokeWidth="1" strokeLinejoin="round" />
      <polygon points="162,38 132,72 126,66" stroke="#3B2614" strokeWidth="1" strokeLinejoin="round" />
      <polygon points="38,162 68,128 74,134" stroke="#3B2614" strokeWidth="1" strokeLinejoin="round" />
      <polygon points="162,162 132,128 126,134" stroke="#3B2614" strokeWidth="1" strokeLinejoin="round" />
      {/* North fleur-de-lis tip */}
      <path d="M100,8 Q96,4 93,7" stroke="#3B2614" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M100,8 Q104,4 107,7" stroke="#3B2614" strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="100" cy="10" r="1" fill="#3B2614" />
      {/* Degree tick marks */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const inner = deg % 90 === 0 ? 85 : 80;
        const x1 = 100 + inner * Math.sin(rad);
        const y1 = 100 - inner * Math.cos(rad);
        const x2 = 100 + 90 * Math.sin(rad);
        const y2 = 100 - 90 * Math.cos(rad);
        return (
          <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#3B2614" strokeWidth={deg % 90 === 0 ? '1.5' : '0.5'} />
        );
      })}
      {/* Cross-hatching near center for Da Vinci feel */}
      <line x1="90" y1="80" x2="85" y2="90" stroke="#3B2614" strokeWidth="0.3" />
      <line x1="110" y1="80" x2="115" y2="90" stroke="#3B2614" strokeWidth="0.3" />
      <line x1="90" y1="120" x2="85" y2="110" stroke="#3B2614" strokeWidth="0.3" />
      <line x1="110" y1="120" x2="115" y2="110" stroke="#3B2614" strokeWidth="0.3" />
    </svg>
  );
}

function TrebuchetSvg() {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="30" y1="175" x2="170" y2="175" stroke="#3B2614" strokeWidth="2.5" />
      <circle cx="50" cy="175" r="12" stroke="#3B2614" strokeWidth="2" />
      <circle cx="50" cy="175" r="3" stroke="#3B2614" strokeWidth="1" />
      <line x1="50" y1="163" x2="50" y2="187" stroke="#3B2614" strokeWidth="0.5" />
      <line x1="38" y1="175" x2="62" y2="175" stroke="#3B2614" strokeWidth="0.5" />
      <circle cx="150" cy="175" r="12" stroke="#3B2614" strokeWidth="2" />
      <circle cx="150" cy="175" r="3" stroke="#3B2614" strokeWidth="1" />
      <line x1="150" y1="163" x2="150" y2="187" stroke="#3B2614" strokeWidth="0.5" />
      <line x1="138" y1="175" x2="162" y2="175" stroke="#3B2614" strokeWidth="0.5" />
      <line x1="80" y1="175" x2="100" y2="70" stroke="#3B2614" strokeWidth="2.5" />
      <line x1="120" y1="175" x2="100" y2="70" stroke="#3B2614" strokeWidth="2.5" />
      <line x1="88" y1="135" x2="112" y2="135" stroke="#3B2614" strokeWidth="1.5" />
      <circle cx="100" cy="70" r="4" stroke="#3B2614" strokeWidth="2" />
      <line x1="100" y1="70" x2="45" y2="30" stroke="#3B2614" strokeWidth="2" />
      <path d="M45,30 Q35,35 38,45" stroke="#3B2614" strokeWidth="1.5" fill="none" />
      <circle cx="38" cy="47" r="5" stroke="#3B2614" strokeWidth="1.5" />
      <line x1="100" y1="70" x2="135" y2="100" stroke="#3B2614" strokeWidth="2" />
      <rect x="125" y="100" width="20" height="18" stroke="#3B2614" strokeWidth="1.5" rx="2" />
      <line x1="127" y1="102" x2="143" y2="116" stroke="#3B2614" strokeWidth="0.4" />
      <line x1="127" y1="108" x2="137" y2="116" stroke="#3B2614" strokeWidth="0.4" />
      <line x1="133" y1="102" x2="143" y2="110" stroke="#3B2614" strokeWidth="0.4" />
      <line x1="80" y1="175" x2="65" y2="155" stroke="#3B2614" strokeWidth="0.8" />
      <line x1="120" y1="175" x2="135" y2="155" stroke="#3B2614" strokeWidth="0.8" />
      <line x1="65" y1="155" x2="135" y2="155" stroke="#3B2614" strokeWidth="0.6" />
      <line x1="20" y1="188" x2="50" y2="188" stroke="#3B2614" strokeWidth="0.4" />
      <line x1="70" y1="190" x2="110" y2="190" stroke="#3B2614" strokeWidth="0.3" />
      <line x1="140" y1="188" x2="180" y2="188" stroke="#3B2614" strokeWidth="0.4" />
    </svg>
  );
}

const variants: Record<WatermarkVariant, FC> = {
  swords: SwordsSvg,
  compass: CompassSvg,
  trebuchet: TrebuchetSvg,
};

export function Watermark({ variant, size = 300, style }: WatermarkProps) {
  const SvgComponent = variants[variant];
  return (
    <Box
      position="absolute"
      w={`${size}px`}
      h={`${size}px`}
      opacity={0.10}
      pointerEvents="none"
      zIndex={0}
      style={style}
    >
      <SvgComponent />
    </Box>
  );
}

/*
 * Tiled watermark pattern that repeats vertically.
 * Uses CSS background-image with SVG data URIs. Three separate background layers
 * are staggered with different background-position offsets and each repeats on
 * its own vertical cycle, creating a non-uniform pattern that fills any height.
 */
const compassSvgUri = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" opacity="0.10"><circle cx="100" cy="100" r="90" stroke="#3B2614" stroke-width="1"/><circle cx="100" cy="100" r="85" stroke="#3B2614" stroke-width="2"/><circle cx="100" cy="100" r="80" stroke="#3B2614" stroke-width="0.5"/><circle cx="100" cy="100" r="38" stroke="#3B2614" stroke-width="0.8"/><circle cx="100" cy="100" r="25" stroke="#3B2614" stroke-width="1.5"/><circle cx="100" cy="100" r="5" stroke="#3B2614" stroke-width="2"/><polygon points="100,15 92,42 100,75 108,42" stroke="#3B2614" stroke-width="2" stroke-linejoin="round"/><polygon points="100,185 92,158 100,125 108,158" stroke="#3B2614" stroke-width="2" stroke-linejoin="round"/><polygon points="185,100 158,92 125,100 158,108" stroke="#3B2614" stroke-width="2" stroke-linejoin="round"/><polygon points="15,100 42,92 75,100 42,108" stroke="#3B2614" stroke-width="2" stroke-linejoin="round"/><polygon points="100,15 100,75 108,42" fill="#3B2614" fill-opacity="0.08"/><polygon points="100,185 100,125 108,158" fill="#3B2614" fill-opacity="0.08"/><polygon points="185,100 125,100 158,108" fill="#3B2614" fill-opacity="0.08"/><polygon points="15,100 75,100 42,108" fill="#3B2614" fill-opacity="0.08"/><polygon points="38,38 68,72 74,66" stroke="#3B2614" stroke-width="1" stroke-linejoin="round"/><polygon points="162,38 132,72 126,66" stroke="#3B2614" stroke-width="1" stroke-linejoin="round"/><polygon points="38,162 68,128 74,134" stroke="#3B2614" stroke-width="1" stroke-linejoin="round"/><polygon points="162,162 132,128 126,134" stroke="#3B2614" stroke-width="1" stroke-linejoin="round"/><path d="M100,8 Q96,4 93,7" stroke="#3B2614" stroke-width="0.8" stroke-linecap="round"/><path d="M100,8 Q104,4 107,7" stroke="#3B2614" stroke-width="0.8" stroke-linecap="round"/><circle cx="100" cy="10" r="1" fill="#3B2614"/></svg>')}")`;

const trebuchetSvgUri = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" opacity="0.10"><line x1="30" y1="175" x2="170" y2="175" stroke="#3B2614" stroke-width="2.5"/><circle cx="50" cy="175" r="12" stroke="#3B2614" stroke-width="2"/><circle cx="50" cy="175" r="3" stroke="#3B2614" stroke-width="1"/><circle cx="150" cy="175" r="12" stroke="#3B2614" stroke-width="2"/><circle cx="150" cy="175" r="3" stroke="#3B2614" stroke-width="1"/><line x1="80" y1="175" x2="100" y2="70" stroke="#3B2614" stroke-width="2.5"/><line x1="120" y1="175" x2="100" y2="70" stroke="#3B2614" stroke-width="2.5"/><line x1="88" y1="135" x2="112" y2="135" stroke="#3B2614" stroke-width="1.5"/><circle cx="100" cy="70" r="4" stroke="#3B2614" stroke-width="2"/><line x1="100" y1="70" x2="45" y2="30" stroke="#3B2614" stroke-width="2"/><path d="M45,30 Q35,35 38,45" stroke="#3B2614" stroke-width="1.5" fill="none"/><circle cx="38" cy="47" r="5" stroke="#3B2614" stroke-width="1.5"/><line x1="100" y1="70" x2="135" y2="100" stroke="#3B2614" stroke-width="2"/><rect x="125" y="100" width="20" height="18" stroke="#3B2614" stroke-width="1.5" rx="2"/><line x1="80" y1="175" x2="65" y2="155" stroke="#3B2614" stroke-width="0.8"/><line x1="120" y1="175" x2="135" y2="155" stroke="#3B2614" stroke-width="0.8"/><line x1="65" y1="155" x2="135" y2="155" stroke="#3B2614" stroke-width="0.6"/></svg>')}")`;

const swordsSvgUri = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" opacity="0.10"><line x1="38" y1="18" x2="148" y2="185" stroke="#3B2614" stroke-width="2.2"/><line x1="35" y1="20" x2="145" y2="187" stroke="#3B2614" stroke-width="0.5"/><path d="M28,36 Q36,28 48,38" stroke="#3B2614" stroke-width="2" stroke-linecap="round"/><circle cx="34" cy="14" r="5" stroke="#3B2614" stroke-width="1.8"/><circle cx="34" cy="14" r="1.5" stroke="#3B2614" stroke-width="0.8"/><line x1="162" y1="18" x2="52" y2="185" stroke="#3B2614" stroke-width="2.2"/><line x1="165" y1="20" x2="55" y2="187" stroke="#3B2614" stroke-width="0.5"/><path d="M152,38 Q164,28 172,36" stroke="#3B2614" stroke-width="2" stroke-linecap="round"/><circle cx="166" cy="14" r="5" stroke="#3B2614" stroke-width="1.8"/><circle cx="166" cy="14" r="1.5" stroke="#3B2614" stroke-width="0.8"/><path d="M100 28 L145 48 L145 108 Q145 148 100 172 Q55 148 55 108 L55 48 Z" stroke="#3B2614" stroke-width="2.5" stroke-linejoin="round"/><path d="M100 38 L136 54 L136 105 Q136 138 100 160 Q64 138 64 105 L64 54 Z" stroke="#3B2614" stroke-width="1.2"/><circle cx="100" cy="31" r="1.5" stroke="#3B2614" stroke-width="0.8"/><circle cx="56" cy="80" r="1.3" stroke="#3B2614" stroke-width="0.7"/><circle cx="56" cy="95" r="1.3" stroke="#3B2614" stroke-width="0.7"/><circle cx="144" cy="80" r="1.3" stroke="#3B2614" stroke-width="0.7"/><circle cx="144" cy="95" r="1.3" stroke="#3B2614" stroke-width="0.7"/><circle cx="100" cy="165" r="1.3" stroke="#3B2614" stroke-width="0.7"/></svg>')}")`;

export function WatermarkTiled() {
  return (
    <Box
      position="absolute"
      inset={0}
      pointerEvents="none"
      zIndex={0}
      overflow="hidden"
      style={{
        backgroundImage: [
          compassSvgUri,   // slot 1: right
          trebuchetSvgUri, // slot 2: left
          swordsSvgUri,    // slot 3: right
          compassSvgUri,   // slot 4: left
          trebuchetSvgUri, // slot 5: right
          swordsSvgUri,    // slot 6: left
        ].join(', '),
        backgroundRepeat: 'repeat-y',
        backgroundSize: '180px 3600px, 170px 3600px, 160px 3600px, 180px 3600px, 170px 3600px, 160px 3600px',
        backgroundPosition: [
          'right 30px top 500px',
          'left 20px top 1100px',
          'right 40px top 1700px',
          'left 25px top 2300px',
          'right 35px top 2900px',
          'left 30px top 3500px',
        ].join(', '),
      }}
    />
  );
}
