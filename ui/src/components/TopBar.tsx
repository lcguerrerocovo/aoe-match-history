import { Box, Flex, Text, useTheme, HStack } from "@chakra-ui/react";
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
      <Flex
        maxW={contentMaxWidth}
        mx="auto"
        align="center"
        justify="space-between"
        direction={{ base: 'column', sm: 'row' }}
        gap={2}
        position="relative"
        zIndex={2}
      >
        <Text
          fontWeight="bold"
          color="brand.midnightBlue"
          fontSize={{ base: 'xl', md: '2xl' }}
          letterSpacing="wide"
          textShadow={`0 1px 0 ${theme.colors.brand.textShadowLight}, 0 2px 4px ${theme.colors.brand.textShadowAlpha}`}
          display="flex"
          alignItems="center"
          gap={0.5}
          as={RouterLink}
          to="/"
          cursor="pointer"
          _hover={{ textDecoration: 'none', filter: 'brightness(1.15)' }}
        >
          aoe2
          <Box as="span" display="inline-flex" alignItems="center">
            <Box display={{ base: 'inline', md: 'none' }}><FaGlobe size={12} color="inherit" style={{ verticalAlign: 'middle' }} /></Box>
            <Box display={{ base: 'none', md: 'inline' }}><FaGlobe size={14} color="inherit" style={{ verticalAlign: 'middle' }} /></Box>
          </Box>
          site
        </Text>
        <HStack spacing={3}>
          <Box w={{ base: '100%', sm: '220px' }} ref={searchContainerRef}>
            <PlayerSearch onSelect={handlePlayerSelect} placeholder="Search players..." size="sm" context="topbar" searchFn={searchPlayers} />
          </Box>
          <ThemeToggle />
        </HStack>
      </Flex>
    </Box>
  );
};

export default TopBar; 