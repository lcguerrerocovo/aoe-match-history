import { createSystem, defaultConfig, defineConfig, defineSlotRecipe, defineRecipe } from '@chakra-ui/react';

// ============================================================
// Section 1: Semantic color tokens (light/dark mode pairs)
// base = light mode, _dark = dark mode override
// ============================================================

const semanticColors = {
  brand: {
    // Core palette
    inkDark: { value: { base: '#3B2614', _dark: '#F7FAFC' } },
    gold: { value: { base: '#D4AF37', _dark: '#FFD700' } },
    bronzeLight: { value: { base: '#C8A26B', _dark: '#CFA46B' } },
    bronze: { value: { base: '#B37A3E', _dark: '#CD7F32' } },
    bronzeMedium: { value: '#8B5A2B' },
    bronzeDark: { value: '#6B4423' },
    bronzeDarkest: { value: '#5A3A20' },
    black: { value: { base: '#2B1810', _dark: '#F7FAFC' } },
    parchment: { value: { base: '#F8F3E6', _dark: '#1A1A1A' } },
    inkMuted: { value: { base: '#8B7355', _dark: '#CBD5E0' } },
    inkLight: { value: { base: '#C4B59A', _dark: '#2D3748' } },
    heraldic: { value: { base: '#5A3A20', _dark: '#90CDF4' } },
    inkMedium: { value: { base: '#6B5240', _dark: '#2D3748' } },
    redChalk: { value: { base: '#8B3A3A', _dark: '#C44536' } },
    borderWarm: { value: { base: '#9C8567', _dark: '#4A5568' } },
    white: { value: '#fff' },
    pureBlack: { value: '#111' },

    // Status colors
    darkWin: { value: { base: '#2E7D32', _dark: '#48BB78' } },
    darkLoss: { value: { base: '#D32F2F', _dark: '#F56565' } },
    win: { value: { base: '#3AA76D', _dark: '#48BB78' } },
    loss: { value: { base: '#D64545', _dark: '#F56565' } },
    inkAccent: { value: { base: '#8B4513', _dark: '#90CDF4' } },
    stone: { value: { base: '#E6E3D8', _dark: '#2D3748' } },
    stoneLight: { value: { base: '#F2F0EA', _dark: '#1A202C' } },
    fadedParchment: { value: { base: '#E8DCC8', _dark: '#2A4A6B' } },
    parchmentDark: { value: { base: '#EDE5D2', _dark: '#2D3748' } },

    // Dark background optimized
    brightGold: { value: '#FFD700' },
    brightSilver: { value: { base: '#D0D0D0', _dark: '#E2E8F0' } },
    brightBronze: { value: '#CD7F32' },
    brightGreen: { value: { base: '#4AE374', _dark: '#48BB78' } },
    brightRed: { value: { base: '#FF8282', _dark: '#F56565' } },

    // Tier ranking colors
    tierGoldDark: { value: '#FFD700' },
    tierGoldLight: { value: '#D4AF37' },
    tierGoldGradientDark: { value: '#FFB347' },
    tierGoldGradientLight: { value: '#B8860B' },
    tierSilverDark: { value: '#C0C0C0' },
    tierSilverLight: { value: '#696969' },
    tierSilverGradientDark: { value: '#D3D3D3' },
    tierSilverGradientLight: { value: '#808080' },
    tierBronzeDark: { value: '#CD853F' },
    tierBronzeLight: { value: '#8B4513' },
    tierBronzeGradientDark: { value: '#D2691E' },
    tierBronzeGradientLight: { value: '#A0522D' },

    // UI component backgrounds (gradients as strings)
    topbarBg: {
      value: {
        base: 'linear-gradient(180deg, #3D1C11 0%, #4A2318 10%, #5C2E1A 60%, #4A2318 100%)',
        _dark: 'linear-gradient(180deg, #2D3748 0%, #1A202C 10%, #171923 60%, #0F0F0F 100%)',
      },
    },
    topbarBgMd: {
      value: {
        base: 'linear-gradient(180deg, #3D1C11 0%, #4A2318 20%, #5C2E1A 55%, #4A2318 100%)',
        _dark: 'linear-gradient(180deg, #2D3748 0%, #1A202C 20%, #171923 55%, #0F0F0F 100%)',
      },
    },
    topbarText: { value: { base: '#F5EDDA', _dark: '#F7FAFC' } },
    topbarTextShadow: { value: { base: 'rgba(0,0,0,0.3)', _dark: 'rgba(0,0,0,0.8)' } },
    topbarTextShadowAlpha: { value: { base: 'rgba(0,0,0,0.15)', _dark: 'rgba(255,255,255,0.1)' } },
    topbarSearchBg: { value: { base: 'rgba(245,237,218,0.12)', _dark: 'rgba(255,255,255,0.08)' } },
    topbarSearchText: { value: { base: '#F5EDDA', _dark: '#F7FAFC' } },
    topbarSearchPlaceholder: { value: { base: 'rgba(245,237,218,0.5)', _dark: 'rgba(255,255,255,0.4)' } },
    topbarSearchBorder: { value: { base: 'rgba(245,237,218,0.2)', _dark: 'rgba(255,255,255,0.15)' } },
    landingBg: {
      value: {
        base: 'transparent',
        _dark: 'linear-gradient(180deg, #2D3748 0%, #1A202C 10%, #171923 60%, #0F0F0F 100%)',
      },
    },
    landingBgMd: {
      value: {
        base: 'transparent',
        _dark: 'linear-gradient(180deg, #2D3748 0%, #1A202C 20%, #171923 55%, #0F0F0F 100%)',
      },
    },

    // Session header
    sessionHeaderBg: {
      value: {
        base: 'transparent',
        _dark: `linear-gradient(135deg, #2D3748 0%, #1A202C 25%, #171923 50%, #1A202C 75%, #2D3748 100%), repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0px, rgba(255, 255, 255, 0.02) 2px, transparent 2px, transparent 8px)`,
      },
    },

    // UI element backgrounds
    cardBg: { value: { base: '#f6ecd8', _dark: '#2D3748' } },
    cardWinnerBg: { value: { base: 'rgba(139, 58, 58, 0.03)', _dark: 'rgba(196, 69, 54, 0.06)' } },
    cardLoserBg: { value: { base: 'rgba(139, 115, 85, 0.03)', _dark: 'rgba(74, 85, 104, 0.06)' } },
    cardWinnerBorder: { value: { base: 'rgba(139, 58, 58, 0.12)', _dark: 'rgba(196, 69, 54, 0.2)' } },
    cardLoserBorder: { value: { base: 'rgba(139, 90, 43, 0.08)', _dark: 'rgba(74, 85, 104, 0.15)' } },
    inputBg: { value: { base: '#faf5e8', _dark: '#2D3748' } },

    // Gradient colors for UI elements

    // Shadow and border colors
    shadowLight: { value: { base: 'rgba(0,0,0,0.05)', _dark: 'rgba(0,0,0,0.3)' } },
    shadowMedium: { value: { base: 'rgba(0,0,0,0.07)', _dark: 'rgba(0,0,0,0.4)' } },
    borderLight: { value: { base: 'rgba(139, 90, 43, 0.15)', _dark: '#4A5568' } },
    textShadowLight: { value: { base: 'rgba(255, 248, 230, 0.9)', _dark: 'rgba(0,0,0,0.8)' } },
    textShadowAlpha: { value: { base: 'rgba(0,0,0,0.04)', _dark: 'rgba(255,255,255,0.1)' } },

    // Animation glow colors
    sunGlow: { value: { base: 'rgba(139, 58, 58, 0.3)', _dark: 'rgba(147, 197, 253, 0.3)' } },
    sunGlowBright: { value: { base: 'rgba(139, 58, 58, 0.6)', _dark: 'rgba(147, 197, 253, 0.6)' } },
    sunGlowDim: { value: { base: 'rgba(139, 58, 58, 0.2)', _dark: 'rgba(147, 197, 253, 0.2)' } },
    sunColor: { value: { base: '#8B3A3A', _dark: '#93C5FD' } },
    sunBg: { value: { base: 'rgba(139, 58, 58, 0.15)', _dark: 'rgba(147, 197, 253, 0.1)' } },
    sunBorder: { value: { base: 'rgba(139, 58, 58, 0.3)', _dark: 'rgba(147, 197, 253, 0.3)' } },
    sunRadialGradient: {
      value: {
        base: 'radial-gradient(circle at 30% 30%, rgba(139, 58, 58, 0.1), transparent 70%)',
        _dark: 'radial-gradient(circle at 30% 30%, rgba(147, 197, 253, 0.1), transparent 70%)',
      },
    },
    sunRadialGradientBg: {
      value: {
        base: 'radial-gradient(circle, rgba(139, 58, 58, 0.05) 0%, transparent 70%)',
        _dark: 'radial-gradient(circle, rgba(147, 197, 253, 0.05) 0%, transparent 70%)',
      },
    },

    // Session group card colors
    sessionCardBg: { value: { base: '#efe6d4', _dark: '#2D3748' } },
    sessionCardBorder: { value: { base: 'rgba(139, 90, 43, 0.2)', _dark: '#4A5568' } },

    // Stamp button colors
    stampBg: {
      value: {
        base: `linear-gradient(135deg, #6B2A2A 0%, #8B3A3A 50%, #6B2A2A 100%)`,
        _dark: `linear-gradient(135deg, #4A5568 0%, #2D3748 50%, #4A5568 100%)`,
      },
    },
    stampBgHover: {
      value: {
        base: `linear-gradient(135deg, #8B3A3A 0%, #A04040 50%, #8B3A3A 100%)`,
        _dark: `linear-gradient(135deg, #2D3748 0%, #1A202C 50%, #2D3748 100%)`,
      },
    },
    stampBorder: { value: { base: '#4A1C1C', _dark: '#2D3748' } },
    stampText: { value: '#F5ECD4' },
    stampTextShadow: {
      value: {
        base: '0 1px 2px rgba(0,0,0,0.6)',
        _dark: '0 1px 2px rgba(0,0,0,0.8)',
      },
    },
    stampShadow: {
      value: {
        base: 'inset 0 3px 6px rgba(0,0,0,0.4), inset 0 -2px 3px rgba(255,255,255,0.05), 0 1px 2px rgba(0,0,0,0.2)',
        _dark: 'inset 0 3px 6px rgba(0,0,0,0.6), inset 0 -2px 3px rgba(255,255,255,0.03), 0 1px 2px rgba(0,0,0,0.3)',
      },
    },
    stampShadowHover: {
      value: {
        base: 'inset 0 3px 6px rgba(0,0,0,0.5), inset 0 -2px 3px rgba(255,255,255,0.08), 0 2px 4px rgba(0,0,0,0.3)',
        _dark: 'inset 0 3px 6px rgba(0,0,0,0.7), inset 0 -2px 3px rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.4)',
      },
    },
    stampRing: { value: { base: 'rgba(245, 236, 212, 0.3)', _dark: 'rgba(245, 236, 212, 0.2)' } },

    // Parchment textures
    parchmentSurface: {
      value: {
        base: 'transparent',
        _dark: `radial-gradient(circle at 50% 45%, rgba(60,70,90,0.55) 0%, rgba(0,0,0,0.25) 100%), repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 6px), repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 6px), #1A1A1A`,
      },
    },

    // Link colors
    linkDefault: { value: { base: '#8B4513', _dark: '#90CDF4' } },
    linkHover: { value: { base: '#CD853F', _dark: '#FFD700' } },
  },
};

