import { useState } from 'react';
import { Box, VStack, Text } from '@chakra-ui/react';
import type { Match } from '../../types/match';
import { assetManager } from '../../utils/assetManager';

export function MapCard({ match }: { match: Match }) {
  const mapName = match.map || '';
  const [imageError, setImageError] = useState(false);

  const imageUrl = imageError
    ? assetManager.getGenericMapImage()
    : assetManager.getMapImage(mapName);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <VStack gap={4} align="center">
      <Box
        w={{ base: '160px', md: '180px', lg: '200px' }}
        h={{ base: '160px', md: '180px', lg: '200px' }}
        bg="transparent"
        borderRadius="md"
        overflow="hidden"
      >
        <img
          src={imageUrl}
          alt={mapName}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={handleImageError}
        />
      </Box>
      <Text fontSize="xl" fontWeight="semibold" color="brand.midnightBlue" textAlign="center">
        {mapName}
      </Text>
    </VStack>
  );
}
