import { Box, Flex, Text, useTheme } from "@chakra-ui/react";
import { useLayoutConfig } from "../theme/breakpoints";
import { FaGlobe } from 'react-icons/fa';
import { PlayerSearch } from './PlayerSearch';
import type { PlayerSearchResult } from './PlayerSearch';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useRef } from 'react';
import { searchPlayers } from '../services/playerSearchService';
import { ThemeToggle } from './ThemeToggle';

const TopBar = () => {
  const theme = useTheme();
  const layout = useLayoutConfig();
  const contentMaxWidth = layout?.matchList?.width || '100%';
  const navigate = useNavigate();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  function handlePlayerSelect(player: PlayerSearchResult) {
    navigate(`/profile_id/${player.id}`);
  }

  return (
    <Box
      data-testid="topbar-root"
      width="100%"
      position="relative"
      bg={{
        base: "brand.topbarBg",
        md: "brand.topbarBgMd"
      }}
      px={theme.space[4]}
      py={theme.space[2]}
      boxShadow={{ md: 'xl' }}
      zIndex={10}
      borderBottomWidth={{ base: '0px', md: '4px' }}
      borderBottomStyle="solid"
      borderColor="brand.gold"
      borderRadius={{ md: '0 0 var(--chakra-radii-xl) var(--chakra-radii-xl)' }}
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
      <Box
        position="relative"
        zIndex={2}
      >
        {/* Desktop layout */}
        <Flex
          maxW={contentMaxWidth}
          mx="auto"
          align="center"
          justify="space-between"
          display={{ base: 'none', md: 'flex' }}
          data-testid="desktop-layout"
        >
          {/* Left: Site title */}
          <Text
            fontWeight="bold"
            color="brand.midnightBlue"
            fontSize="2xl"
            letterSpacing="wide"
            textShadow={`0 1px 0 ${theme.colors.brand.textShadowLight}, 0 2px 4px ${theme.colors.brand.textShadowAlpha}`}
            display="flex"
            alignItems="center"
            gap={0.5}
            as={RouterLink}
            to="/"
            cursor="pointer"
            _hover={{ textDecoration: 'none', filter: 'brightness(1.15)' }}
            data-testid="desktop-title"
          >
            aoe2
            <Box as="span" display="inline-flex" alignItems="center">
              <FaGlobe size={14} color="inherit" style={{ verticalAlign: 'middle' }} />
            </Box>
            site
          </Text>

          {/* Right: Search bar */}
          <Box w="220px" ref={searchContainerRef}>
            <PlayerSearch onSelect={handlePlayerSelect} placeholder="Search players..." size="sm" context="topbar" searchFn={searchPlayers} />
          </Box>
        </Flex>

        {/* Mobile layout */}
        <Flex
          align="center"
          justify="center"
          position="relative"
          display={{ base: 'flex', md: 'none' }}
          mb={3}
          data-testid="mobile-layout"
        >
          {/* Centered title */}
          <Text
            fontWeight="bold"
            color="brand.midnightBlue"
            fontSize="xl"
            letterSpacing="wide"
            textShadow={`0 1px 0 ${theme.colors.brand.textShadowLight}, 0 2px 4px ${theme.colors.brand.textShadowAlpha}`}
            display="flex"
            alignItems="center"
            gap={0.5}
            as={RouterLink}
            to="/"
            cursor="pointer"
            _hover={{ textDecoration: 'none', filter: 'brightness(1.15)' }}
            data-testid="mobile-title"
          >
            aoe2
            <Box as="span" display="inline-flex" alignItems="center">
              <FaGlobe size={12} color="inherit" style={{ verticalAlign: 'middle' }} />
            </Box>
            site
          </Text>

          {/* Mobile toggle - positioned at same level as title */}
          <Box
            position="absolute"
            right={0}
            display={{ base: 'block', md: 'none' }}
            data-testid="mobile-toggle"
          >
            <ThemeToggle />
          </Box>
        </Flex>

        {/* Mobile search bar - below title */}
        <Box
          display={{ base: 'block', md: 'none' }}
          maxW="300px"
          mx="auto"
          data-testid="mobile-search"
        >
          <PlayerSearch onSelect={handlePlayerSelect} placeholder="Search players..." size="sm" context="topbar" searchFn={searchPlayers} />
        </Box>
      </Box>

      {/* Theme toggle - always at absolute far right */}
      <Box
        position="absolute"
        right={theme.space[4]}
        top="50%"
        transform="translateY(-50%)"
        zIndex={3}
        display={{ base: 'none', md: 'block' }}
        data-testid="desktop-toggle"
      >
        <ThemeToggle />
      </Box>
    </Box>
  );
};

export default TopBar; 