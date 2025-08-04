import { extendTheme } from '@chakra-ui/react';
import { cardAnatomy, anatomy } from '@chakra-ui/anatomy';
import { createMultiStyleConfigHelpers } from '@chakra-ui/react';

const { definePartsStyle: defineCardPartsStyle, defineMultiStyleConfig: defineCardMultiStyleConfig } = createMultiStyleConfigHelpers(cardAnatomy.keys);

const profileHeaderAnatomy = anatomy('profileHeader').parts(
  'container', 'avatar', 'name', 'id', 'statsTable'
);
const { definePartsStyle: defineProfileHeaderPartsStyle, defineMultiStyleConfig: defineProfileHeaderMultiStyleConfig } = createMultiStyleConfigHelpers(profileHeaderAnatomy.keys);

const playerStatsAnatomy = anatomy('playerStats').parts(
  'container', 'statsTable'
);
const { definePartsStyle: definePlayerStatsPartsStyle, defineMultiStyleConfig: definePlayerStatsMultiStyleConfig } = createMultiStyleConfigHelpers(playerStatsAnatomy.keys);

const rankingCardAnatomy = anatomy('rankingCard').parts(
  'container', 'rankingRow', 'leaderboardName', 'rankText', 'percentileText', 'rankingTable', 'tableHeader', 'tableRow', 'tableCell'
);
const { definePartsStyle: defineRankingCardPartsStyle, defineMultiStyleConfig: defineRankingCardMultiStyleConfig } = createMultiStyleConfigHelpers(rankingCardAnatomy.keys);

