import { createSystem, defaultConfig, defineConfig, defineSlotRecipe, defineRecipe } from '@chakra-ui/react';

// ============================================================
// Section 1: Semantic color tokens (light/dark mode pairs)
// base = light mode, _dark = dark mode override
// ============================================================

const semanticColors = {
  brand: {
    // Core palette
    midnightBlue: { value: { base: '#3B2614', _dark: '#F7FAFC' } },
    gold: { value: { base: '#D4AF37', _dark: '#FFD700' } },
    bronzeLight: { value: { base: '#C8A26B', _dark: '#CFA46B' } },
    bronze: { value: { base: '#B37A3E', _dark: '#CD7F32' } },
    bronzeMedium: { value: '#8B5A2B' },
    bronzeDark: { value: '#6B4423' },
    bronzeDarkest: { value: '#5A3A20' },
    black: { value: { base: '#2B1810', _dark: '#F7FAFC' } },
    charcoal: { value: '#3D2B1F' },
    parchment: { value: { base: '#F8F3E6', _dark: '#1A1A1A' } },
    steel: { value: { base: '#8B7355', _dark: '#CBD5E0' } },
    lightSteel: { value: { base: '#C4B59A', _dark: '#2D3748' } },
    heraldic: { value: { base: '#5A3A20', _dark: '#90CDF4' } },
    slateBlue: { value: { base: '#6B5240', _dark: '#2D3748' } },
    slateBorder: { value: { base: '#9C8567', _dark: '#4A5568' } },
    white: { value: '#fff' },
    pureBlack: { value: '#111' },

    // Status colors
    darkWin: { value: { base: '#2E7D32', _dark: '#48BB78' } },
    darkLoss: { value: { base: '#D32F2F', _dark: '#F56565' } },
    tableBorderOnLight: { value: { base: '#A08060', _dark: '#4A5568' } },
    modernTableBorder: { value: { base: '#6B4423', _dark: '#90CDF4' } },
    win: { value: { base: '#3AA76D', _dark: '#48BB78' } },
    loss: { value: { base: '#D64545', _dark: '#F56565' } },
    same: { value: { base: '#8B7355', _dark: '#90CDF4' } },
    zoolanderBlue: { value: { base: '#8B4513', _dark: '#90CDF4' } },
    stone: { value: { base: '#E6E3D8', _dark: '#2D3748' } },
    stoneLight: { value: { base: '#F2F0EA', _dark: '#1A202C' } },
    fadedBlue: { value: { base: '#E8DCC8', _dark: '#2A4A6B' } },

    // Dark background optimized
    brightGold: { value: '#FFD700' },
    brightSilver: { value: { base: '#D0D0D0', _dark: '#E2E8F0' } },
    brightBronze: { value: '#CD7F32' },
    brightGreen: { value: { base: '#4AE374', _dark: '#48BB78' } },
    brightRed: { value: { base: '#FF8282', _dark: '#F56565' } },
    contrastRed: { value: { base: '#FF6B94', _dark: '#F56565' } },

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
        base: 'linear-gradient(180deg, #e6dcc8 0%, #ece3d0 10%, #f0e8d8 60%, #F8F3E6 100%)',
        _dark: 'linear-gradient(180deg, #2D3748 0%, #1A202C 10%, #171923 60%, #0F0F0F 100%)',
      },
    },
    topbarBgMd: {
      value: {
        base: 'linear-gradient(180deg, #e6dcc8 0%, #ece3d0 20%, #f0e8d8 55%, #F8F3E6 100%)',
        _dark: 'linear-gradient(180deg, #2D3748 0%, #1A202C 20%, #171923 55%, #0F0F0F 100%)',
      },
    },
    landingBg: {
      value: {
        base: 'linear-gradient(180deg, #e6dcc8 0%, #ece3d0 10%, #f0e8d8 60%, #F8F3E6 100%)',
        _dark: 'linear-gradient(180deg, #2D3748 0%, #1A202C 10%, #171923 60%, #0F0F0F 100%)',
      },
    },
    landingBgMd: {
      value: {
        base: 'linear-gradient(180deg, #e6dcc8 0%, #ece3d0 20%, #f0e8d8 55%, #F8F3E6 100%)',
        _dark: 'linear-gradient(180deg, #2D3748 0%, #1A202C 20%, #171923 55%, #0F0F0F 100%)',
      },
    },

    // Session header
    sessionHeaderBg: {
      value: {
        base: `linear-gradient(135deg, #E8E5DA 0%, #E2DFD4 25%, #DCD9CE 50%, #D6D3C8 75%, #D0CDC2 100%), repeating-linear-gradient(135deg, rgba(139, 90, 43, 0.06) 0px, rgba(139, 90, 43, 0.06) 2px, transparent 2px, transparent 8px), radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 60%)`,
        _dark: `linear-gradient(135deg, #2D3748 0%, #1A202C 25%, #171923 50%, #1A202C 75%, #2D3748 100%), repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0px, rgba(255, 255, 255, 0.02) 2px, transparent 2px, transparent 8px)`,
      },
    },

    // UI element backgrounds
    cardBg: { value: { base: '#f6ecd8', _dark: '#2D3748' } },
    inputBg: { value: { base: '#faf5e8', _dark: '#2D3748' } },

    // Gradient colors for UI elements
    heroGradientStart: { value: { base: 'rgba(255,248,230,0.7)', _dark: 'rgba(45,55,72,0.9)' } },
    heroGradientEnd: { value: { base: 'rgba(255,248,230,0.1)', _dark: 'rgba(45,55,72,0.3)' } },

    // Shadow and border colors
    shadowLight: { value: { base: 'rgba(0,0,0,0.05)', _dark: 'rgba(0,0,0,0.3)' } },
    shadowMedium: { value: { base: 'rgba(0,0,0,0.07)', _dark: 'rgba(0,0,0,0.4)' } },
    shadowGold: { value: { base: 'rgba(212,175,55,0.4)', _dark: 'rgba(255,215,0,0.4)' } },
    borderLight: { value: { base: 'rgba(139, 90, 43, 0.15)', _dark: '#4A5568' } },
    textShadowLight: { value: { base: 'rgba(255, 248, 230, 0.9)', _dark: 'rgba(0,0,0,0.8)' } },
    textShadowAlpha: { value: { base: 'rgba(0,0,0,0.04)', _dark: 'rgba(255,255,255,0.1)' } },

    // Animation glow colors
    sunGlow: { value: { base: 'rgba(255, 215, 0, 0.3)', _dark: 'rgba(147, 197, 253, 0.3)' } },
    sunGlowBright: { value: { base: 'rgba(255, 215, 0, 0.6)', _dark: 'rgba(147, 197, 253, 0.6)' } },
    sunGlowDim: { value: { base: 'rgba(255, 215, 0, 0.2)', _dark: 'rgba(147, 197, 253, 0.2)' } },
    sunColor: { value: { base: '#D4AF37', _dark: '#93C5FD' } },
    sunBg: { value: { base: 'rgba(255, 215, 0, 0.1)', _dark: 'rgba(147, 197, 253, 0.1)' } },
    sunBorder: { value: { base: 'rgba(212, 175, 55, 0.3)', _dark: 'rgba(147, 197, 253, 0.3)' } },
    sunRadialGradient: {
      value: {
        base: 'radial-gradient(circle at 30% 30%, rgba(255, 215, 0, 0.1), transparent 70%)',
        _dark: 'radial-gradient(circle at 30% 30%, rgba(147, 197, 253, 0.1), transparent 70%)',
      },
    },
    sunRadialGradientBg: {
      value: {
        base: 'radial-gradient(circle, rgba(255, 215, 0, 0.05) 0%, transparent 70%)',
        _dark: 'radial-gradient(circle, rgba(147, 197, 253, 0.05) 0%, transparent 70%)',
      },
    },

    // Session group card colors
    sessionCardBg: { value: { base: '#efe6d4', _dark: '#2D3748' } },
    sessionCardBorder: { value: { base: 'rgba(139, 90, 43, 0.2)', _dark: '#4A5568' } },

    // Stamp button colors
    stampBg: {
      value: {
        base: `linear-gradient(135deg, #8B4513 0%, #A0522D 25%, #8B4513 100%), repeating-linear-gradient(45deg, transparent 0px, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 3px), radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(0, 0, 0, 0.1) 0%, transparent 40%)`,
        _dark: `linear-gradient(135deg, #4A5568 0%, #2D3748 25%, #4A5568 100%), repeating-linear-gradient(45deg, transparent 0px, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 3px), radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.05) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(0, 0, 0, 0.2) 0%, transparent 40%)`,
      },
    },
    stampBgHover: {
      value: {
        base: `linear-gradient(135deg, #A0522D 0%, #CD853F 25%, #A0522D 100%), repeating-linear-gradient(45deg, transparent 0px, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 3px), radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(0, 0, 0, 0.15) 0%, transparent 40%)`,
        _dark: `linear-gradient(135deg, #2D3748 0%, #1A202C 25%, #2D3748 100%), repeating-linear-gradient(45deg, transparent 0px, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 3px), radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.08) 0%, transparent 50%), radial-gradient(circle at 70% 70%, rgba(0, 0, 0, 0.25) 0%, transparent 40%)`,
      },
    },
    stampBorder: { value: { base: '#654321', _dark: '#2D3748' } },
    stampText: { value: { base: '#654321', _dark: '#E2E8F0' } },
    stampTextShadow: {
      value: {
        base: '1px 1px 0px rgba(255,255,255,0.8), -1px -1px 0px rgba(0,0,0,0.3)',
        _dark: '1px 1px 0px rgba(0,0,0,0.8), -1px -1px 0px rgba(255,255,255,0.2)',
      },
    },
    stampShadow: {
      value: {
        base: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2), inset 0 -1px 1px rgba(255,255,255,0.1)',
        _dark: 'inset 0 2px 4px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3), inset 0 -1px 1px rgba(255,255,255,0.05)',
      },
    },
    stampShadowHover: {
      value: {
        base: 'inset 0 2px 4px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3), inset 0 -1px 1px rgba(255,255,255,0.15)',
        _dark: 'inset 0 2px 4px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4), inset 0 -1px 1px rgba(255,255,255,0.08)',
      },
    },

    // Parchment textures
    parchmentSurface: {
      value: {
        base: `radial-gradient(circle at 50% 45%, rgba(255,255,255,0.9) 0%, rgba(248,243,230,0.95) 12%, rgba(0,0,0,0.12) 100%), repeating-linear-gradient(135deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 2px, transparent 2px, transparent 6px), repeating-linear-gradient(45deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 2px, transparent 2px, transparent 6px), #F8F3E6`,
        _dark: `radial-gradient(circle at 50% 45%, rgba(60,70,90,0.55) 0%, rgba(0,0,0,0.25) 100%), repeating-linear-gradient(135deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 6px), repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 6px), #1A1A1A`,
      },
    },
    parchmentSurfaceItem: {
      value: {
        base: `repeating-linear-gradient(135deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 5px), repeating-linear-gradient(45deg, rgba(0,0,0,0.025) 0px, rgba(0,0,0,0.025) 2px, transparent 2px, transparent 6px), #F8F3E6`,
        _dark: `repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 2px, transparent 2px, transparent 6px), repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 6px), #1A1A1A`,
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
          backgroundColor: { base: '{colors.brand.cardBg}', _dark: '{colors.brand.lightSteel}' },
          borderWidth: '1px',
          borderColor: { base: 'rgba(139, 90, 43, 0.3)', _dark: '{colors.brand.slateBorder}' },
          borderRadius: 'sm',
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
        },
      },
      summary: {
        root: {
          backgroundColor: { base: '{colors.brand.stone}', _dark: '{colors.brand.lightSteel}' },
          borderWidth: '1px',
          borderColor: { base: 'rgba(139, 90, 43, 0.3)', _dark: '{colors.brand.slateBorder}' },
          borderRadius: 'sm',
          transition: 'all 0.3s ease',
        },
      },
      winner: {
        root: {
          bg: '{colors.brand.stoneLight}',
          borderColor: '{colors.brand.gold}',
          boxShadow: '0 0 8px rgba(212,175,55,0.6)',
          borderWidth: '2px',
          borderRadius: 'sm',
          p: '1',
          transition: 'all 0.3s ease',
        },
      },
      loser: {
        root: {
          bg: '{colors.brand.stoneLight}',
          borderColor: { base: 'rgba(139, 90, 43, 0.25)', _dark: '{colors.brand.slateBorder}' },
          borderWidth: '1px',
          borderRadius: 'sm',
          p: '1',
          transition: 'all 0.3s ease',
        },
      },
      filter: {
        root: {
          bg: '{colors.brand.sessionCardBg}',
          borderWidth: '1px',
          borderColor: { base: 'rgba(139, 90, 43, 0.25)', _dark: '{colors.brand.slateBorder}' },
          borderRadius: 'sm',
          transition: 'all 0.3s ease',
        },
      },
      recordBubble: {
        root: {
          bg: { base: '#f0e6d2', _dark: '{colors.brand.slateBlue}' },
          color: { base: '{colors.brand.black}', _dark: '{colors.brand.steel}' },
          borderColor: { base: 'rgba(139, 90, 43, 0.3)', _dark: '{colors.brand.slateBorder}' },
          borderWidth: '2px',
          borderRadius: 'md',
          boxShadow: {
            base: '0 3px 8px rgba(139, 90, 43, 0.15), 0 1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)',
            _dark: '0 1px 3px rgba(0,0,0,0.3)',
          },
          px: { base: '1', md: '3' },
          py: '1',
          fontSize: '0.8125rem',
          fontWeight: 'bold',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          position: 'relative',
          _hover: {
            boxShadow: {
              base: '0 4px 12px rgba(139, 90, 43, 0.2), 0 2px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)',
              _dark: '0 2px 6px rgba(0,0,0,0.4)',
            },
            transform: 'translateY(-2px)',
          },
        },
        body: {
          padding: '0',
          position: 'relative',
          zIndex: 1,
        },
      },
      matchesCountBubble: {
        root: {
          bg: { base: '#f0e6d2', _dark: '{colors.brand.slateBlue}' },
          color: { base: '{colors.brand.black}', _dark: '{colors.brand.steel}' },
          borderColor: { base: 'rgba(139, 90, 43, 0.3)', _dark: '{colors.brand.slateBorder}' },
          borderWidth: '2px',
          borderRadius: 'md',
          px: { base: '1', md: '3' },
          width: '80px',
          py: '1',
          fontSize: '0.8125rem',
          fontWeight: 'extrabold',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5',
          boxShadow: {
            base: '0 3px 8px rgba(139, 90, 43, 0.15), 0 1px 3px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)',
            _dark: '0 1px 3px rgba(0,0,0,0.3)',
          },
          transition: 'all 0.3s ease',
          position: 'relative',
          _hover: {
            boxShadow: {
              base: '0 4px 12px rgba(139, 90, 43, 0.2), 0 2px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)',
              _dark: '0 2px 6px rgba(0,0,0,0.4)',
            },
            transform: 'translateY(-2px)',
          },
        },
        body: {
          padding: '0',
          position: 'relative',
          zIndex: 1,
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
      border: '2px solid',
      borderColor: '{colors.brand.gold}',
      width: '100px',
      height: '100px',
    },
    name: {
      color: '{colors.brand.midnightBlue}',
      fontWeight: 'bold',
      fontSize: 'lg',
    },
    id: {
      color: '{colors.brand.steel}',
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
      bg: { base: '#f6ecd8', _dark: '{colors.brand.slateBlue}' },
      borderColor: { base: 'rgba(139, 90, 43, 0.3)', _dark: '{colors.brand.slateBorder}' },
      borderRadius: 'sm',
      padding: '1rem',
      borderWidth: '2px',
      backgroundImage: {
        base: `linear-gradient(135deg, #f6ecd8 0%, #eee2ce 25%, #e6d8c4 70%, #deceba 90%, #e0d0b8 100%),
          repeating-linear-gradient(45deg, rgba(139, 90, 43, 0.04) 0px, rgba(139, 90, 43, 0.04) 1px, transparent 1px, transparent 3px),
          repeating-linear-gradient(-45deg, rgba(139, 90, 43, 0.02) 0px, rgba(139, 90, 43, 0.02) 1px, transparent 1px, transparent 6px),
          radial-gradient(ellipse at 30% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 60%),
          radial-gradient(ellipse at 70% 70%, rgba(139, 90, 43, 0.05) 0%, transparent 40%)`,
        _dark: 'none',
      },
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
      bg: { base: '#f6ecd8', _dark: '{colors.brand.slateBlue}' },
      borderColor: { base: 'rgba(139, 90, 43, 0.3)', _dark: '{colors.brand.slateBorder}' },
      borderRadius: 'sm',
      padding: '0.3rem',
      borderWidth: '2px',
      backgroundImage: {
        base: `linear-gradient(135deg, #f6ecd8 0%, #eee2ce 25%, #e6d8c4 70%, #deceba 90%, #e0d0b8 100%),
          repeating-linear-gradient(45deg, rgba(139, 90, 43, 0.04) 0px, rgba(139, 90, 43, 0.04) 1px, transparent 1px, transparent 3px),
          repeating-linear-gradient(-45deg, rgba(139, 90, 43, 0.02) 0px, rgba(139, 90, 43, 0.02) 1px, transparent 1px, transparent 6px),
          radial-gradient(ellipse at 30% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 60%),
          radial-gradient(ellipse at 70% 70%, rgba(139, 90, 43, 0.05) 0%, transparent 40%)`,
        _dark: 'none',
      },
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
      color: { base: '{colors.brand.midnightBlue}', _dark: '{colors.brand.steel}' },
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
      color: '{colors.brand.steel}',
      fontSize: 'xs',
      fontWeight: 'bold',
      whiteSpace: 'nowrap',
    },
    rankingTable: {
      borderCollapse: 'collapse',
      w: '100%',
    },
    tableHeader: {
      color: { base: '{colors.brand.midnightBlue}', _dark: '{colors.brand.steel}' },
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      fontSize: '2xs',
      fontWeight: 'bold',
      textAlign: 'left',
      padding: '0.5rem',
      borderBottom: '1px solid',
      borderColor: { base: '{colors.brand.bronzeLight}', _dark: '{colors.brand.slateBorder}' },
    },
    tableRow: {
      borderBottom: '1px solid',
      borderColor: { base: '{colors.brand.bronzeLight}', _dark: '{colors.brand.slateBorder}' },
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
    color: '{colors.brand.midnightBlue}',
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
        bg: { base: '{colors.brand.midnightBlue}', _dark: '{colors.brand.lightSteel}' },
        color: { base: 'white', _dark: '{colors.brand.midnightBlue}' },
        _hover: {
          bg: { base: '{colors.brand.heraldic}', _dark: '{colors.brand.slateBlue}' },
        },
      },
      outline: {
        borderColor: '{colors.brand.gold}',
        color: '{colors.brand.midnightBlue}',
        _hover: {
          bg: { base: '#b78b2b', _dark: '{colors.brand.gold}' },
          color: { base: 'white', _dark: '{colors.brand.black}' },
        },
      },
    },
  },
});

const separatorRecipe = defineRecipe({
  className: 'separator',
  base: {
    borderColor: { base: '{colors.brand.stone}', _dark: '{colors.brand.slateBorder}' },
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
      color: '{colors.brand.black}',
      fontFamily: "'Lora', serif",
      fontSize: '15px',
      transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    },
    // Responsive body bg: on md+, same parchment canvas as mobile (unified manuscript feel)
    '@media screen and (min-width: 768px)': {
      '& body': {
        bg: { base: '{colors.brand.parchment}', _dark: '#0F0F0F' },
      },
    },
    'a, button': {
      transition: 'all 0.2s ease-in-out',
    },
    '*, *::before, *::after': {
      borderColor: { base: '{colors.brand.steel}', _dark: '{colors.brand.lightSteel}' },
    },
    '*': {
      transition: 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease',
    },
    '.rank': {
      color: { base: '{colors.brand.midnightBlue}', _dark: '{colors.brand.zoolanderBlue}' },
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
