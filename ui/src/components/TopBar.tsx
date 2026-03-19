import { Box, Flex, Text } from "@chakra-ui/react";
import { useLayoutConfig } from "../theme/breakpoints";
import { system } from "../theme/theme";
import { FaGlobe } from 'react-icons/fa';
import { PlayerSearch } from './PlayerSearch';
import type { PlayerSearchResult } from './PlayerSearch';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useRef } from 'react';
import { searchPlayers } from '../services/playerSearchService';
import { ThemeToggle } from './ThemeToggle';

const TopBar = () => {
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
      px={4}
      py={2}
      zIndex={10}
      borderBottomWidth={{ base: '0px', md: '2px' }}
      borderBottomStyle="solid"
      borderColor="brand.gold"
    >
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
            color="brand.topbarText"
            fontSize="2xl"
            letterSpacing="wide"
            textShadow={`0 1px 0 ${system.token('colors.brand.topbarTextShadow', '')}, 0 2px 4px ${system.token('colors.brand.topbarTextShadowAlpha', '')}`}
            display="flex"
            alignItems="center"
            gap={0.5}
            cursor="pointer"
            _hover={{ textDecoration: 'none', filter: 'brightness(1.15)' }}
            data-testid="desktop-title"
            asChild><RouterLink to="/">aoe2
                          <Box as="span" display="inline-flex" alignItems="center">
                <FaGlobe size={14} color="inherit" style={{ verticalAlign: 'middle' }} />
              </Box>site
                        </RouterLink></Text>

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
            color="brand.topbarText"
            fontSize="xl"
            letterSpacing="wide"
            textShadow={`0 1px 0 ${system.token('colors.brand.topbarTextShadow', '')}, 0 2px 4px ${system.token('colors.brand.topbarTextShadowAlpha', '')}`}
            display="flex"
            alignItems="center"
            gap={0.5}
            cursor="pointer"
            _hover={{ textDecoration: 'none', filter: 'brightness(1.15)' }}
            data-testid="mobile-title"
            asChild><RouterLink to="/">aoe2
                          <Box as="span" display="inline-flex" alignItems="center">
                <FaGlobe size={12} color="inherit" style={{ verticalAlign: 'middle' }} />
              </Box>site
                        </RouterLink></Text>

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
        right={4}
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