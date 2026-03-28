import { Box, Flex, Text } from "@chakra-ui/react";
import { useLayoutConfig } from "../theme/breakpoints";
import { system } from "../theme/theme";
import { FaGlobe } from 'react-icons/fa';
import { PlayerSearch } from './PlayerSearch';
import type { PlayerSearchResult } from './PlayerSearch';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useRef } from 'react';
import { searchPlayers } from '../services/playerSearchService';
import { ThemeToggle } from './ThemeToggle';
import { PulsingDot } from './LiveMatchCard';

const TopBar = () => {
  const layout = useLayoutConfig();
  const contentMaxWidth = layout?.matchList?.width || '100%';
  const navigate = useNavigate();
  const location = useLocation();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const mobileNavItems = [
    { label: 'Live', path: '/live', dot: true },
  ];

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
            asChild><RouterLink to="/">
              <Box as="span" display="inline-flex" alignItems="center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginRight: '6px' }}>
                  <line x1="2" y1="12" x2="22" y2="12" stroke="#D4AF37" strokeWidth="0.5" opacity="0.25" />
                  <line x1="12" y1="4" x2="12" y2="20" stroke="#D4AF37" strokeWidth="0.5" opacity="0.25" />
                  <circle cx="12" cy="12" r="3" stroke="#D4AF37" strokeWidth="0.5" opacity="0.25" fill="none" />
                  <circle cx="12" cy="12" r="1" fill="#D4AF37" opacity="0.3" />
                  <line x1="5" y1="5" x2="19" y2="19" stroke="#D4AF37" strokeWidth="0.3" opacity="0.2" />
                  <line x1="19" y1="5" x2="5" y2="19" stroke="#D4AF37" strokeWidth="0.3" opacity="0.2" />
                </svg>
              </Box>
              aoe2
              <Box as="span" display="inline-flex" alignItems="center">
                <FaGlobe size={14} color="inherit" style={{ verticalAlign: 'middle' }} />
              </Box>
              site
              <Box as="span" display="inline-flex" alignItems="center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginLeft: '6px' }}>
                  <line x1="2" y1="12" x2="22" y2="12" stroke="#D4AF37" strokeWidth="0.5" opacity="0.25" />
                  <line x1="12" y1="4" x2="12" y2="20" stroke="#D4AF37" strokeWidth="0.5" opacity="0.25" />
                  <circle cx="12" cy="12" r="3" stroke="#D4AF37" strokeWidth="0.5" opacity="0.25" fill="none" />
                  <circle cx="12" cy="12" r="1" fill="#D4AF37" opacity="0.3" />
                  <line x1="5" y1="5" x2="19" y2="19" stroke="#D4AF37" strokeWidth="0.3" opacity="0.2" />
                  <line x1="19" y1="5" x2="5" y2="19" stroke="#D4AF37" strokeWidth="0.3" opacity="0.2" />
                </svg>
              </Box>
            </RouterLink></Text>

          {/* Right: Live link + Search bar */}
          <Flex align="center" gap={4}>
            <Flex
              align="center"
              gap={1.5}
              fontSize="sm"
              color="brand.topbarText"
              opacity={0.8}
              _hover={{ opacity: 1 }}
              letterSpacing="wide"
              textTransform="uppercase"
              asChild
            ><RouterLink to="/live"><PulsingDot size="6px" />Live</RouterLink></Flex>
            <Box w="220px" ref={searchContainerRef}>
              <PlayerSearch onSelect={handlePlayerSelect} placeholder="Search players..." size="sm" context="topbar" searchFn={searchPlayers} />
            </Box>
          </Flex>
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

        {/* Mobile: Nav row */}
        <Flex
          display={{ base: 'flex', md: 'none' }}
          justify="center"
          gap={5}
          mb={2}
          overflowX="auto"
          data-testid="mobile-nav"
        >
          {mobileNavItems.map(({ label, path, dot }) => {
            const isActive = location.pathname === path;
            return (
              <Flex
                key={path}
                align="center"
                gap={1.5}
                fontSize="xs"
                color={isActive ? 'brand.redChalk' : 'brand.topbarText'}
                opacity={isActive ? 1 : 0.6}
                letterSpacing="wide"
                textTransform="uppercase"
                borderBottomWidth="2px"
                borderBottomStyle="solid"
                borderColor={isActive ? 'brand.redChalk' : 'transparent'}
                pb={0.5}
                _hover={{ opacity: 1 }}
                asChild
              >
                <RouterLink to={path}>
                  {dot && <PulsingDot size="6px" />}
                  {label}
                </RouterLink>
              </Flex>
            );
          })}
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