import { extendTheme } from '@chakra-ui/react';
import { cardAnatomy, anatomy } from '@chakra-ui/anatomy';
import { createMultiStyleConfigHelpers } from '@chakra-ui/react';

const { definePartsStyle: defineCardPartsStyle, defineMultiStyleConfig: defineCardMultiStyleConfig } = createMultiStyleConfigHelpers(cardAnatomy.keys);

const profileHeaderAnatomy = anatomy('profileHeader').parts(
  'container', 'avatar', 'name', 'id', 'statsTable', 'tableHeader', 'tableCell'
);
const { definePartsStyle: defineProfileHeaderPartsStyle, defineMultiStyleConfig: defineProfileHeaderMultiStyleConfig } = createMultiStyleConfigHelpers(profileHeaderAnatomy.keys);

const colors = {
  brand: {
    midnightBlue: '#003366', // A darker, more professional blue
    gold: '#FFC72C',         // A vibrant, rich gold
    bronze: '#CD7F32',       // Classic bronze
    black: '#1A202C',         // Chakra's gray.800 for a softer black
    parchment: '#FAF3E0',     // A warm, parchment-like background (toned down)
    steel: '#4A5568',         // Dark steel for borders and accents
    heraldic: '#2D3748',      // Deep heraldic blue
    
    // Thematic status colors from user feedback
    win: '#228B22',          // ForestGreen for wins/positive streaks
    loss: '#B22222',         // Firebrick red for losses
    same: '#2b6cb0',         // A rich blue for rank/same status
  },
};

const cardTheme = defineCardMultiStyleConfig({
  variants: {
    match: defineCardPartsStyle({
      container: {
        backgroundColor: 'white',
        borderWidth: '2px',
        borderColor: 'brand.steel',
        borderRadius: 'lg',
        boxShadow: '0 4px 6px rgba(0, 51, 102, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        _hover: {
          boxShadow: '0 8px 12px rgba(0, 51, 102, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)',
          transform: 'translateY(-2px)',
          transition: 'all 0.2s ease-in-out',
        },
      },
    }),
    summary: defineCardPartsStyle({
      container: {
        backgroundColor: 'brand.parchment',
        borderWidth: '1px',
        borderColor: 'brand.gold',
        borderRadius: 'md',
        position: 'relative',
        _before: {
          content: '""',
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          height: '2px',
          background: 'linear-gradient(90deg, brand.gold, brand.bronze, brand.gold)',
          borderRadius: 'md md 0 0',
        },
      },
    }),
    filter: defineCardPartsStyle({
      container: {
        bg: 'white',
        borderWidth: '2px',
        borderColor: 'brand.steel',
        borderRadius: 'lg',
        boxShadow: '0 2px 4px rgba(0, 51, 102, 0.1)',
      }
    }),
  },
});

const profileHeaderTheme = defineProfileHeaderMultiStyleConfig({
  baseStyle: defineProfileHeaderPartsStyle({
    container: {
      bg: 'white',
      borderWidth: '2px',
      borderRadius: 'lg',
      boxShadow: '0 4px 6px rgba(0, 51, 102, 0.1)',
      width: '100%',
      height: 'auto',
      padding: '1rem',
      marginBottom: '1rem',
      borderRight: 'none',
      borderBottom: '1px solid',
      borderColor: 'brand.steel',
      position: 'relative',
      top: 'auto',
      left: 'auto',
      zIndex: 'auto',
      '@media (min-width: 768px)': {
        width: '300px',
        height: '100vh',
        padding: '1.5rem',
        marginBottom: '0.5rem',
        borderRight: '1px solid',
        borderBottom: 'none',
        position: 'fixed',
        top: '0',
        left: '0',
        zIndex: '1',
      },
      '@media (min-width: 1280px)': {
        width: '320px',
        padding: '2rem',
      }
    },
    avatar: {
      bg: 'brand.parchment',
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
        color: 'brand.same',
      },
      '.percentile': {
        color: 'brand.steel',
        fontSize: '2xs',
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

const theme = extendTheme({
  colors,
  styles: {
    global: {
      body: {
        bg: 'brand.parchment',
        color: 'brand.black',
        fontFamily: "'Lora', serif",
      },
      '*, *::before, &::after': {
        borderColor: 'brand.steel',
      },
    },
  },
  components: {
    Card: cardTheme,
    ProfileHeader: profileHeaderTheme,
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
          _hover: { bg: 'brand.gold', color: 'brand.black' },
        },
      },
    },
    Input: {
      variants: {
        filled: {
          field: {
            bg: 'brand.parchment',
            borderColor: 'brand.steel',
            _hover: { borderColor: 'brand.gold' },
            _focus: {
              borderColor: 'brand.gold',
              boxShadow: '0 0 0 1px var(--chakra-colors-brand-gold)',
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
            _hover: { borderColor: 'brand.gold' },
            _focus: {
              borderColor: 'brand.gold',
              boxShadow: '0 0 0 1px var(--chakra-colors-brand-gold)',
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
    Divider: {
      baseStyle: {
        borderColor: 'brand.steel',
      },
    },
  },
});

export default theme; 