// Light theme colors
const lightColors = {
  brand: {
    midnightBlue: '#19214E', // Deep noble blue
    gold: '#D4AF37',         // Lustrous medieval gold
    bronzeLight: '#C8A26B',   // Lighter bronze accent
    bronze: '#B37A3E',       // Authentic bronze accent
    bronzeMedium: '#8B5A2B',    // Medium bronze for gradients
    bronzeDark: '#6B4423',      // Dark bronze for gradients
    bronzeDarkest: '#5A3A20',   // Darkest bronze for gradients
    black: '#1C1C1C',        // Rich charcoal for high legibility
    charcoal: '#2C3E50',     // Da Vinci charcoal background
    parchment: '#F8F3E6',    // Elegant parchment backdrop
    steel: '#5A6478',        // Cool steel grey for outlines
    lightSteel: '#A9B4C2',   // Lighter steel for backgrounds
    heraldic: '#243773',     // Royal heraldic blue
    slateBlue: '#4A5B7B',    // Muted blue for modern theme
    slateBorder: '#64728A',  // Border for slate blue theme
    white: '#fff', // Pure white for semantic use
    pureBlack: '#111', // Pure black for semantic use
    
    // High-contrast colors for light backgrounds
    darkWin: '#2E7D32',      // Better green for wins on light backgrounds
    darkLoss: '#D32F2F',     // Better red for losses on light backgrounds
    tableBorderOnLight: '#8894A2', // Table border for light steel bg
    modernTableBorder: '#4A5D9E', // Lighter blue for modern theme table

    // Thematic status colors from user feedback
    win: '#3AA76D',          // Bright victory green
    loss: '#D64545',         // Clear defeat red
    same: '#2B6CB0',         // Neutral status blue (unchanged)
    zoolanderBlue: '#1E4BB8',// Heroic highlight blue
    stone: '#E6E3D8',        // Light stone for subtle surfaces
    stoneLight: '#F2F0EA',   // Extra-light stone for zebra stripes
    fadedBlue: '#D1DFF7',    // Gentle faded blue
    
    // Dark background optimized colors
    brightGold: '#FFD700',   // Bolder gold for dark backgrounds
    brightSilver: '#D0D0D0', // Bright silver for dark backgrounds
    brightBronze: '#CD7F32', // Vibrant bronze for dark backgrounds
    brightGreen: '#4AE374', // Bright green for dark background wins
    brightRed: '#FF8282',   // Bright red for dark background losses
    contrastRed: '#FF6B94', // High contrast pinkish-red for very dark backgrounds
    
    // Tier ranking colors
    tierGoldDark: '#FFD700',      // Bright gold for dark theme
    tierGoldLight: '#D4AF37',     // Lustrous gold for light theme
    tierGoldGradientDark: '#FFB347', // Gold gradient end for dark theme
    tierGoldGradientLight: '#B8860B', // Gold gradient end for light theme
    
    tierSilverDark: '#C0C0C0',    // Bright silver for dark theme
    tierSilverLight: '#696969',   // Dark silver for light theme
    tierSilverGradientDark: '#D3D3D3', // Silver gradient end for dark theme
    tierSilverGradientLight: '#808080', // Silver gradient end for light theme
    
    tierBronzeDark: '#CD853F',    // Bright bronze for dark theme
    tierBronzeLight: '#8B4513',   // Dark bronze for light theme
    tierBronzeGradientDark: '#D2691E', // Bronze gradient end for dark theme
    tierBronzeGradientLight: '#A0522D', // Bronze gradient end for light theme
    
    // UI component backgrounds
    topbarBg: "linear-gradient(180deg, #f9fafb 0%, #e6e8ec 10%, #cfd2d6 60%, #b0b6be 100%)",
    topbarBgMd: "linear-gradient(180deg, #f9fafb 0%, #e6e8ec 20%, #cfd2d6 55%, #bfc4ca 100%)",
    landingBg: "linear-gradient(180deg, #f9fafb 0%, #e6e8ec 10%, #cfd2d6 60%, #b0b6be 100%)",
    landingBgMd: "linear-gradient(180deg, #f9fafb 0%, #e6e8ec 20%, #cfd2d6 55%, #bfc4ca 100%)",
    
    // Session header - enhanced stone-like texture with subtle contrast for header prominence
    sessionHeaderBg: `
      linear-gradient(135deg, #E8E5DA 0%, #E2DFD4 25%, #DCD9CE 50%, #D6D3C8 75%, #D0CDC2 100%),
      repeating-linear-gradient(135deg, rgba(139, 90, 43, 0.06) 0px, rgba(139, 90, 43, 0.06) 2px, transparent 2px, transparent 8px),
      radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 60%)
    `,
    
    // UI element backgrounds
    cardBg: '#ffffff',
    inputBg: '#ffffff',
    
    // Gradient colors for UI elements
    heroGradientStart: 'rgba(255,255,255,0.7)',
    heroGradientEnd: 'rgba(255,255,255,0.1)',
    
    // Shadow and border colors
    shadowLight: 'rgba(0,0,0,0.05)',
    shadowMedium: 'rgba(0,0,0,0.07)',
    shadowGold: 'rgba(212,175,55,0.4)',
    borderLight: '#eee',
    textShadowLight: '#fff',
    textShadowAlpha: 'rgba(0,0,0,0.04)',
    
    // Animation glow colors
    sunGlow: 'rgba(255, 215, 0, 0.3)',
    sunGlowBright: 'rgba(255, 215, 0, 0.6)',
    sunGlowDim: 'rgba(255, 215, 0, 0.2)',
    sunColor: '#D4AF37',
    sunBg: 'rgba(255, 215, 0, 0.1)',
    sunBorder: 'rgba(212, 175, 55, 0.3)',
    sunRadialGradient: 'radial-gradient(circle at 30% 30%, rgba(255, 215, 0, 0.1), transparent 70%)',
    sunRadialGradientBg: 'radial-gradient(circle, rgba(255, 215, 0, 0.05) 0%, transparent 70%)',
    // Session group card colors
    sessionCardBg: '#f4f4f6',
    sessionCardBorder: '#e0e0e6',
    
    // Stamp button colors
    stampBg: `
      linear-gradient(135deg, 
        #8B4513 0%,   /* Saddle brown */ 
        #A0522D 25%,  /* Sienna */
        #8B4513 100%  /* Saddle brown */
      ),
      repeating-linear-gradient(45deg, transparent 0px, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 3px),
      radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 70% 70%, rgba(0, 0, 0, 0.1) 0%, transparent 40%)
    `,
    stampBgHover: `
      linear-gradient(135deg, 
        #A0522D 0%,   /* Sienna */ 
        #CD853F 25%,  /* Peru */
        #A0522D 100%  /* Sienna */
      ),
      repeating-linear-gradient(45deg, transparent 0px, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 3px),
      radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 50%),
      radial-gradient(circle at 70% 70%, rgba(0, 0, 0, 0.15) 0%, transparent 40%)
    `,
    stampBorder: '#654321',
    stampText: '#654321',
    stampTextShadow: `
      1px 1px 0px rgba(255,255,255,0.8),
      -1px -1px 0px rgba(0,0,0,0.3)
    `,
    stampShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2), inset 0 -1px 1px rgba(255,255,255,0.1)',
    stampShadowHover: 'inset 0 2px 4px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3), inset 0 -1px 1px rgba(255,255,255,0.15)',
    // Enhanced parchment texture: stronger vignette plus ultra-subtle grain for depth
    parchmentSurface: `
      radial-gradient(circle at 50% 45%, rgba(255,255,255,0.9) 0%, rgba(248,243,230,0.95) 12%, rgba(0,0,0,0.12) 100%),
      repeating-linear-gradient(135deg,  rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 2px, transparent 2px, transparent 6px),
      repeating-linear-gradient(45deg,   rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 2px, transparent 2px, transparent 6px),
      #F8F3E6
    `,
    // Alternate parchment without central glow – ideal for small list items
    parchmentSurfaceItem: `
      repeating-linear-gradient(135deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 5px),
      repeating-linear-gradient(45deg,  rgba(0,0,0,0.025) 0px, rgba(0,0,0,0.025) 2px, transparent 2px, transparent 6px),
      #F8F3E6
    `,
    
    // Da Vinci-inspired link colors (light theme)
    linkDefault: '#8B4513',       // Saddle Brown
    linkHover: '#CD853F',         // Peru
  },
};

