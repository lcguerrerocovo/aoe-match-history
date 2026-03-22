import type { CSSProperties, FC } from 'react';
import { Box } from '@chakra-ui/react';

type WatermarkVariant = 'swords' | 'compass' | 'trebuchet' | 'castle';

interface WatermarkProps {
  variant: WatermarkVariant;
  size?: number;
  style?: CSSProperties;
}

/*
 * SVG content strings are the single source of truth for each watermark.
 * React components render them via dangerouslySetInnerHTML, and the same
 * strings are used to build data URIs for WatermarkTiled — guaranteeing
 * the two are always in sync.
 *
 * All use kebab-case SVG attributes (stroke-width, stroke-linejoin, etc.)
 * because the strings are raw SVG markup, not JSX.
 */

const S = '#3B2614'; // ink color — matches brand.inkDark theme token

// ─── SWORDS & SHIELD ─────────────────────────────────────────────────────────
// Medieval arming swords: wheel pommels, straight quillon crossguards,
// fullers along blades, pointed tips.
const SWORDS_CONTENT = [
  // ── Left sword (pommel top-left → tip bottom-right) ──
  // Blade — main edge + back edge
  `<line x1="42" y1="22" x2="148" y2="185" stroke="${S}" stroke-width="2.2"/>`,
  `<line x1="39" y1="24" x2="145" y2="187" stroke="${S}" stroke-width="0.5"/>`,
  // Blade tip
  `<path d="M146,184 L150,190 L143,188" stroke="${S}" stroke-width="1" stroke-linejoin="round"/>`,
  // Fuller (groove along blade)
  `<line x1="50" y1="38" x2="130" y2="162" stroke="${S}" stroke-width="0.4"/>`,
  // Crossguard — straight quillon bar, centered on blade, perpendicular
  `<line x1="35" y1="39" x2="60" y2="23" stroke="${S}" stroke-width="2.5" stroke-linecap="round"/>`,
  // Crossguard thickness line
  `<line x1="36" y1="41" x2="61" y2="25" stroke="${S}" stroke-width="0.6"/>`,
  // Quillon terminals (small flares at ends)
  `<circle cx="34" cy="40" r="2" stroke="${S}" stroke-width="1"/>`,
  `<circle cx="61" cy="22" r="2" stroke="${S}" stroke-width="1"/>`,
  // Grip — two parallel lines for width
  `<line x1="40" y1="20" x2="36" y2="14" stroke="${S}" stroke-width="2"/>`,
  `<line x1="42" y1="18" x2="38" y2="12" stroke="${S}" stroke-width="0.8"/>`,
  // Grip wrapping marks
  `<line x1="37" y1="13" x2="42" y2="19" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="38" y1="15" x2="41" y2="17" stroke="${S}" stroke-width="0.3"/>`,
  // Wheel pommel
  `<circle cx="34" cy="10" r="5.5" stroke="${S}" stroke-width="1.8"/>`,
  `<circle cx="34" cy="10" r="2" stroke="${S}" stroke-width="0.8"/>`,
  `<line x1="34" y1="4.5" x2="34" y2="15.5" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="28.5" y1="10" x2="39.5" y2="10" stroke="${S}" stroke-width="0.3"/>`,
  // Left blade hatching
  `<line x1="58" y1="52" x2="64" y2="46" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="72" y1="72" x2="78" y2="66" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="86" y1="92" x2="92" y2="86" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="100" y1="112" x2="106" y2="106" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="114" y1="132" x2="120" y2="126" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="128" y1="152" x2="134" y2="146" stroke="${S}" stroke-width="0.2"/>`,

  // ── Right sword (pommel top-right → tip bottom-left) ──
  // Blade — main edge + back edge
  `<line x1="158" y1="22" x2="52" y2="185" stroke="${S}" stroke-width="2.2"/>`,
  `<line x1="161" y1="24" x2="55" y2="187" stroke="${S}" stroke-width="0.5"/>`,
  // Blade tip
  `<path d="M54,184 L50,190 L57,188" stroke="${S}" stroke-width="1" stroke-linejoin="round"/>`,
  // Fuller
  `<line x1="150" y1="38" x2="70" y2="162" stroke="${S}" stroke-width="0.4"/>`,
  // Crossguard — straight quillon bar, centered on blade, perpendicular
  `<line x1="140" y1="23" x2="165" y2="39" stroke="${S}" stroke-width="2.5" stroke-linecap="round"/>`,
  // Crossguard thickness
  `<line x1="139" y1="25" x2="164" y2="41" stroke="${S}" stroke-width="0.6"/>`,
  // Quillon terminals
  `<circle cx="139" cy="22" r="2" stroke="${S}" stroke-width="1"/>`,
  `<circle cx="166" cy="40" r="2" stroke="${S}" stroke-width="1"/>`,
  // Grip
  `<line x1="160" y1="20" x2="164" y2="14" stroke="${S}" stroke-width="2"/>`,
  `<line x1="158" y1="18" x2="162" y2="12" stroke="${S}" stroke-width="0.8"/>`,
  // Grip wrapping
  `<line x1="163" y1="13" x2="158" y2="19" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="162" y1="15" x2="159" y2="17" stroke="${S}" stroke-width="0.3"/>`,
  // Wheel pommel
  `<circle cx="166" cy="10" r="5.5" stroke="${S}" stroke-width="1.8"/>`,
  `<circle cx="166" cy="10" r="2" stroke="${S}" stroke-width="0.8"/>`,
  `<line x1="166" y1="4.5" x2="166" y2="15.5" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="160.5" y1="10" x2="171.5" y2="10" stroke="${S}" stroke-width="0.3"/>`,
  // Right blade hatching
  `<line x1="142" y1="52" x2="136" y2="46" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="128" y1="72" x2="122" y2="66" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="114" y1="92" x2="108" y2="86" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="100" y1="112" x2="94" y2="106" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="86" y1="132" x2="80" y2="126" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="72" y1="152" x2="66" y2="146" stroke="${S}" stroke-width="0.2"/>`,

  // ── Shield (in front of swords) ──
  // Outer contour
  `<path d="M100 28 L145 48 L145 108 Q145 148 100 172 Q55 148 55 108 L55 48 Z" stroke="${S}" stroke-width="2.5" stroke-linejoin="round"/>`,
  // Inner contour
  `<path d="M100 38 L136 54 L136 105 Q136 138 100 160 Q64 138 64 105 L64 54 Z" stroke="${S}" stroke-width="1.2"/>`,
  // Rivets along rim
  `<circle cx="100" cy="31" r="1.5" stroke="${S}" stroke-width="0.8"/>`,
  `<circle cx="88" cy="35" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="112" cy="35" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="76" cy="42" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="60" cy="52" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="57" cy="65" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="56" cy="80" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="56" cy="95" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="57" cy="110" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="61" cy="123" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="68" cy="135" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="78" cy="146" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="90" cy="155" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="124" cy="42" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="140" cy="52" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="143" cy="65" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="144" cy="80" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="144" cy="95" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="143" cy="110" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="139" cy="123" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="132" cy="135" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="122" cy="146" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="110" cy="155" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  `<circle cx="100" cy="165" r="1.3" stroke="${S}" stroke-width="0.7"/>`,
  // Shield center vertical accent
  `<line x1="100" y1="42" x2="100" y2="155" stroke="${S}" stroke-width="0.4"/>`,
  // Shield cross-hatching — upper-left quadrant
  `<line x1="72" y1="62" x2="92" y2="82" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="78" y1="58" x2="95" y2="75" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="84" y1="56" x2="96" y2="68" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="68" y1="68" x2="88" y2="88" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="66" y1="76" x2="82" y2="92" stroke="${S}" stroke-width="0.2"/>`,
  // Shield cross-hatching — upper-right quadrant
  `<line x1="108" y1="62" x2="128" y2="82" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="112" y1="58" x2="128" y2="74" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="116" y1="56" x2="126" y2="66" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="108" y1="68" x2="132" y2="88" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="112" y1="76" x2="134" y2="92" stroke="${S}" stroke-width="0.2"/>`,
  // Shield cross-hatching — lower-left quadrant
  `<line x1="72" y1="100" x2="90" y2="118" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="76" y1="108" x2="88" y2="120" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="68" y1="96" x2="85" y2="113" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="70" y1="112" x2="82" y2="124" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="74" y1="120" x2="84" y2="130" stroke="${S}" stroke-width="0.2"/>`,
  // Shield cross-hatching — lower-right quadrant
  `<line x1="110" y1="100" x2="128" y2="118" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="112" y1="108" x2="124" y2="120" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="115" y1="96" x2="132" y2="113" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="118" y1="112" x2="130" y2="124" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="116" y1="120" x2="126" y2="130" stroke="${S}" stroke-width="0.2"/>`,
].join('');

// ─── COMPASS ROSE ─────────────────────────────────────────────────────────────
// Pre-computed tick marks (replaces the .map() that can't go into data URIs)
const TICK_MARKS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]
  .map((deg) => {
    const rad = (deg * Math.PI) / 180;
    const inner = deg % 90 === 0 ? 85 : 80;
    const x1 = (100 + inner * Math.sin(rad)).toFixed(1);
    const y1 = (100 - inner * Math.cos(rad)).toFixed(1);
    const x2 = (100 + 90 * Math.sin(rad)).toFixed(1);
    const y2 = (100 - 90 * Math.cos(rad)).toFixed(1);
    const sw = deg % 90 === 0 ? '1.5' : '0.5';
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${S}" stroke-width="${sw}"/>`;
  })
  .join('');

