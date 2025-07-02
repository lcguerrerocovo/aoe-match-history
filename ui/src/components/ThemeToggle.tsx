import { Box, IconButton, useTheme } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FaMoon, FaSun } from 'react-icons/fa';
import { useThemeMode } from '../theme/ThemeProvider';

// Smooth rotation animation
const rotateIn = keyframes`
  from { transform: rotate(-90deg) scale(0.8); opacity: 0; }
  to { transform: rotate(0deg) scale(1); opacity: 1; }
`;

// Pulsing glow effect - will be dynamically set
const pulseGlow = (sunGlow: string, sunGlowBright: string) => keyframes`
  0% { box-shadow: 0 0 8px ${sunGlow}; }
  50% { box-shadow: 0 0 12px ${sunGlowBright}; }
  100% { box-shadow: 0 0 8px ${sunGlow}; }
`;

const moonGlow = (moonGlow: string, moonGlowBright: string) => keyframes`
  0% { box-shadow: 0 0 6px ${moonGlow}; }
  50% { box-shadow: 0 0 10px ${moonGlowBright}; }
  100% { box-shadow: 0 0 6px ${moonGlow}; }
`;

export function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeMode();
  const theme = useTheme();

  return (
    <Box position="relative">
      <IconButton
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        icon={
          <Box
            key={isDark ? 'moon' : 'sun'} // Key change triggers animation
            animation={`${rotateIn} 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)`}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            {isDark ? (
              <FaMoon size={16} />
            ) : (
              <FaSun size={16} />
            )}
          </Box>
        }
        onClick={toggleTheme}
        size="sm"
        variant="ghost"
        borderRadius="full"
        bg={isDark 
          ? theme.colors.brand.sunBg
          : theme.colors.brand.sunBg
        }
        color={isDark ? theme.colors.brand.sunColor : theme.colors.brand.sunColor}
        border="2px solid"
        borderColor={isDark ? theme.colors.brand.sunBorder : theme.colors.brand.sunBorder}
        _hover={{
          bg: isDark 
            ? theme.colors.brand.sunGlowDim
            : theme.colors.brand.sunGlowDim,
          borderColor: isDark ? theme.colors.brand.sunGlowBright : theme.colors.brand.sunGlowBright,
          animation: isDark 
            ? `${moonGlow(theme.colors.brand.sunGlow, theme.colors.brand.sunGlowBright)} 3s ease-in-out infinite`
            : `${pulseGlow(theme.colors.brand.sunGlow, theme.colors.brand.sunGlowBright)} 3s ease-in-out infinite`,
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
          background: isDark
            ? theme.colors.brand.sunRadialGradient
            : theme.colors.brand.sunRadialGradient,
          opacity: 0,
          transform: 'scale(0)',
          transition: 'all 0.3s ease',
        }}
      />
      
      {/* Ambient light effect */}
      <Box
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        width="60px"
        height="60px"
        borderRadius="full"
        pointerEvents="none"
        background={isDark
          ? theme.colors.brand.sunRadialGradientBg
          : theme.colors.brand.sunRadialGradientBg
        }
        opacity={0}
        transition="opacity 0.3s ease"
        _groupHover={{
          opacity: 1,
        }}
        zIndex={-1}
      />
    </Box>
  );
} 