// Dark theme colors
const darkColors = {
  brand: {
    // Core background/surface colors
    midnightBlue: '#F7FAFC',      // Light text on dark bg
    gold: '#FFD700',              // Brighter gold for dark bg
    bronzeLight: '#CFA46B',      // Lighter bronze accent (dark mode)
    bronze: '#CD7F32',            // Keep bronze vibrant
    bronzeMedium: '#8B5A2B',      // Medium bronze for gradients
    bronzeDark: '#6B4423',        // Dark bronze for gradients
    bronzeDarkest: '#5A3A20',     // Darkest bronze for gradients
    black: '#F7FAFC',             // Light text
    parchment: '#1A1A1A',         // Dark background
    steel: '#CBD5E0',             // Lighter steel for dark bg
    lightSteel: '#2D3748',        // Darker for cards/surfaces
    heraldic: '#90CDF4',          // Light blue
    slateBlue: '#2D3748',         // Dark slate for cards
    slateBorder: '#4A5568',       // Darker border
    white: '#fff', // Pure white for semantic use
    pureBlack: '#111', // Pure black for semantic use
    
    // Status colors (keep vibrant for contrast)
    darkWin: '#48BB78',           // Brighter green
    darkLoss: '#F56565',          // Brighter red
    tableBorderOnLight: '#4A5568',
    modernTableBorder: '#90CDF4',
    
    // Da Vinci-inspired link colors (dark theme)
    linkDefault: '#90CDF4',       // Light blue (original heraldic)
    linkHover: '#FFD700',         // Gold (original hover)
    
    win: '#48BB78',
    loss: '#F56565', 
    same: '#90CDF4',
    zoolanderBlue: '#90CDF4',
    stone: '#2D3748',             // Dark stone
    stoneLight: '#1A202C',        // Darker stone
    fadedBlue: '#2A4A6B',         // Darker faded blue
    
    // Dark optimized colors
    brightGold: '#FFD700',
    brightSilver: '#E2E8F0',
    brightBronze: '#CD7F32', 
    brightGreen: '#48BB78',
    brightRed: '#F56565',
    contrastRed: '#F56565',
    
    // Tier ranking colors for dark theme
    tierGoldDark: '#FFD700',      // Bright gold for dark theme
    tierGoldLight: '#D4AF37',     // Lustrous gold for light theme
    tierGoldGradientDark: '#FFB347', // Gold gradient end for dark theme
    tierGoldGradientLight: '#B8860B', // Gold gradient end for light theme
    
    tierSilverDark: '#C0C0C0',    // Bright silver for dark theme
    tierSilverLight: '#696969',   // Dark silver for light theme
    tierSilverGradientDark: '#D3D3D3', // Silver gradient end for dark theme
    tierSilverGradientLight: '#808080', // Silver gradient end for light theme
    
    tierBronzeDark: '#CD853F',    // Bright bronze for dark theme
    tierBronzeLight: '#8B4513',   // Dark bronze for light theme
    tierBronzeGradientDark: '#D2691E', // Bronze gradient end for dark theme
    tierBronzeGradientLight: '#A0522D', // Bronze gradient end for light theme
    
    // UI component backgrounds
    topbarBg: "linear-gradient(180deg, #2D3748 0%, #1A202C 10%, #171923 60%, #0F0F0F 100%)",
    topbarBgMd: "linear-gradient(180deg, #2D3748 0%, #1A202C 20%, #171923 55%, #0F0F0F 100%)",
    landingBg: "linear-gradient(180deg, #2D3748 0%, #1A202C 10%, #171923 60%, #0F0F0F 100%)",
    landingBgMd: "linear-gradient(180deg, #2D3748 0%, #1A202C 20%, #171923 55%, #0F0F0F 100%)",
    
    // Session header - dark slate with subtle texture (dark mode)
    sessionHeaderBg: `
      linear-gradient(135deg, #2D3748 0%, #1A202C 25%, #171923 50%, #1A202C 75%, #2D3748 100%),
      repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0px, rgba(255, 255, 255, 0.02) 2px, transparent 2px, transparent 8px)
    `,
    
    // UI element backgrounds
    cardBg: '#2D3748',
    inputBg: '#2D3748',
    
    // Gradient colors for UI elements
    heroGradientStart: 'rgba(45,55,72,0.9)',
    heroGradientEnd: 'rgba(45,55,72,0.3)',
    
    // Shadow and border colors
    shadowLight: 'rgba(0,0,0,0.3)',
    shadowMedium: 'rgba(0,0,0,0.4)',
    shadowGold: 'rgba(255,215,0,0.4)',
    borderLight: '#4A5568',
    textShadowLight: 'rgba(0,0,0,0.8)',
    textShadowAlpha: 'rgba(255,255,255,0.1)',
    
    // Animation glow colors (moon theme)
    sunGlow: 'rgba(147, 197, 253, 0.3)',
    sunGlowBright: 'rgba(147, 197, 253, 0.6)',
    sunGlowDim: 'rgba(147, 197, 253, 0.2)',
    sunColor: '#93C5FD',
    sunBg: 'rgba(147, 197, 253, 0.1)',
    sunBorder: 'rgba(147, 197, 253, 0.3)',
    sunRadialGradient: 'radial-gradient(circle at 30% 30%, rgba(147, 197, 253, 0.1), transparent 70%)',
    sunRadialGradientBg: 'radial-gradient(circle, rgba(147, 197, 253, 0.05) 0%, transparent 70%)',
    // Session group card colors (dark mode)
    sessionCardBg: '#2D3748',
    sessionCardBorder: '#4A5568',
    
    // Stamp button colors (dark mode)
    stampBg: `
      linear-gradient(135deg, 
        #4A5568 0%,   /* Dark slate */ 
        #2D3748 25%,  /* Darker slate */
        #4A5568 100%  /* Dark slate */
      ),
      repeating-linear-gradient(45deg, transparent 0px, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 3px),
      radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.05) 0%, transparent 50%),
      radial-gradient(circle at 70% 70%, rgba(0, 0, 0, 0.2) 0%, transparent 40%)
    `,
    stampBgHover: `
      linear-gradient(135deg, 
        #2D3748 0%,   /* Darker slate */ 
        #1A202C 25%,  /* Even darker slate */
        #2D3748 100%  /* Darker slate */
      ),
      repeating-linear-gradient(45deg, transparent 0px, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 3px),
      radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 70% 70%, rgba(0, 0, 0, 0.25) 0%, transparent 40%)
    `,
    stampBorder: '#2D3748',
    stampText: '#E2E8F0',
    stampTextShadow: `
      1px 1px 0px rgba(0,0,0,0.8),
      -1px -1px 0px rgba(255,255,255,0.2)
    `,
    stampShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3), inset 0 -1px 1px rgba(255,255,255,0.05)',
    stampShadowHover: 'inset 0 2px 4px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4), inset 0 -1px 1px rgba(255,255,255,0.08)',
    // Textured parchment for dark mode: deeper vignette plus faint cross-hatch grain
    parchmentSurface: `
      radial-gradient(circle at 50% 45%, rgba(60,70,90,0.55) 0%, rgba(0,0,0,0.25) 100%),
      repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 6px),
      repeating-linear-gradient(45deg,  rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 6px),
      #1A1A1A
    `,
    // Dark-mode list-item parchment without bright center
    parchmentSurfaceItem: `
      repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 2px, transparent 2px, transparent 6px),
      repeating-linear-gradient(45deg,  rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 6px),
      #1A1A1A
    `,
  },
};

