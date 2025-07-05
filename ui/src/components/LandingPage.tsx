import { Box, VStack, Text, useTheme } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaGlobe } from 'react-icons/fa';
import { PlayerSearch } from './PlayerSearch';
import type { PlayerSearchResult } from './PlayerSearch';
import { useNavigate } from 'react-router-dom';
import { searchPlayers } from '../services/playerSearchService';
import { ThemeToggle } from './ThemeToggle';

export function LandingPage() {
  const theme = useTheme();
  const navigate = useNavigate();

  function handlePlayerSelect(player: PlayerSearchResult) {
    navigate(`/profile_id/${player.id}`);
  }

  return (
    <Box
      minH="100vh"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      py={{ md: 8 }}
      position="relative"
    >
      {/* Floating Theme Toggle */}
      <Box
        position="absolute"
        top={{ base: 4, md: 8 }}
        right={{ base: 4, md: 8 }}
        zIndex={1000}
      >
        <ThemeToggle />
      </Box>
      <VStack 
        spacing={{ base: '1.5rem', md: theme.spacing.responsive.landingSpacing }} 
        align="center" 
        textAlign="center" 
        p={{ base: '1rem', md: theme.spacing.responsive.landingPadding }}
        w="100%"
        minH={{ base: '100vh', md: 'auto' }}
        justifyContent="center"
        maxW={{ md: '90%', xl: '1100px' }}
        bg={{
          base: "brand.landingBg",
          md: "brand.landingBgMd"
        }}
        borderRadius={{ base: 0, md: 'xl' }}
        boxShadow={{ md: 'xl' }}
        borderWidth={{ base: '3px', md: '4px' }}
        borderColor="brand.gold"
        position="relative"
        overflow="hidden"
      >
        {/* Gloss highlight */}
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          height="8px"
          bgGradient={`linear(to-r, ${theme.colors.brand.heroGradientStart}, ${theme.colors.brand.heroGradientEnd})`}
                    borderTopRadius="md"
          pointerEvents="none"
          zIndex={1}
        />
        {/* Background overlay */}
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          opacity="0.05"
          backgroundRepeat="repeat"
          backgroundSize="200px"
          zIndex="0"
        />
        {/* Logo - simplified without problematic positioning */}
        <Box
          cursor="pointer"
          transition="all 0.3s ease"
          _hover={{
            filter: `drop-shadow(0 10px 20px ${theme.colors.brand.shadowGold}) brightness(1.05)`
          }}
        >
          <RouterLink to="#">
            <Text
              fontWeight="bold"
              color="brand.midnightBlue"
              fontSize={{ base: '3xl', md: '4xl', lg: '5xl' }}
              letterSpacing="wide"
              textShadow={`0 1px 0 ${theme.colors.brand.textShadowLight}, 0 2px 4px ${theme.colors.brand.textShadowAlpha}`}
              display="flex"
              alignItems="center"
              gap={1}
            >
              aoe2
              <Box as="span" display="inline-flex" alignItems="center">
                <FaGlobe size={24} color="inherit" style={{ verticalAlign: 'middle' }} />
              </Box>
              site
            </Text>
          </RouterLink>
        </Box>
        {/* Player Search Component - moved outside all stacking contexts */}
        <Box w="100%" maxW="400px">
          <PlayerSearch onSelect={handlePlayerSelect} context="landing" searchFn={searchPlayers} />
        </Box>
        {/* Description */}
        <VStack spacing={{ base: '1rem', md: theme.spacing.xl }} maxW="600px" align="stretch">
          <Text
            fontSize={{ base: 'lg', md: 'xl' }}
            fontWeight="600"
            color="brand.midnightBlue"
            textAlign="center"
            lineHeight="1.4"
          >
            Your complete Age of Empires II match history at a glance
          </Text>
          {/* Separator */}
          <Box width="60px" height="2px" bg="brand.gold" mx="auto" />
          <Box
            p={theme.spacing.md}
            bg="brand.parchmentSurface"
            borderRadius="md"
            borderLeft="4px solid"
            borderColor="brand.gold"
            boxShadow={`0 2px 8px ${theme.colors.brand.shadowLight}`}
          >
            <Text
              fontSize={{ base: 'sm', md: 'md' }}
              color="brand.midnightBlue"
              lineHeight="1.6"
            >
              Analyze your ranked ladder performance with detailed match breakdowns, 
              win/loss tracking, rating progression, and player statistics. View match 
              timelines, civilization picks, and map performance in an elegant interface 
              designed for serious Age of Empires II players.
            </Text>
          </Box>
        </VStack>
      </VStack>
    </Box>
  );
} 