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

const colors = {
  brand: {
    midnightBlue: '#19214E', // Deep noble blue
    gold: '#D4AF37',         // Lustrous medieval gold
    bronze: '#B37A3E',       // Authentic bronze accent
    black: '#1C1C1C',        // Rich charcoal for high legibility
    parchment: '#F8F3E6',    // Elegant parchment backdrop
    steel: '#5A6478',        // Cool steel grey for outlines
    lightSteel: '#A9B4C2',   // Lighter steel for backgrounds
    heraldic: '#243773',     // Royal heraldic blue
    slateBlue: '#4A5B7B',    // Muted blue for modern theme
    slateBorder: '#64728A',  // Border for slate blue theme
    
    // High-contrast colors for light backgrounds
    darkWin: '#226844',      // Darker green for wins on light backgrounds
    darkLoss: '#A52D2D',     // Darker red for losses on light backgrounds
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

const cardTheme = defineCardMultiStyleConfig({
  variants: {
    match: defineCardPartsStyle({
      container: {
        backgroundColor: 'white',
        borderWidth: '1px',
        borderColor: 'brand.stone',
        borderRadius: 'lg',
        boxShadow: '0 2px 4px rgba(0,0,0,0.04)',

        // Layout styles
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
      }
    }),
    summary: defineCardPartsStyle({
      container: {
        backgroundColor: 'brand.stone',
        borderWidth: '1px',
        borderColor: 'brand.steel',
        borderRadius: 'md',
      }
    }),
    winner: defineCardPartsStyle({
      container: {
        bg: 'brand.parchment',
        borderColor: 'brand.gold',
        boxShadow: '0 0 8px rgba(212,175,55,0.6)',
        borderWidth: '2px',
        borderRadius: 'md',
        p: 1,
      }
    }),
    loser: defineCardPartsStyle({
      container: {
        bg: 'brand.stoneLight',
        borderColor: 'brand.stone',
        borderWidth: '1px',
        borderRadius: 'md',
        p: 1,
      }
    }),
    filter: defineCardPartsStyle({
      container: {
        bg: 'white',
        borderWidth: '1px',
        borderColor: 'brand.lightSteel',
        borderRadius: 'lg',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }
    }),
    recordBubble: defineCardPartsStyle({
      container: {
        bg: 'brand.slateBlue',
        color: 'white',
        borderColor: 'brand.slateBorder',
        borderWidth: '1px',
        borderRadius: 'lg',
        boxShadow: 'md',
        px: { base: 1, md: 3 },
        py: 1,
        fontSize: '0.8125rem',
        fontWeight: 'semibold',
        flexDirection: 'row',
        alignItems: 'center',
      },
      body: {
        padding: 0,
      }
    }),
    matchesCountBubble: defineCardPartsStyle({
      container: {
        bg: 'brand.lightSteel',
        color: 'brand.midnightBlue',
        borderRadius: 'lg',
        px: { base: 1, md: 3 },
        minWidth: '80px',
        py: 1,
        fontSize: '0.8125rem',
        fontWeight: 'bold',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 0.5,
        boxShadow: 'sm',
      },
      body: {
        padding: 0,
      }
    }),
  },
});

const profileHeaderTheme = defineProfileHeaderMultiStyleConfig({
  baseStyle: defineProfileHeaderPartsStyle({
    container: {
      width: '100%',
      height: 'auto',
      padding: { base: '0.75rem', md: '1.5rem', lg: '2rem' },
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

const playerStatsTheme = definePlayerStatsMultiStyleConfig({
  baseStyle: definePlayerStatsPartsStyle({
    container: {
      bg: 'brand.slateBlue',
      borderColor: 'brand.slateBorder',
      borderRadius: 'lg',
      padding: '1rem',
      boxShadow: 'md',
      borderWidth: '1px',
    },
    statsTable: {
      th: {
        color: 'white',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        fontSize: '2xs',
        fontWeight: 'bold',
      },
      td: {
        color: 'white',
        borderColor: 'brand.slateBorder',
        fontSize: 'xs',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        overflow: 'hidden',
      },
      '.rank': {
        color: 'brand.brightGold',
        fontWeight: '700',
      },
      '.percentile': {
        color: 'white',
        fontSize: 'xs',
        fontWeight: 'bold',
      },
      '.win': {
        color: 'brand.brightGreen',
      },
      '.loss': {
        color: 'brand.brightRed',
        fontWeight: 'bold',
      },
      '.streak': {
        color: 'brand.brightGreen',
      },
    },
  }),
});

const theme = extendTheme({
  colors,
  spacing,
  styles: {
    global: {
      body: {
        bg: { base: 'brand.parchment', md: 'brand.midnightBlue' },
        color: 'brand.black',
        fontFamily: "'Lora', serif",
        fontSize: '15px',
      },
      'a, button': {
        transition: 'color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease',
      },
      '*, *::before, &::after': {
        borderColor: 'brand.steel',
      },
    },
  },
  components: {
    Heading: {
      baseStyle: {
        color: 'brand.midnightBlue',
        fontWeight: 600,
      },
    },
    Link: {
      baseStyle: {
        color: 'brand.heraldic',
        _hover: {
          color: '#b78b2b', // darkened gold
        },
      },
    },
    Button: {
      variants: {
        solid: {
          bg: 'brand.midnightBlue',
          color: 'white',
          _hover: { bg: 'brand.heraldic' },
        },
        outline: {
          borderColor: 'brand.gold',
          color: 'brand.midnightBlue',
          _hover: { bg: '#b78b2b', color: 'white' },
        },
      },
    },
    Divider: {
      baseStyle: {
        borderColor: 'brand.stone',
        opacity: 0.4,
      },
    },
    Card: cardTheme,
    ProfileHeader: profileHeaderTheme,
    PlayerStats: playerStatsTheme,
    Input: {
      variants: {
        filled: {
          field: {
            bg: 'brand.parchment',
            borderColor: 'brand.steel',
            borderRadius: 'md',
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
            bg: 'brand.parchment',
            borderColor: 'brand.steel',
            borderRadius: 'md',
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
            borderColor: 'brand.steel',
            color: 'brand.midnightBlue',
            fontWeight: 'bold',
          },
          td: {
            borderBottom: '1px solid',
            borderColor: 'gray.200',
          },
        },
      },
    },
    Accordion: {
      variants: {
        filled: {
          container: {
            borderWidth: '1px',
            borderColor: 'brand.lightSteel',
            boxShadow: '0 2px 4px rgba(0, 51, 102, 0.1)',
            borderRadius: 'lg',
            overflow: 'hidden',
            bg: 'white',
          },
          button: {
            bg: 'white',
            color: 'brand.black',
            _hover: {
              bg: 'gray.50',
            },
            borderRadius: 'lg',
            borderBottomRadius: 'none',
          },
          panel: {
            bg: 'white',
            padding: 4,
          },
        },
      },
    },
  },
});

export default theme;