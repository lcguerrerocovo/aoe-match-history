import { Box, VStack, Text, useTheme, Card, Input } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaGlobe } from 'react-icons/fa';

const DEFAULT_PROFILE_ID = '4764337';

// PlayerSearchBar component from TopBar
const PlayerSearchBar = () => (
  <Card variant="filter" p={0} w={{ base: '100%', sm: '300px', md: '400px' }}>
    <Input
      placeholder="Search players..."
      width="100%"
      variant="filled"
      fontSize={{ base: 'md', md: 'lg' }}
      borderRadius="lg"
      borderWidth={0}
      _placeholder={{ color: 'brand.steel' }}
      bg="white"
      color="brand.midnightBlue"
      boxShadow="none"
      h="50px"
    />
  </Card>
);

export function LandingPage() {
  const theme = useTheme();
  
  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      py={{ md: 8 }}
    >
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
          base: "linear-gradient(180deg, #f9fafb 0%, #e6e8ec 10%, #cfd2d6 60%, #b0b6be 100%)",
          md: "linear-gradient(180deg, #f9fafb 0%, #e6e8ec 20%, #cfd2d6 55%, #bfc4ca 100%)"
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
          bgGradient="linear(to-r, rgba(255,255,255,0.7), rgba(255,255,255,0.1))"
          borderTopRadius="md"
          pointerEvents="none"
          zIndex={1}
        />
        
        {/* Background pattern */}
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          opacity="0.05"
          backgroundImage="url('/pattern.png')"
          backgroundRepeat="repeat"
          backgroundSize="200px"
          zIndex="0"
        />
        
        {/* Logo - same as TopBar */}
        <Box
          position="relative"
          cursor="pointer"
          transition="all 0.3s ease"
          _hover={{
            transform: 'scale(1.05)',
            filter: 'drop-shadow(0 10px 20px rgba(212,175,55,0.4))'
          }}
          zIndex={2}
        >
          <RouterLink to={`/profile_id/${DEFAULT_PROFILE_ID}`}>
            <Text
              fontWeight="bold"
              color="brand.midnightBlue"
              fontSize={{ base: '3xl', md: '4xl', lg: '5xl' }}
              letterSpacing="wide"
              textShadow="0 1px 0 #fff, 0 2px 4px rgba(0,0,0,0.04)"
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
        <Box position="relative" zIndex={2}>
          <PlayerSearchBar />
        </Box>

        {/* Description */}
        <VStack spacing={{ base: '1rem', md: theme.spacing.xl }} maxW="600px" align="stretch" position="relative" zIndex={2}>
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
            bg="white"
            borderRadius="md"
            borderLeft="4px solid"
            borderColor="brand.gold"
            boxShadow="0 2px 8px rgba(0,0,0,0.05)"
          >
            <Text
              fontSize={{ base: 'sm', md: 'md' }}
              color="brand.steel"
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