// ============================================================
// Section 2: Spacing tokens (exported for direct import by components)
// ============================================================

export const componentSpacing = {
  profileSpacing: '0.5rem',
  statsSpacing: '0.5rem',
  cardSpacing: '1rem',
  sectionSpacing: '1.5rem',
};

export const responsiveSpacing = {
  landingSpacing: { base: '0.25rem', md: '1rem' },
  landingPadding: { base: '0.5rem', md: '2rem' },
  sectionSpacing: { base: '2rem', md: '3rem' },
};

const spacingTokens = {
  xs: { value: '0.25rem' },
  sm: { value: '0.5rem' },
  md: { value: '1rem' },
  lg: { value: '1.5rem' },
  xl: { value: '2rem' },
  '2xl': { value: '3rem' },
};

// ============================================================
// Section 3: Slot recipes (multipart components)
// ============================================================

const matchCardStyles = {
  base: { padding: '0.5rem', marginBottom: '0.5rem' },
  lg: { padding: '0.5rem', marginBottom: '0.5rem' },
  desktop: { padding: '0.75rem', marginBottom: '0.75rem' },
};

const cardSlotRecipe = defineSlotRecipe({
  className: 'card',
  slots: ['root', 'body', 'header', 'footer', 'title', 'description'],
  variants: {
    variant: {
      match: {
        root: {
          backgroundColor: 'transparent',
          borderWidth: '0',
          borderRadius: '0',
          borderBottom: '1px solid',
          borderBottomColor: { base: 'rgba(139, 90, 43, 0.2)', _dark: '{colors.brand.borderWarm}' },
          _last: { borderBottom: 'none' },
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
          _hover: {
            bg: { base: 'rgba(139, 90, 43, 0.02)', _dark: 'rgba(255, 255, 255, 0.02)' },
          },
        },
      },
      summary: {
        root: {
          backgroundColor: 'transparent',
          borderWidth: '0',
          borderRadius: '0',
          borderBottom: '1px solid',
          borderBottomColor: { base: 'rgba(139, 90, 43, 0.15)', _dark: '{colors.brand.borderWarm}' },
          transition: 'all 0.3s ease',
        },
      },
      winner: {
        root: {
          bg: '{colors.brand.cardWinnerBg}',
          borderWidth: '0',
          borderRadius: '0',
          borderTop: '2px solid',
          borderTopColor: '{colors.brand.redChalk}',
          borderLeft: '3px solid',
          borderLeftColor: '{colors.brand.redChalk}',
          borderBottom: '1px solid',
          borderBottomColor: '{colors.brand.cardWinnerBorder}',
          p: '1',
          transition: 'all 0.3s ease',
        },
      },
      loser: {
        root: {
          bg: '{colors.brand.cardLoserBg}',
          borderWidth: '0',
          borderRadius: '0',
          borderTop: '2px solid',
          borderTopColor: 'transparent',
          borderLeft: '3px solid',
          borderLeftColor: { base: 'rgba(139, 90, 43, 0.15)', _dark: '{colors.brand.borderWarm}' },
          borderBottom: '1px solid',
          borderBottomColor: '{colors.brand.cardLoserBorder}',
          p: '1',
          transition: 'all 0.3s ease',
        },
      },
      filter: {
        root: {
          bg: 'transparent',
          borderWidth: '0',
          borderRadius: 'none',
          transition: 'all 0.3s ease',
        },
      },
    },
  },
});

