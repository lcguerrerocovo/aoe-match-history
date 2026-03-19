import { Box, VStack, Text } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaGlobe } from 'react-icons/fa';
import { PlayerSearch } from './PlayerSearch';
import type { PlayerSearchResult } from './PlayerSearch';
import { useNavigate } from 'react-router-dom';
import { searchPlayers } from '../services/playerSearchService';
import { ThemeToggle } from './ThemeToggle';
import { responsiveSpacing } from '../theme/theme';

export function LandingPage() {
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
        gap={responsiveSpacing.landingSpacing}
        align="center"
        textAlign="center"
        p={responsiveSpacing.landingPadding}
        w="100%"
        minH={{ base: '100vh', md: 'auto' }}
        justifyContent="center"
        maxW={{ md: '90%', xl: '1100px' }}
        bg={{
          base: "brand.landingBg",
          md: "brand.landingBgMd"
        }}
        borderRadius="sm"
        borderWidth={{ base: '3px', md: '4px' }}
        borderColor="brand.inkMedium"
        position="relative"
        overflow="hidden"
      >
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
        {/* Logo */}
        <Box
          cursor="pointer"
          transition="all 0.3s ease"
          _hover={{
            filter: 'brightness(1.05)'
          }}
        >
          <RouterLink to="#">
            <Text
              fontWeight="bold"
              color="brand.inkDark"
              fontSize={{ base: '3xl', md: '4xl', lg: '5xl' }}
              letterSpacing="wide"
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
        {/* Player Search Component */}
        <Box w="100%" maxW="400px">
          <PlayerSearch onSelect={handlePlayerSelect} context="landing" searchFn={searchPlayers} />
        </Box>
        {/* Description */}
        <VStack gap={{ base: '1rem', md: '2rem' }} maxW="600px" align="stretch">
          <Text
            fontSize={{ base: 'lg', md: 'xl' }}
            fontWeight="600"
            color="brand.inkDark"
            textAlign="center"
            lineHeight="1.4"
          >
            Your recent Age of Empires 2 matches with detailed analytics at a glance.
          </Text>
          <Box width="60px" height="2px" bg="brand.inkMedium" mx="auto" />
          <Box
            p="1rem"
            bg="brand.parchmentSurface"
            borderRadius="sm"
            borderLeft="4px solid"
            borderColor="brand.inkMedium"
          >
            <Text
              fontSize={{ base: 'sm', md: 'md' }}
              color="brand.inkDark"
              lineHeight="1.6"
            >
              Analyze your recent Age of Empires II ranked match history with detailed performance
              metrics. View player statistics and performance, as well as detailed match APM insights
              broken down by action types from your latest games in a clean, competitive-focused interface.
              <br /> <br /> More features coming soon!
            </Text>
          </Box>
        </VStack>
      </VStack>
    </Box>
  );
}
