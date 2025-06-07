import { Box, Text, VStack, Divider, HStack, Icon } from '@chakra-ui/react';
import { FaUser, FaTrophy, FaChartLine } from 'react-icons/fa';

interface ProfileHeaderProps {
  profileId: string;
  profile: { id: string, name: string } | null;
  isLoading: boolean;
}

export function ProfileHeader({ profileId, profile, isLoading }: ProfileHeaderProps) {
  const playerName = isLoading ? 'Loading...' : profile?.name || profileId;

  return (
    <Box 
      w="280px" 
      h="100vh" 
      bg="white" 
      borderRight="1px" 
      borderColor="gray.200"
      position="fixed"
      left="0"
      top="0"
      overflowY="auto"
    >
      <VStack spacing={6} align="stretch" p={6}>
        {/* Profile Section */}
        <VStack spacing={4} align="center" pb={4}>
          <Box 
            w="120px" 
            h="120px" 
            bg="gray.50" 
            borderRadius="full" 
            display="flex" 
            alignItems="center" 
            justifyContent="center"
            border="2px"
            borderColor="gray.200"
          >
            <Icon as={FaUser} boxSize={8} color="gray.400" />
          </Box>
          <VStack spacing={1}>
            <Text fontSize="xl" fontWeight="bold">{playerName}</Text>
            <Text fontSize="sm" color="gray.500">ID: {profileId}</Text>
          </VStack>
        </VStack>

        <Divider />

        {/* Stats Section */}
        <VStack spacing={4} align="stretch">
          <Text fontSize="sm" fontWeight="medium" color="gray.500" px={2}>STATS</Text>
          
          <HStack 
            p={3} 
            bg="gray.50" 
            borderRadius="md" 
            cursor="pointer"
            _hover={{ bg: 'gray.100' }}
            transition="all 0.2s"
          >
            <Icon as={FaTrophy} color="yellow.500" />
            <VStack align="start" spacing={0}>
              <Text fontSize="sm" fontWeight="medium">Win Rate</Text>
              <Text fontSize="xs" color="gray.500">Coming soon</Text>
            </VStack>
          </HStack>

          <HStack 
            p={3} 
            bg="gray.50" 
            borderRadius="md"
            cursor="pointer"
            _hover={{ bg: 'gray.100' }}
            transition="all 0.2s"
          >
            <Icon as={FaChartLine} color="blue.500" />
            <VStack align="start" spacing={0}>
              <Text fontSize="sm" fontWeight="medium">Performance</Text>
              <Text fontSize="xs" color="gray.500">Coming soon</Text>
            </VStack>
          </HStack>
        </VStack>
      </VStack>
    </Box>
  );
} 