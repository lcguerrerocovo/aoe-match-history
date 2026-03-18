import { Box, IconButton } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FaMoon } from 'react-icons/fa';
import { useThemeMode } from '../theme/ThemeProvider';

const rotateIn = keyframes`
  from { transform: rotate(-90deg) scale(0.8); opacity: 0; }
  to { transform: rotate(0deg) scale(1); opacity: 1; }
`;

// Use CSS custom properties for glow keyframes
const pulseGlow = keyframes`
  0% { box-shadow: 0 0 8px var(--chakra-colors-brand-sun-glow); }
  50% { box-shadow: 0 0 12px var(--chakra-colors-brand-sun-glow-bright); }
  100% { box-shadow: 0 0 8px var(--chakra-colors-brand-sun-glow); }
`;

export function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeMode();

  return (
    <Box position="relative">
      <IconButton
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        onClick={toggleTheme}
        size="sm"
        variant="ghost"
        borderRadius="full"
        bg="brand.sunBg"
        color="brand.sunColor"
        border="2px solid"
        borderColor="brand.sunBorder"
        _hover={{
          bg: 'brand.sunGlowDim',
          borderColor: 'brand.sunGlowBright',
          animation: `${pulseGlow} 3s ease-in-out infinite`,
        }}
        _active={{
          transform: 'scale(0.95)',
        }}
        transition="all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
        position="relative"
        overflow="hidden"
        _before={{
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 'full',
          background: 'brand.sunRadialGradient',
          opacity: 0,
          transform: 'scale(0)',
          transition: 'all 0.3s ease',
        }}
      >
        <Box
          key={isDark ? 'moon' : 'sun'}
          animation={`${rotateIn} 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)`}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {isDark ? (
            <FaMoon size={16} />
          ) : (
            <Box
              width="14px"
              height="14px"
              borderRadius="full"
              bg="brand.gold"
              border="1px solid rgba(0,0,0,0.15)"
              boxShadow="0 1px 2px rgba(0,0,0,0.1)"
            />
          )}
        </Box>
      </IconButton>

      <Box
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        width="60px"
        height="60px"
        borderRadius="full"
        pointerEvents="none"
        background="brand.sunRadialGradientBg"
        opacity={0}
        transition="opacity 0.3s ease"
        _groupHover={{ opacity: 1 }}
        zIndex={-1}
      />
    </Box>
  );
}
