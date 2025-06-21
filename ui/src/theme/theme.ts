import { extendTheme } from '@chakra-ui/react';
import { cardAnatomy } from '@chakra-ui/anatomy';
import { createMultiStyleConfigHelpers } from '@chakra-ui/react';

const { definePartsStyle, defineMultiStyleConfig } = createMultiStyleConfigHelpers(cardAnatomy.keys);

const colors = {
  brand: {
    midnightBlue: '#003366', // A darker, more professional blue
    gold: '#FFC72C',         // A vibrant, rich gold
    bronze: '#CD7F32',       // Classic bronze
    black: '#1A202C',         // Chakra's gray.800 for a softer black
    parchment: '#FAF3E0',     // A warm, parchment-like background (toned down)
  },
};

// 1. Recreate the reusable style objects from breakpoints.ts
const matchCardStyles = {
  base: {
    padding: '1rem',
    marginBottom: '1rem',
    flexDirection: 'column',
    gap: '1rem',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  lg: {
    padding: '1rem',
    marginBottom: '0.5rem',
    flexDirection: 'row',
    gap: '1rem',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  desktop: {
    padding: '1.5rem',
    marginBottom: '1rem',
    flexDirection: 'row',
    gap: '2rem',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
};

const cardTheme = defineMultiStyleConfig({
  variants: {
    match: definePartsStyle({
      container: {
        // Base visual style
        backgroundColor: 'white',
        borderWidth: '1px',
        borderColor: 'gray.200',
        borderRadius: 'lg',
        width: '100%',
        display: 'flex',
        // This should always be a column to keep the summary on top.
        flexDirection: 'column',
        // Responsive padding and margin are correct for the outer card
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
      },
    }),
    summary: definePartsStyle({
      container: {
        backgroundColor: 'white',
        borderWidth: '1px',
        borderColor: 'gray.200',
        borderRadius: 'md',
        bg: 'gray.50',
      },
    }),
  },
});

const theme = extendTheme({
  colors,
  styles: {
    global: {
      body: {
        bg: 'brand.parchment',
        color: 'brand.black',
      },
    },
  },
  components: {
    Card: cardTheme,
  },
});

export default theme; 