// Minor ticks every 15° (excluding existing 30° marks)
const MINOR_TICKS = [15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345]
  .map((deg) => {
    const rad = (deg * Math.PI) / 180;
    const x1 = (100 + 82 * Math.sin(rad)).toFixed(1);
    const y1 = (100 - 82 * Math.cos(rad)).toFixed(1);
    const x2 = (100 + 86 * Math.sin(rad)).toFixed(1);
    const y2 = (100 - 86 * Math.cos(rad)).toFixed(1);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${S}" stroke-width="0.3"/>`;
  })
  .join('');

const COMPASS_CONTENT = [
  // Outer rings
  `<circle cx="100" cy="100" r="92" stroke="${S}" stroke-width="0.5"/>`,
  `<circle cx="100" cy="100" r="90" stroke="${S}" stroke-width="1"/>`,
  `<circle cx="100" cy="100" r="85" stroke="${S}" stroke-width="2"/>`,
  `<circle cx="100" cy="100" r="80" stroke="${S}" stroke-width="0.5"/>`,
  // Inner decorative rings
  `<circle cx="100" cy="100" r="38" stroke="${S}" stroke-width="0.8"/>`,
  `<circle cx="100" cy="100" r="35" stroke="${S}" stroke-width="0.3"/>`,
  `<circle cx="100" cy="100" r="25" stroke="${S}" stroke-width="1.5"/>`,
  `<circle cx="100" cy="100" r="5" stroke="${S}" stroke-width="2"/>`,
  `<circle cx="100" cy="100" r="2" stroke="${S}" stroke-width="1"/>`,
  // Cardinal points — wider diamond shapes
  `<polygon points="100,15 92,42 100,75 108,42" stroke="${S}" stroke-width="2" stroke-linejoin="round"/>`,
  `<polygon points="100,185 92,158 100,125 108,158" stroke="${S}" stroke-width="2" stroke-linejoin="round"/>`,
  `<polygon points="185,100 158,92 125,100 158,108" stroke="${S}" stroke-width="2" stroke-linejoin="round"/>`,
  `<polygon points="15,100 42,92 75,100 42,108" stroke="${S}" stroke-width="2" stroke-linejoin="round"/>`,
  // Half-fill on cardinal points for depth
  `<polygon points="100,15 100,75 108,42" fill="${S}" fill-opacity="0.08"/>`,
  `<polygon points="100,185 100,125 108,158" fill="${S}" fill-opacity="0.08"/>`,
  `<polygon points="185,100 125,100 158,108" fill="${S}" fill-opacity="0.08"/>`,
  `<polygon points="15,100 75,100 42,108" fill="${S}" fill-opacity="0.08"/>`,
  // Intercardinal points — double-line triangles for more substance
  `<polygon points="38,38 68,72 74,66" stroke="${S}" stroke-width="1" stroke-linejoin="round"/>`,
  `<polygon points="40,40 66,70 72,64" stroke="${S}" stroke-width="0.4" stroke-linejoin="round"/>`,
  `<polygon points="162,38 132,72 126,66" stroke="${S}" stroke-width="1" stroke-linejoin="round"/>`,
  `<polygon points="160,40 134,70 128,64" stroke="${S}" stroke-width="0.4" stroke-linejoin="round"/>`,
  `<polygon points="38,162 68,128 74,134" stroke="${S}" stroke-width="1" stroke-linejoin="round"/>`,
  `<polygon points="40,160 66,130 72,136" stroke="${S}" stroke-width="0.4" stroke-linejoin="round"/>`,
  `<polygon points="162,162 132,128 126,134" stroke="${S}" stroke-width="1" stroke-linejoin="round"/>`,
  `<polygon points="160,160 134,130 128,136" stroke="${S}" stroke-width="0.4" stroke-linejoin="round"/>`,
  // North fleur-de-lis — more elaborate
  `<path d="M100,8 Q94,2 90,6" stroke="${S}" stroke-width="0.8" stroke-linecap="round"/>`,
  `<path d="M100,8 Q106,2 110,6" stroke="${S}" stroke-width="0.8" stroke-linecap="round"/>`,
  `<path d="M100,12 Q96,8 93,10" stroke="${S}" stroke-width="0.5"/>`,
  `<path d="M100,12 Q104,8 107,10" stroke="${S}" stroke-width="0.5"/>`,
  `<circle cx="100" cy="10" r="1.2" fill="${S}"/>`,
  // Small decorative dots between cardinal points on outer ring
  `<circle cx="100" cy="8" r="0.6" fill="${S}"/>`,
  `<circle cx="192" cy="100" r="0.6" fill="${S}"/>`,
  `<circle cx="100" cy="192" r="0.6" fill="${S}"/>`,
  `<circle cx="8" cy="100" r="0.6" fill="${S}"/>`,
  // Degree tick marks (major + minor)
  TICK_MARKS,
  MINOR_TICKS,
  // Cross-hatching — between outer and mid rings (NE quadrant)
  `<line x1="120" y1="65" x2="130" y2="55" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="125" y1="70" x2="135" y2="60" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="130" y1="75" x2="138" y2="67" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="135" y1="80" x2="140" y2="75" stroke="${S}" stroke-width="0.2"/>`,
  // SE quadrant
  `<line x1="120" y1="135" x2="130" y2="145" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="125" y1="130" x2="135" y2="140" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="130" y1="125" x2="138" y2="133" stroke="${S}" stroke-width="0.2"/>`,
  // SW quadrant
  `<line x1="80" y1="135" x2="70" y2="145" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="75" y1="130" x2="65" y2="140" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="70" y1="125" x2="62" y2="133" stroke="${S}" stroke-width="0.2"/>`,
  // NW quadrant
  `<line x1="80" y1="65" x2="70" y2="55" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="75" y1="70" x2="65" y2="60" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="70" y1="75" x2="62" y2="67" stroke="${S}" stroke-width="0.2"/>`,
  // Near-center hatching
  `<line x1="90" y1="80" x2="85" y2="90" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="110" y1="80" x2="115" y2="90" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="90" y1="120" x2="85" y2="110" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="110" y1="120" x2="115" y2="110" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="88" y1="84" x2="82" y2="92" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="112" y1="84" x2="118" y2="92" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="88" y1="116" x2="82" y2="108" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="112" y1="116" x2="118" y2="108" stroke="${S}" stroke-width="0.2"/>`,
].join('');

