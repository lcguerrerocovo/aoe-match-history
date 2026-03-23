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
    <VStack gap={2} align="center">
      {/* Double-line manuscript diagram frame */}
      <Box
        border="1px solid"
        borderColor="brand.inkLight"
        p="2px"
      >
        <Box
          w={{ base: '160px', md: '180px', lg: '200px' }}
          h={{ base: '160px', md: '180px', lg: '200px' }}
          border="1px solid"
          borderColor="brand.inkMuted"
          overflow="hidden"
        >
          <img
            src={imageUrl}
            alt={mapName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={handleImageError}
          />
        </Box>
      </Box>

      {/* Diagram label separator */}
      <Box w="40px" h="1px" bg="brand.inkMuted" mx="auto" />

      {/* Caption */}
      <Text
        fontSize="md"
        fontWeight="normal"
        fontStyle="italic"
        color="brand.inkMuted"
        textAlign="center"
      >
        {mapName}
      </Text>

      {/* Game type marginal note */}
      {match.diplomacy?.type && (
        <Text
          fontSize="xs"
          fontStyle="italic"
          color="brand.redChalk"
        >
          {match.diplomacy.type}
        </Text>
      )}
    </VStack>
  );
}