const profileHeaderSlotRecipe = defineSlotRecipe({
  className: 'profile-header',
  slots: ['container', 'avatar', 'name', 'id', 'statsTable'],
  base: {
    container: {
      width: '100%',
      height: 'auto',
      padding: { base: '0.5rem', md: '1rem', lg: '1.25rem' },
      position: 'relative',
    },
    avatar: {
      bg: '{colors.brand.stoneLight}',
      border: '1px solid',
      borderColor: '{colors.brand.inkMuted}',
      boxShadow: {
        base: '0 0 0 3px {colors.brand.parchment}, 0 0 0 6px {colors.brand.inkMedium}, inset 0 0 8px rgba(139, 90, 43, 0.15)',
        _dark: '0 0 0 3px #1A1A1A, 0 0 0 6px {colors.brand.inkLight}, inset 0 0 8px rgba(0,0,0,0.4)',
      },
      width: '100px',
      height: '100px',
    },
    name: {
      color: '{colors.brand.inkDark}',
      fontWeight: 'bold',
      fontSize: { base: 'xl', md: '2xl' },
      letterSpacing: 'wide',
      fontVariantCaps: 'small-caps',
      textShadow: { base: '0 1px 0 {colors.brand.textShadowLight}', _dark: '0 1px 2px rgba(0,0,0,0.5)' },
    },
    id: {
      color: '{colors.brand.inkMuted}',
      fontSize: 'xs',
    },
    statsTable: {},
  },
});