// ─── TREBUCHET ────────────────────────────────────────────────────────────────
const TREBUCHET_CONTENT = [
  // Base frame
  `<line x1="30" y1="175" x2="170" y2="175" stroke="${S}" stroke-width="2.5"/>`,
  // Left wheel
  `<circle cx="50" cy="175" r="12" stroke="${S}" stroke-width="2"/>`,
  `<circle cx="50" cy="175" r="3" stroke="${S}" stroke-width="1"/>`,
  `<line x1="50" y1="163" x2="50" y2="187" stroke="${S}" stroke-width="0.5"/>`,
  `<line x1="38" y1="175" x2="62" y2="175" stroke="${S}" stroke-width="0.5"/>`,
  `<line x1="41" y1="167" x2="59" y2="183" stroke="${S}" stroke-width="0.35"/>`,
  `<line x1="59" y1="167" x2="41" y2="183" stroke="${S}" stroke-width="0.35"/>`,
  // Right wheel
  `<circle cx="150" cy="175" r="12" stroke="${S}" stroke-width="2"/>`,
  `<circle cx="150" cy="175" r="3" stroke="${S}" stroke-width="1"/>`,
  `<line x1="150" y1="163" x2="150" y2="187" stroke="${S}" stroke-width="0.5"/>`,
  `<line x1="138" y1="175" x2="162" y2="175" stroke="${S}" stroke-width="0.5"/>`,
  `<line x1="141" y1="167" x2="159" y2="183" stroke="${S}" stroke-width="0.35"/>`,
  `<line x1="159" y1="167" x2="141" y2="183" stroke="${S}" stroke-width="0.35"/>`,
  // A-frame uprights
  `<line x1="80" y1="175" x2="100" y2="70" stroke="${S}" stroke-width="2.5"/>`,
  `<line x1="120" y1="175" x2="100" y2="70" stroke="${S}" stroke-width="2.5"/>`,
  // A-frame cross brace
  `<line x1="88" y1="135" x2="112" y2="135" stroke="${S}" stroke-width="1.5"/>`,
  // A-frame hatching — left leg
  `<line x1="84" y1="160" x2="90" y2="155" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="86" y1="150" x2="92" y2="145" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="88" y1="140" x2="94" y2="135" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="90" y1="125" x2="96" y2="120" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="92" y1="115" x2="97" y2="110" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="94" y1="105" x2="98" y2="100" stroke="${S}" stroke-width="0.2"/>`,
  // A-frame hatching — right leg
  `<line x1="116" y1="160" x2="110" y2="155" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="114" y1="150" x2="108" y2="145" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="112" y1="140" x2="106" y2="135" stroke="${S}" stroke-width="0.25"/>`,
  // Pivot
  `<circle cx="100" cy="70" r="4" stroke="${S}" stroke-width="2"/>`,
  // Throwing arm — long end (sling side)
  `<line x1="100" y1="70" x2="45" y2="30" stroke="${S}" stroke-width="2"/>`,
  // Sling
  `<path d="M45,30 Q35,35 38,45" stroke="${S}" stroke-width="1.5" fill="none"/>`,
  `<circle cx="38" cy="47" r="5" stroke="${S}" stroke-width="1.5"/>`,
  // Sling pouch hatching
  `<line x1="35" y1="44" x2="41" y2="50" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="36" y1="48" x2="40" y2="46" stroke="${S}" stroke-width="0.25"/>`,
  // Throwing arm — short end (counterweight side)
  `<line x1="100" y1="70" x2="135" y2="100" stroke="${S}" stroke-width="2"/>`,
  // Counterweight box
  `<rect x="125" y="100" width="20" height="18" stroke="${S}" stroke-width="1.5" rx="2"/>`,
  // Counterweight hatching
  `<line x1="127" y1="102" x2="143" y2="116" stroke="${S}" stroke-width="0.4"/>`,
  `<line x1="127" y1="108" x2="137" y2="116" stroke="${S}" stroke-width="0.4"/>`,
  `<line x1="133" y1="102" x2="143" y2="110" stroke="${S}" stroke-width="0.4"/>`,
  `<line x1="127" y1="105" x2="143" y2="113" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="130" y1="102" x2="140" y2="116" stroke="${S}" stroke-width="0.3"/>`,
  // Diagonal braces
  `<line x1="80" y1="175" x2="65" y2="155" stroke="${S}" stroke-width="0.8"/>`,
  `<line x1="120" y1="175" x2="135" y2="155" stroke="${S}" stroke-width="0.8"/>`,
  `<line x1="65" y1="155" x2="135" y2="155" stroke="${S}" stroke-width="0.6"/>`,
  // Throwing arm hatching
  `<line x1="62" y1="40" x2="68" y2="34" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="72" y1="48" x2="78" y2="42" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="82" y1="56" x2="88" y2="50" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="105" y1="74" x2="111" y2="78" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="115" y1="82" x2="121" y2="86" stroke="${S}" stroke-width="0.25"/>`,
  // Ground texture lines
  `<line x1="20" y1="188" x2="50" y2="188" stroke="${S}" stroke-width="0.4"/>`,
  `<line x1="70" y1="190" x2="110" y2="190" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="140" y1="188" x2="180" y2="188" stroke="${S}" stroke-width="0.4"/>`,
  `<line x1="25" y1="192" x2="60" y2="192" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="130" y1="193" x2="175" y2="193" stroke="${S}" stroke-width="0.25"/>`,
].join('');

