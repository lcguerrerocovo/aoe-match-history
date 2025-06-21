import { Box, VStack, Text, Image, Button, useTheme } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import logoImage from '../assets/logo/logo.png';

const DEFAULT_PROFILE_ID = '4764337';

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
        spacing={theme.spacing.responsive.landingSpacing} 
        align="center" 
        textAlign="center" 
        p={theme.spacing.responsive.landingPadding}
        w="100%"
        minH={{ base: '100vh', md: 'auto' }}
        justifyContent="center"
        maxW={{ md: '90%', xl: '1100px' }}
        bg="brand.parchment"
        borderRadius={{ base: 0, md: 'xl' }}
        boxShadow={{ md: 'xl' }}
        borderWidth={{ base: '3px', md: '4px' }}
        borderColor="brand.gold"
        position="relative"
        overflow="hidden"
      >
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
        
        {/* Logo */}
        <Box
          position="relative"
          cursor="pointer"
          transition="all 0.3s ease"
          _hover={{
            transform: 'scale(1.05)',
            filter: 'drop-shadow(0 10px 20px rgba(212,175,55,0.4))'
          }}
        >
          <RouterLink to={`/profile_id/${DEFAULT_PROFILE_ID}`}>
            <Image
              src={logoImage}
              alt="Age of Empires II Match History"
              maxW="400px"
              w="100%"
              h="auto"
              filter="drop-shadow(0 4px 8px rgba(0,0,0,0.1))"
            />
          </RouterLink>
        </Box>

        {/* Site Branding */}
        <Text
          fontSize={{ base: 'lg', md: 'xl' }}
          fontWeight="bold"
          color="brand.bronze"
          fontFamily="'Cinzel', serif"
          letterSpacing="wider"
          textShadow="1px 1px 2px rgba(0,0,0,0.1)"
        >
          aoe2.site
        </Text>

        {/* Call to Action */}
        <Button
          as={RouterLink}
          to={`/profile_id/${DEFAULT_PROFILE_ID}`}
          size="lg"
          bg="brand.gold"
          color="brand.midnightBlue"
          _hover={{
            bg: 'brand.bronze',
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 16px rgba(212,175,55,0.3)'
          }}
          _active={{
            transform: 'translateY(0)',
          }}
          borderRadius="full"
          px={theme.spacing.xl}
          py={theme.spacing.lg}
          fontSize="lg"
          fontWeight="bold"
          transition="all 0.2s ease"
          border="2px solid"
          borderColor="brand.midnightBlue"
        >
          View My Matches
        </Button>

        {/* Description */}
        <VStack spacing={theme.spacing.xl} maxW="600px" align="stretch">
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