const playerStatsSlotRecipe = defineSlotRecipe({
  className: 'player-stats',
  slots: ['container', 'statsTable'],
  base: {
    container: {
      bg: 'transparent',
      padding: '1rem',
      backgroundImage: 'none',
      transition: 'all 0.3s ease',
      position: 'relative',
    },
    statsTable: {
      position: 'relative',
      zIndex: 1,
    },
  },
});

const rankingCardSlotRecipe = defineSlotRecipe({
  className: 'ranking-card',
  slots: ['container', 'rankingRow', 'leaderboardName', 'rankText', 'percentileText', 'rankingTable', 'tableHeader', 'tableRow', 'tableCell'],
  base: {
    container: {
      bg: 'transparent',
      padding: '0.3rem',
      backgroundImage: 'none',
      transition: 'all 0.3s ease',
      minW: { base: '100%', md: '220px' },
      maxW: { base: '100%', md: '240px' },
      position: 'relative',
    },
    rankingRow: {
      padding: '0.25rem 0.5rem',
      borderRadius: 'md',
      borderWidth: '0px',
      borderColor: 'transparent',
      bg: 'transparent',
      transition: 'all 0.2s ease',
      position: 'relative',
      zIndex: 1,
      borderBottom: '1px solid',
      borderBottomColor: { base: 'rgba(139, 90, 43, 0.1)', _dark: 'rgba(255,255,255,0.1)' },
      _last: { borderBottom: 'none' },
      _hover: {
        bg: { base: 'rgba(139, 90, 43, 0.03)', _dark: 'rgba(255,255,255,0.05)' },
        borderColor: { base: 'rgba(139, 90, 43, 0.3)', _dark: 'rgba(255,255,255,0.2)' },
      },
    },
    leaderboardName: {
      color: { base: '{colors.brand.inkDark}', _dark: '{colors.brand.inkMuted}' },
      fontSize: '11px',
      fontWeight: 700,
      fontVariantCaps: 'small-caps',
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
    },
    rankText: {
      fontSize: 'xs',
      fontWeight: 'bold',
      whiteSpace: 'nowrap',
    },
    percentileText: {
      color: '{colors.brand.inkMuted}',
      fontSize: 'xs',
      fontWeight: 'bold',
      whiteSpace: 'nowrap',
    },
    rankingTable: {
      borderCollapse: 'collapse',
      w: '100%',
    },
    tableHeader: {
      color: { base: '{colors.brand.inkDark}', _dark: '{colors.brand.inkMuted}' },
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      fontSize: '2xs',
      fontWeight: 'bold',
      textAlign: 'left',
      padding: '0.5rem',
      borderBottom: '1px solid',
      borderColor: { base: '{colors.brand.bronzeLight}', _dark: '{colors.brand.borderWarm}' },
    },
    tableRow: {
      borderBottom: '1px solid',
      borderColor: { base: '{colors.brand.bronzeLight}', _dark: '{colors.brand.borderWarm}' },
      _last: { borderBottom: 'none' },
    },
    tableCell: {
      padding: '0.5rem',
      verticalAlign: 'middle',
    },
  },
});