// ─── CASTLE ───────────────────────────────────────────────────────────────────
// Multi-structure castle: central keep, flanking towers, curtain wall, gatehouse
const CASTLE_CONTENT = [
  // Ground line
  `<line x1="10" y1="180" x2="190" y2="180" stroke="${S}" stroke-width="1.5"/>`,
  `<line x1="15" y1="184" x2="70" y2="184" stroke="${S}" stroke-width="0.3"/>`,
  `<line x1="130" y1="185" x2="185" y2="185" stroke="${S}" stroke-width="0.3"/>`,

  // ── Left tower ──
  `<rect x="18" y="55" width="32" height="125" stroke="${S}" stroke-width="2"/>`,
  // Left tower crenellations
  `<rect x="15" y="40" width="10" height="17" stroke="${S}" stroke-width="1.3"/>`,
  `<rect x="28" y="40" width="10" height="17" stroke="${S}" stroke-width="1.3"/>`,
  `<rect x="41" y="40" width="10" height="17" stroke="${S}" stroke-width="1.3"/>`,
  // Left tower arrow slit
  `<line x1="34" y1="80" x2="34" y2="96" stroke="${S}" stroke-width="1.5"/>`,
  `<line x1="30" y1="88" x2="38" y2="88" stroke="${S}" stroke-width="0.6"/>`,
  // Left tower window
  `<path d="M28,120 L28,110 Q34,104 40,110 L40,120" stroke="${S}" stroke-width="1"/>`,
  // Left tower stone hatching
  `<line x1="20" y1="70" x2="48" y2="70" stroke="${S}" stroke-width="0.4"/>`,
  `<line x1="20" y1="100" x2="48" y2="100" stroke="${S}" stroke-width="0.4"/>`,
  `<line x1="20" y1="130" x2="48" y2="130" stroke="${S}" stroke-width="0.4"/>`,
  `<line x1="20" y1="155" x2="48" y2="155" stroke="${S}" stroke-width="0.4"/>`,
  // Left tower right-side shadow
  `<line x1="42" y1="58" x2="48" y2="64" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="42" y1="64" x2="48" y2="70" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="42" y1="72" x2="48" y2="78" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="42" y1="102" x2="48" y2="108" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="42" y1="108" x2="48" y2="114" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="42" y1="132" x2="48" y2="138" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="42" y1="157" x2="48" y2="163" stroke="${S}" stroke-width="0.2"/>`,

  // ── Right tower ──
  `<rect x="150" y="55" width="32" height="125" stroke="${S}" stroke-width="2"/>`,
  // Right tower crenellations
  `<rect x="147" y="40" width="10" height="17" stroke="${S}" stroke-width="1.3"/>`,
  `<rect x="160" y="40" width="10" height="17" stroke="${S}" stroke-width="1.3"/>`,
  `<rect x="173" y="40" width="10" height="17" stroke="${S}" stroke-width="1.3"/>`,
  // Right tower arrow slit
  `<line x1="166" y1="80" x2="166" y2="96" stroke="${S}" stroke-width="1.5"/>`,
  `<line x1="162" y1="88" x2="170" y2="88" stroke="${S}" stroke-width="0.6"/>`,
  // Right tower window
  `<path d="M160,120 L160,110 Q166,104 172,110 L172,120" stroke="${S}" stroke-width="1"/>`,
  // Right tower stone lines
  `<line x1="152" y1="70" x2="180" y2="70" stroke="${S}" stroke-width="0.4"/>`,
  `<line x1="152" y1="100" x2="180" y2="100" stroke="${S}" stroke-width="0.4"/>`,
  `<line x1="152" y1="130" x2="180" y2="130" stroke="${S}" stroke-width="0.4"/>`,
  `<line x1="152" y1="155" x2="180" y2="155" stroke="${S}" stroke-width="0.4"/>`,
  // Right tower shadow hatching
  `<line x1="174" y1="58" x2="180" y2="64" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="174" y1="64" x2="180" y2="70" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="174" y1="72" x2="180" y2="78" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="174" y1="102" x2="180" y2="108" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="174" y1="132" x2="180" y2="138" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="174" y1="157" x2="180" y2="163" stroke="${S}" stroke-width="0.2"/>`,

  // ── Curtain wall (between towers) ──
  `<rect x="50" y="90" width="100" height="90" stroke="${S}" stroke-width="1.8"/>`,
  // Curtain wall crenellations
  `<rect x="50" y="78" width="8" height="14" stroke="${S}" stroke-width="1"/>`,
  `<rect x="63" y="78" width="8" height="14" stroke="${S}" stroke-width="1"/>`,
  `<rect x="76" y="78" width="8" height="14" stroke="${S}" stroke-width="1"/>`,
  `<rect x="89" y="78" width="8" height="14" stroke="${S}" stroke-width="1"/>`,
  `<rect x="102" y="78" width="8" height="14" stroke="${S}" stroke-width="1"/>`,
  `<rect x="115" y="78" width="8" height="14" stroke="${S}" stroke-width="1"/>`,
  `<rect x="128" y="78" width="8" height="14" stroke="${S}" stroke-width="1"/>`,
  `<rect x="141" y="78" width="8" height="14" stroke="${S}" stroke-width="1"/>`,
  // Stone courses on curtain wall
  `<line x1="50" y1="110" x2="150" y2="110" stroke="${S}" stroke-width="0.4"/>`,
  `<line x1="50" y1="135" x2="150" y2="135" stroke="${S}" stroke-width="0.4"/>`,
  `<line x1="50" y1="160" x2="85" y2="160" stroke="${S}" stroke-width="0.4"/>`,
  `<line x1="115" y1="160" x2="150" y2="160" stroke="${S}" stroke-width="0.4"/>`,
  // Stone vertical joints
  `<line x1="75" y1="90" x2="75" y2="110" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="125" y1="90" x2="125" y2="110" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="65" y1="110" x2="65" y2="135" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="100" y1="110" x2="100" y2="135" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="135" y1="110" x2="135" y2="135" stroke="${S}" stroke-width="0.25"/>`,

  // ── Gatehouse (in curtain wall) ──
  // Gate arch
  `<path d="M85,180 L85,148 Q100,130 115,148 L115,180" stroke="${S}" stroke-width="2"/>`,
  `<path d="M88,180 L88,150 Q100,134 112,150 L112,180" stroke="${S}" stroke-width="0.8"/>`,
  // Portcullis
  `<line x1="94" y1="148" x2="94" y2="180" stroke="${S}" stroke-width="0.4"/>`,
  `<line x1="100" y1="138" x2="100" y2="180" stroke="${S}" stroke-width="0.4"/>`,
  `<line x1="106" y1="148" x2="106" y2="180" stroke="${S}" stroke-width="0.4"/>`,
  `<line x1="88" y1="160" x2="112" y2="160" stroke="${S}" stroke-width="0.4"/>`,
  `<line x1="88" y1="170" x2="112" y2="170" stroke="${S}" stroke-width="0.4"/>`,

  // ── Central keep (behind curtain wall) ──
  `<rect x="68" y="22" width="64" height="68" stroke="${S}" stroke-width="2.2"/>`,
  // Keep crenellations
  `<rect x="65" y="8" width="10" height="16" stroke="${S}" stroke-width="1.3"/>`,
  `<rect x="79" y="8" width="10" height="16" stroke="${S}" stroke-width="1.3"/>`,
  `<rect x="95" y="8" width="10" height="16" stroke="${S}" stroke-width="1.3"/>`,
  `<rect x="111" y="8" width="10" height="16" stroke="${S}" stroke-width="1.3"/>`,
  `<rect x="125" y="8" width="10" height="16" stroke="${S}" stroke-width="1.3"/>`,
  // Keep windows
  `<path d="M85,50 L85,40 Q92,34 99,40 L99,50" stroke="${S}" stroke-width="1"/>`,
  `<path d="M105,50 L105,40 Q112,34 119,40 L119,50" stroke="${S}" stroke-width="1"/>`,
  // Keep stone courses
  `<line x1="68" y1="38" x2="132" y2="38" stroke="${S}" stroke-width="0.4"/>`,
  `<line x1="68" y1="55" x2="132" y2="55" stroke="${S}" stroke-width="0.4"/>`,
  `<line x1="68" y1="72" x2="132" y2="72" stroke="${S}" stroke-width="0.4"/>`,
  // Keep shadow hatching (right side)
  `<line x1="118" y1="24" x2="130" y2="36" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="118" y1="30" x2="130" y2="42" stroke="${S}" stroke-width="0.25"/>`,
  `<line x1="118" y1="40" x2="130" y2="52" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="118" y1="48" x2="130" y2="60" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="118" y1="56" x2="130" y2="68" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="118" y1="64" x2="130" y2="76" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="118" y1="72" x2="130" y2="84" stroke="${S}" stroke-width="0.2"/>`,

  // ── Flag on keep ──
  `<line x1="100" y1="8" x2="100" y2="-8" stroke="${S}" stroke-width="1"/>`,
  `<path d="M100,-8 Q112,-4 100,0" stroke="${S}" stroke-width="0.8" fill="none"/>`,
  `<path d="M100,-6 Q108,-4 100,-1" stroke="${S}" stroke-width="0.3" fill="none"/>`,

  // Curtain wall shadow hatching
  `<line x1="138" y1="92" x2="148" y2="102" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="138" y1="98" x2="148" y2="108" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="138" y1="112" x2="148" y2="122" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="138" y1="118" x2="148" y2="128" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="138" y1="137" x2="148" y2="147" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="138" y1="143" x2="148" y2="153" stroke="${S}" stroke-width="0.2"/>`,
  `<line x1="138" y1="162" x2="148" y2="172" stroke="${S}" stroke-width="0.2"/>`,
].join('');

