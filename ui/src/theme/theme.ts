import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    midnightBlue: '#003366', // A darker, more professional blue
    gold: '#FFC72C',         // A vibrant, rich gold
    bronze: '#CD7F32',       // Classic bronze
    black: '#1A202C',         // Chakra's gray.800 for a softer black
    cream: '#F7FAFC',         // Chakra's gray.50 for a clean, off-white background
  },
};

const theme = extendTheme({
  colors,
  styles: {
    global: {
      body: {
        bg: 'brand.cream',
        color: 'brand.black',
      },
    },
  },
});

export default theme; 