// ============================================================
// Section 4: Component recipes
// ============================================================

const headingRecipe = defineRecipe({
  className: 'heading',
  base: {
    color: '{colors.brand.inkDark}',
    fontWeight: '600',
  },
});

const linkRecipe = defineRecipe({
  className: 'link',
  base: {
    color: { base: '#8B4513', _dark: '#C44536' },
    _hover: {
      color: { base: '#A0522D', _dark: '#E74C3C' },
    },
  },
});

const buttonRecipe = defineRecipe({
  className: 'button',
  variants: {
    variant: {
      solid: {
        bg: { base: '{colors.brand.inkDark}', _dark: '{colors.brand.inkLight}' },
        color: { base: 'white', _dark: '{colors.brand.inkDark}' },
        _hover: {
          bg: { base: '{colors.brand.heraldic}', _dark: '{colors.brand.inkMedium}' },
        },
      },
      outline: {
        borderColor: '{colors.brand.inkMedium}',
        color: '{colors.brand.inkDark}',
        _hover: {
          bg: { base: '#7A6350', _dark: '{colors.brand.inkMedium}' },
          color: { base: 'white', _dark: '{colors.brand.black}' },
        },
      },
    },
  },
});

const separatorRecipe = defineRecipe({
  className: 'separator',
  base: {
    borderColor: { base: '{colors.brand.stone}', _dark: '{colors.brand.borderWarm}' },
    opacity: 0.4,
  },
});