// ─── SVG Wrapper ──────────────────────────────────────────────────────────────

function makeSvgUri(content: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" opacity="0.10">${content}</svg>`
  )}")`;
}

function SvgComponent({ content }: { content: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

function makeVariantComponent(content: string): FC {
  return () => <SvgComponent content={content} />;
}

const variantComponents: Record<WatermarkVariant, FC> = {
  swords: makeVariantComponent(SWORDS_CONTENT),
  compass: makeVariantComponent(COMPASS_CONTENT),
  trebuchet: makeVariantComponent(TREBUCHET_CONTENT),
  castle: makeVariantComponent(CASTLE_CONTENT),
};

export function Watermark({ variant, size = 300, style }: WatermarkProps) {
  const Svg = variantComponents[variant];
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
      <Svg />
    </Box>
  );
}

/*
 * Tiled watermark pattern that repeats vertically.
 * Uses CSS background-image with SVG data URIs generated from the same content
 * strings as the React components. Six separate background layers are staggered
 * with different background-position offsets, creating a non-uniform pattern.
 *
 * The variant order, sides, and offsets are shuffled once at module load so
 * each session sees a unique arrangement, but it stays consistent while the
 * page is open.
 */
const allUris = [
  makeSvgUri(COMPASS_CONTENT),
  makeSvgUri(TREBUCHET_CONTENT),
  makeSvgUri(SWORDS_CONTENT),
  makeSvgUri(CASTLE_CONTENT),
];

const SLOT_COUNT = 6;
const VERTICAL_SPACING = 600; // px between each slot's starting offset
const VERTICAL_START = 500;

// Shuffle an array in place (Fisher-Yates)
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Build randomised slot assignments once at module load
const tiledSlots = (() => {
  // Fill 6 slots from 4 variants: shuffle all 4, then pick 2 more at random
  const order = shuffle([...allUris]);
  while (order.length < SLOT_COUNT) {
    order.push(allUris[Math.floor(Math.random() * allUris.length)]);
  }
  shuffle(order);

  // Randomise sides — start with an even split, then shuffle
  const sides = shuffle(['left', 'right', 'left', 'right', 'left', 'right']);

  return order.map((uri, i) => {
    const hOffset = 20 + Math.floor(Math.random() * 25); // 20–44px
    const size = 160 + Math.floor(Math.random() * 25);   // 160–184px
    const vOffset = VERTICAL_START + i * VERTICAL_SPACING;
    return { uri, side: sides[i], hOffset, size, vOffset };
  });
})();

export function WatermarkTiled() {
  return (
    <Box
      position="absolute"
      inset={0}
      pointerEvents="none"
      zIndex={0}
      overflow="hidden"
      style={{
        backgroundImage: tiledSlots.map((s) => s.uri).join(', '),
        backgroundRepeat: 'repeat-y',
        backgroundSize: tiledSlots
          .map((s) => `${s.size}px 3600px`)
          .join(', '),
        backgroundPosition: tiledSlots
          .map((s) => `${s.side} ${s.hOffset}px top ${s.vOffset}px`)
          .join(', '),
      }}
    />
  );
}
