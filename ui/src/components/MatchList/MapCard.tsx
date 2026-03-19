import { useState } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { useLayoutConfig } from '../../theme/breakpoints';
import type { Match } from '../../types/match';
import { assetManager } from '../../utils/assetManager';

export function MapCard({ match }: { match: Match }) {
  const layout = useLayoutConfig();
  const mapName = match.map || '';
  const [imageError, setImageError] = useState(false);

  const imageUrl = imageError
    ? assetManager.getGenericMapImage()
    : assetManager.getMapImage(mapName);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minW={layout?.mapCard.minWidth}
      maxW={layout?.mapCard.maxWidth}
      p={layout?.mapCard.padding}
      mb={layout?.mapCard.marginBottom}
      mx="auto"
    >
      {/* Diamond-shaped map image */}
      <Box
        w={layout?.mapCard.diamondSize}
        h={layout?.mapCard.diamondSize}
        bg="transparent"
        borderRadius="none"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="xs"
        fontWeight="bold"
        transform="rotate(45deg)"
        mb={2}
        overflow="hidden"
        border="none"
        boxShadow="none"
      >
        <Box transform="rotate(-45deg)" w={layout?.mapCard.diamondSize} h={layout?.mapCard.diamondSize} overflow="hidden" borderRadius="md">
          <img
            src={imageUrl}
            alt={mapName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 0 }}
            onError={handleImageError}
          />
        </Box>
      </Box>
      {/* Map name below image */}
      <Box mt={1} textAlign="center" fontSize="xs">
        <Text as="span" color="brand.inkMuted">{mapName}</Text>
      </Box>
    </Box>
  );
}