// Centralized spacing constants
const spacing = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '3rem',    // 48px
  
  // Component-specific spacing
  component: {
    profileSpacing: '0.5rem',      // 8px - spacing between profile elements
    statsSpacing: '0.5rem',        // 8px - spacing between stats elements
    cardSpacing: '1rem',           // 16px - spacing between cards
    sectionSpacing: '1.5rem',      // 24px - spacing between major sections
  },
  
  // Responsive spacing patterns
  responsive: {
    landingSpacing: { base: '0.25rem', md: '1rem' },     // Landing page main spacing
    landingPadding: { base: '0.5rem', md: '2rem' },      // Landing page padding
    sectionSpacing: { base: '2rem', md: '3rem' },        // Major section spacing
  }
};

// Recreate the reusable style objects from breakpoints.ts for card layout
const matchCardStyles = {
  base: {
    padding: '0.5rem',
    marginBottom: '0.5rem',
  },
  lg: {
    padding: '0.5rem',
    marginBottom: '0.5rem',
  },
  desktop: {
    padding: '0.75rem',
    marginBottom: '0.75rem',
  },
};

const profileHeaderTheme = defineProfileHeaderMultiStyleConfig({
  baseStyle: defineProfileHeaderPartsStyle({
    container: {
      width: '100%',
      height: 'auto',
      padding: { base: '0.5rem', md: '1rem', lg: '1.25rem' },
      position: 'relative',
    },
    avatar: {
      bg: 'white',
      border: '2px solid',
      borderColor: 'brand.gold',
      width: '100px',
      height: '100px',
      '@media (min-width: 768px)': {
        width: '110px',
        height: '110px',
      },
      '@media (min-width: 1280px)': {
        width: '120px',
        height: '120px',
      }
    },
    name: {
      color: 'brand.midnightBlue',
      fontWeight: 'bold',
      fontSize: 'lg',
      '@media (min-width: 768px)': {
        fontSize: 'xl',
      },
    },
    id: {
      color: 'brand.steel',
      fontSize: 'xs',
    },
    statsTable: {
      th: {
        color: 'brand.midnightBlue',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        fontSize: '2xs',
      },
      td: {
        color: 'brand.black',
        fontSize: 'xs',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        overflow: 'hidden',
      },
      '.rank': {
        color: 'brand.zoolanderBlue',
        fontWeight: '900',
      },
      '.percentile': {
        color: 'brand.steel',
        fontSize: 'xs',
        fontWeight: 'bold',
      },
      '.win': {
        color: 'brand.win',
      },
      '.loss': {
        color: 'brand.loss',
      },
      '.streak': {
        color: 'brand.win',
      }
    },
    }),
});

