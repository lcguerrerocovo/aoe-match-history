import { Box, Flex, Text, useTheme } from "@chakra-ui/react";
import { useLayoutConfig } from "../theme/breakpoints";
import { FaGlobe } from 'react-icons/fa';
import { PlayerSearch } from './PlayerSearch';
import type { PlayerSearchResult } from './PlayerSearch';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useRef } from 'react';
import { searchPlayers } from '../services/matchService';

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
        base: "linear-gradient(180deg, #f9fafb 0%, #e6e8ec 10%, #cfd2d6 60%, #b0b6be 100%)",
        md: "linear-gradient(180deg, #f9fafb 0%, #e6e8ec 20%, #cfd2d6 55%, #bfc4ca 100%)"
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
        bgGradient="linear(to-r, rgba(255,255,255,0.7), rgba(255,255,255,0.1))"
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
          textShadow="0 1px 0 #fff, 0 2px 4px rgba(0,0,0,0.04)"
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
        <Box w={{ base: '100%', sm: '220px' }} ref={searchContainerRef}>
          <PlayerSearch onSelect={handlePlayerSelect} placeholder="Search players..." size="sm" context="topbar" searchFn={searchPlayers} />
        </Box>
      </Flex>
    </Box>
  );
};

export default TopBar; 