// ============================================================
// Section 5: System config + global CSS
// ============================================================

const config = defineConfig({
  globalCss: {
    body: {
      bg: { base: '{colors.brand.parchment}', _dark: '#0F0F0F' },
      backgroundImage: {
        base: `radial-gradient(ellipse at 50% 50%, #F8F3E6 0%, #E8DCC8 100%), repeating-linear-gradient(135deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 1px, transparent 1px, transparent 5px), repeating-linear-gradient(45deg, rgba(0,0,0,0.015) 0px, rgba(0,0,0,0.015) 1px, transparent 1px, transparent 5px)`,
        _dark: 'none',
      },
      color: '{colors.brand.black}',
      fontFamily: "'Lora', serif",
      fontSize: '15px',
      transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    },
    'a, button': {
      transition: 'all 0.2s ease-in-out',
    },
    '*, *::before, *::after': {
      borderColor: { base: '{colors.brand.inkMuted}', _dark: '{colors.brand.inkLight}' },
    },
    '*': {
      transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
    },
    '.rank': {
      color: { base: '{colors.brand.inkDark}', _dark: '{colors.brand.heraldic}' },
      fontWeight: '700',
    },
    '.loss': {
      color: { base: '{colors.brand.darkLoss}', _dark: '{colors.brand.brightRed}' },
      fontWeight: 'bold',
    },
    '.streak': {
      color: { base: '{colors.brand.darkWin}', _dark: '{colors.brand.brightGreen}' },
      fontWeight: 'bold',
    },
  },
  theme: {
    tokens: {
      spacing: spacingTokens,
    },
    semanticTokens: {
      colors: semanticColors,
    },
    recipes: {
      heading: headingRecipe,
      link: linkRecipe,
      button: buttonRecipe,
      separator: separatorRecipe,
    },
    slotRecipes: {
      card: cardSlotRecipe,
      profileHeader: profileHeaderSlotRecipe,
      playerStats: playerStatsSlotRecipe,
      rankingCard: rankingCardSlotRecipe,
    },
  },
});

// ============================================================
// Section 6: System creation + exports
// ============================================================

export const system = createSystem(defaultConfig, config);

export default system;