// Function to create theme based on dark mode
export function createTheme(isDark: boolean) {
  const colors = isDark ? darkColors : lightColors;
  
  // Dynamic card theme based on mode
  const dynamicCardTheme = defineCardMultiStyleConfig({
    variants: {
      match: defineCardPartsStyle({
        container: {
          backgroundColor: isDark ? 'brand.lightSteel' : 'white',
          borderWidth: '1px',
          borderColor: isDark ? 'brand.slateBorder' : 'brand.slateBorder',
          borderRadius: 'lg',
          boxShadow: isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          padding: {
            base: matchCardStyles.base.padding,
            md: matchCardStyles.lg.padding,
            xl: matchCardStyles.desktop.padding,
          },
          marginBottom: {
            base: matchCardStyles.base.marginBottom,
            md: matchCardStyles.lg.marginBottom,
            xl: matchCardStyles.desktop.marginBottom,
          },
          transition: 'all 0.3s ease',
        }
      }),
      summary: defineCardPartsStyle({
        container: {
          backgroundColor: isDark ? 'brand.lightSteel' : 'brand.stone',
          borderWidth: '1px',
          borderColor: isDark ? 'brand.slateBorder' : 'brand.steel',
          borderRadius: 'md',
          transition: 'all 0.3s ease',
        }
      }),
      winner: defineCardPartsStyle({
        container: {
          bg:  isDark ? 'brand.stoneLight' : 'brand.stoneLight',
          borderColor: 'brand.gold',
          boxShadow: '0 0 8px rgba(212,175,55,0.6)',
          borderWidth: '2px',
          borderRadius: 'md',
          p: 1,
          transition: 'all 0.3s ease',
        }
      }),
      loser: defineCardPartsStyle({
        container: {
          bg: isDark ? 'brand.stoneLight' : 'brand.stoneLight',
          borderColor: isDark ? 'brand.slateBorder' : 'brand.steel',
          borderWidth: '1px',
          borderRadius: 'md',
          boxShadow: isDark ? '0 0 4px rgba(0,0,0,0.4)' : '0 0 6px rgba(0,0,0,0.06)',
          p: 1,
          transition: 'all 0.3s ease',
        }
      }),
      filter: defineCardPartsStyle({
        container: {
          bg: 'brand.sessionCardBg',
          borderWidth: '1px',
          borderColor: 'brand.slateBorder',
          borderRadius: 'lg',
          boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
          transition: 'all 0.3s ease',
        }
      }),
      recordBubble: defineCardPartsStyle({
        container: {
          bg: isDark ? 'brand.slateBlue' : '#f0e6d2', // Warmer, more aged parchment
          color: isDark ? 'brand.steel' : 'brand.black',
          borderColor: isDark ? 'brand.slateBorder' : 'rgba(139, 90, 43, 0.3)',
          borderWidth: '2px',
          borderRadius: 'md',
          backgroundImage: isDark ? 'none' : `
            linear-gradient(135deg, #f0e6d2 0%, #e8dcc8 25%, #e0d2be 50%, #d8c8b4 75%, #d0bcaa 100%),
            repeating-linear-gradient(45deg, rgba(139, 90, 43, 0.04) 0px, rgba(139, 90, 43, 0.04) 1px, transparent 1px, transparent 3px),
            repeating-linear-gradient(-45deg, rgba(139, 90, 43, 0.02) 0px, rgba(139, 90, 43, 0.02) 1px, transparent 1px, transparent 6px),
            radial-gradient(ellipse at 30% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 60%),
            radial-gradient(ellipse at 70% 70%, rgba(139, 90, 43, 0.05) 0%, transparent 40%)
          `,
          boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 3px 8px rgba(139, 90, 43, 0.15), 0 1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)',
          px: { base: 1, md: 3 },
          py: 1,
          fontSize: '0.8125rem',
          fontWeight: 'bold',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          position: 'relative',
          _before: isDark ? {} : {
            content: '""',
            position: 'absolute',
            top: '2px',
            left: '2px',
            right: '2px',
            bottom: '2px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
            pointerEvents: 'none',
            zIndex: 0
          },
          _hover: {
            boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.4)' : '0 4px 12px rgba(139, 90, 43, 0.2), 0 2px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)',
            transform: 'translateY(-2px)',
          }
        },
        body: {
          padding: 0,
          position: 'relative',
          zIndex: 1
        }
      }),
      matchesCountBubble: defineCardPartsStyle({
        container: {
          bg: isDark ? 'brand.slateBlue' : '#f0e6d2', // Warmer, more aged parchment
          color: isDark ? 'brand.steel' : 'brand.black',
          borderColor: isDark ? 'brand.slateBorder' : 'rgba(139, 90, 43, 0.3)',
          borderWidth: '2px',
          borderRadius: 'md',
          backgroundImage: isDark ? 'none' : `
            linear-gradient(135deg, #f0e6d2 0%, #e8dcc8 25%, #e0d2be 50%, #d8c8b4 75%, #d0bcaa 100%),
            repeating-linear-gradient(45deg, rgba(139, 90, 43, 0.04) 0px, rgba(139, 90, 43, 0.04) 1px, transparent 1px, transparent 3px),
            repeating-linear-gradient(-45deg, rgba(139, 90, 43, 0.02) 0px, rgba(139, 90, 43, 0.02) 1px, transparent 1px, transparent 6px),
            radial-gradient(ellipse at 30% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 60%),
            radial-gradient(ellipse at 70% 70%, rgba(139, 90, 43, 0.05) 0%, transparent 40%)
          `,
          px: { base: 1, md: 3 },
          width: '80px',
          py: 1,
          fontSize: '0.8125rem',
          fontWeight: 'extrabold',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 3px 8px rgba(139, 90, 43, 0.15), 0 1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)',
          transition: 'all 0.3s ease',
          position: 'relative',
          _before: isDark ? {} : {
            content: '""',
            position: 'absolute',
            top: '2px',
            left: '2px',
            right: '2px',
            bottom: '2px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
            pointerEvents: 'none',
            zIndex: 0
          },
          _hover: {
            boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.4)' : '0 4px 12px rgba(139, 90, 43, 0.2), 0 2px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)',
            transform: 'translateY(-2px)',
          }
        },
        body: {
          padding: 0,
          position: 'relative',
          zIndex: 1
        }
      }),
    },
  });

  // Dynamic PlayerStats theme
  const dynamicPlayerStatsTheme = definePlayerStatsMultiStyleConfig({
    baseStyle: definePlayerStatsPartsStyle({
      container: {
        bg: isDark ? 'brand.lightSteel' : 'brand.parchment',
        borderColor: isDark ? 'brand.slateBorder' : 'brand.bronze',
        borderRadius: 'lg',
        padding: '1rem',
        boxShadow: isDark ? 'md' : '0 2px 8px rgba(139, 90, 43, 0.15)',
        borderWidth: '1px',
        transition: 'all 0.3s ease',
      },
      statsTable: {
        th: {
          color: isDark ? 'brand.steel' : 'brand.midnightBlue',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          fontSize: '2xs',
          fontWeight: 'bold',
          padding: '0.35rem 0.15rem',
        },
        td: {
          color: isDark ? 'brand.midnightBlue' : 'brand.black',
          borderColor: isDark ? 'brand.slateBorder' : 'brand.bronzeLight',
          fontSize: 'xs',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          padding: '0.35rem 0.15rem',
        },
        '.rank': {
          color: isDark ? 'brand.zoolanderBlue' : 'brand.midnightBlue',
          fontWeight: '700',
        },
        '.percentile': {
          color: isDark ? 'brand.midnightBlue' : 'brand.black',
          fontSize: 'xs',
          fontWeight: 'bold',
        },
        '.win': {
          color: isDark ? 'brand.brightGreen' : 'brand.darkWin',
          fontWeight: 'bold',
        },
        '.loss': {
          color: isDark ? 'brand.brightRed' : 'brand.darkLoss',
          fontWeight: 'bold',
        },
        '.streak': {
          color: isDark ? 'brand.brightGreen' : 'brand.darkWin',
          fontWeight: 'bold',
        },
        'tr:last-child td': {
          borderBottom: 'none',
        },
      },
    }),
  });

  // Dynamic RankingCard theme
  const dynamicRankingCardTheme = defineRankingCardMultiStyleConfig({
    baseStyle: defineRankingCardPartsStyle({
      container: {
        bg: isDark ? 'brand.lightSteel' : 'brand.parchment',
        borderColor: isDark ? 'brand.slateBorder' : 'brand.bronze',
        borderRadius: 'lg',
        padding: '0.3rem',
        boxShadow: isDark ? 'md' : '0 2px 8px rgba(139, 90, 43, 0.15)',
        borderWidth: '1px',
        transition: 'all 0.3s ease',
        minW: { base: '100%', md: '220px' },
        maxW: { base: '100%', md: '240px' },
      },
      rankingRow: {
        padding: '0.25rem 0.5rem',
        borderRadius: 'md',
        borderWidth: '1px',
        borderColor: isDark ? 'brand.slateBorder' : 'brand.bronzeLight',
        bg: isDark ? 'brand.slateBlue' : 'brand.stoneLight',
        transition: 'all 0.2s ease',
        _hover: {
          bg: isDark ? 'brand.slateBorder' : 'brand.stone',
          transform: 'translateY(-1px)',
          boxShadow: isDark ? '0 2px 4px rgba(0,0,0,0.2)' : '0 2px 4px rgba(139, 90, 43, 0.1)',
        },
      },
      leaderboardName: {
        color: isDark ? 'brand.steel' : 'brand.midnightBlue',
        fontSize: '2xs',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      },
      rankText: {
        fontSize: 'xs',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
      },
      percentileText: {
        color: isDark ? 'brand.steel' : 'brand.steel',
        fontSize: 'xs',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
      },
      rankingTable: {
        borderCollapse: 'collapse',
        w: '100%',
      },
      tableHeader: {
        color: isDark ? 'brand.steel' : 'brand.midnightBlue',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        fontSize: '2xs',
        fontWeight: 'bold',
        textAlign: 'left',
        padding: '0.5rem',
        borderBottom: '1px solid',
        borderColor: isDark ? 'brand.slateBorder' : 'brand.bronzeLight',
      },
      tableRow: {
        borderBottom: '1px solid',
        borderColor: isDark ? 'brand.slateBorder' : 'brand.bronzeLight',
        _last: {
          borderBottom: 'none',
        },
      },
      tableCell: {
        padding: '0.5rem',
        verticalAlign: 'middle',
      },
    }),
  });

  return extendTheme({
    colors,
    spacing,
    styles: {
      global: {
        body: {
          bg: isDark ? '#0F0F0F' : { base: 'brand.parchment', md: 'brand.charcoal' },
          color: isDark ? 'brand.black' : 'brand.black',
          fontFamily: "'Lora', serif",
          fontSize: '15px',
          transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        },
        'a, button': {
          transition: 'all 0.2s ease-in-out',
        },
        '*, *::before, &::after': {
          borderColor: isDark ? 'brand.lightSteel' : 'brand.steel',
        },
        // Smooth transitions for all elements
        '*': {
          transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
        },
      },
    },
    components: {
      Heading: {
        baseStyle: {
          color: isDark ? 'brand.midnightBlue' : 'brand.midnightBlue',
          fontWeight: 600,
        },
      },
      Link: {
        baseStyle: {
          color: isDark ? '#C44536' : '#8B4513',
          _hover: {
            color: isDark ? '#E74C3C' : '#A0522D',
          },
        },
      },
      Button: {
        variants: {
          solid: {
            bg: isDark ? 'brand.lightSteel' : 'brand.midnightBlue',
            color: isDark ? 'brand.midnightBlue' : 'white',
            _hover: { 
              bg: isDark ? 'brand.slateBlue' : 'brand.heraldic' 
            },
          },
          outline: {
            borderColor: 'brand.gold',
            color: isDark ? 'brand.midnightBlue' : 'brand.midnightBlue',
            _hover: { 
              bg: isDark ? 'brand.gold' : '#b78b2b', 
              color: isDark ? 'brand.black' : 'white' 
            },
          },
        },
      },
      Divider: {
        baseStyle: {
          borderColor: isDark ? 'brand.slateBorder' : 'brand.stone',
          opacity: 0.4,
        },
      },
      Card: dynamicCardTheme,
      ProfileHeader: profileHeaderTheme,
      PlayerStats: dynamicPlayerStatsTheme,
      RankingCard: dynamicRankingCardTheme,
      Input: {
        variants: {
          filled: {
            field: {
              bg: 'brand.inputBg',
              borderColor: isDark ? 'brand.slateBorder' : 'brand.slateBorder',
              borderRadius: 'md',
              color: isDark ? 'brand.midnightBlue' : 'brand.black',
              _hover: { borderColor: 'brand.gold' },
              _focus: {
                borderColor: 'brand.gold',
                boxShadow: '0 0 0 2px rgba(212, 175, 55, 0.6)',
              },
            },
          },
        },
      },
      Select: {
        variants: {
          filled: {
            field: {
              bg: 'brand.inputBg',
              borderColor: isDark ? 'brand.slateBorder' : 'brand.slateBorder',
              borderRadius: 'md',
              color: isDark ? 'brand.midnightBlue' : 'brand.black',
              _hover: { borderColor: 'brand.gold' },
              _focus: {
                borderColor: 'brand.gold',
                boxShadow: '0 0 0 2px rgba(212, 175, 55, 0.6)',
              },
            },
          },
        },
      },
      Table: {
        variants: {
          simple: {
            th: {
              borderBottom: '2px solid',
              borderColor: isDark ? 'brand.slateBorder' : 'brand.steel',
              color: isDark ? 'brand.midnightBlue' : 'brand.midnightBlue',
              fontWeight: 'bold',
            },
            td: {
              borderBottom: '1px solid',
              borderColor: isDark ? 'brand.slateBorder' : 'gray.200',
              color: isDark ? 'brand.midnightBlue' : 'brand.black',
            },
          },
        },
      },
      Accordion: {
        variants: {
          filled: {
            container: {
              borderWidth: '1px',
              borderColor: 'brand.slateBorder',
              boxShadow: isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0, 51, 102, 0.1)',
              borderRadius: 'lg',
              overflow: 'hidden',
              bg: 'brand.sessionCardBg',
              transition: 'all 0.3s ease',
            },
            button: {
              bg: 'brand.sessionCardBg',
              color: isDark ? 'brand.midnightBlue' : 'brand.black',
              _hover: {
                bg: isDark ? 'brand.slateBlue' : 'gray.50',
              },
              borderRadius: 'lg',
              borderBottomRadius: 'none',
            },
            panel: {
              bg: 'brand.sessionCardBg',
              color: isDark ? 'brand.midnightBlue' : 'brand.black',
              padding: 4,
            },
          },
        },
      },
    },
  });
}

// Export default light theme for backward compatibility
const theme = createTheme(false);
export default theme;