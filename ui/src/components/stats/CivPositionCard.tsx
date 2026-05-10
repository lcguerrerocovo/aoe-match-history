import { Flex, Text, VStack } from '@chakra-ui/react';

const CDN_BASE = 'https://aoe2.site/assets';

const CIV_EMBLEM_SPECIAL: Record<string, string> = {
  'Lac Viet': 'lacviet.png',
  'Aztec': 'aztecs.png',
  'Macedonians': 'macedonian.png',
};

function cdnEmblemUrl(civName: string): string {
  const filename = CIV_EMBLEM_SPECIAL[civName] ?? `${civName.toLowerCase().replace(/\s+/g, '_')}.png`;
  return `${CDN_BASE}/civ_emblems/${filename}`;
}

interface CivPositionCardProps {
  rank: number;
  civName: string;
  winRate: number;
  totalGames: number;
  wilson?: number;
  stripColor?: string;
  stripSide?: 'left' | 'right' | 'both';
}

export function CivPositionCard({
  rank, civName, winRate, totalGames, wilson, stripColor, stripSide,
}: CivPositionCardProps) {
  const showLeft = stripColor && (stripSide === 'left' || stripSide === 'both');
  const showRight = stripColor && (stripSide === 'right' || stripSide === 'both');

  return (
    <Flex
      direction="row"
      align="stretch"
      bg="brand.cardBg"
      border="1px solid"
      borderColor="brand.bronze"
      borderRadius="md"
      w={{ base: '145px', md: '165px' }}
      position="relative"
      boxShadow="sm"
      transition="transform 0.15s ease"
      _hover={{ transform: 'translateY(-1px)', boxShadow: 'md' }}
      overflow="visible"
      mt="10px"
    >
      {showLeft && (
        <Flex
          w="4px"
          flexShrink={0}
          borderLeftRadius="md"
          style={{ backgroundColor: stripColor }}
        />
      )}

      {/* Rank badge */}
      <Flex
        position="absolute"
        top="-10px"
        left="50%"
        transform="translateX(-50%)"
        w="20px"
        h="20px"
        borderRadius="full"
        bg="brand.bronze"
        color="brand.parchment"
        align="center"
        justify="center"
        fontSize="2xs"
        fontWeight="900"
        border="1px solid"
        borderColor="brand.borderLight"
        zIndex={2}
      >
        {rank}
      </Flex>

      {/* Emblem */}
      <Flex align="center" justify="center" px={1.5} py={2} flexShrink={0}>
        <img
          src={cdnEmblemUrl(civName)}
          alt=""
          width={36}
          height={36}
          style={{ objectFit: 'contain', flexShrink: 0 }}
          onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
        />
      </Flex>

      {/* Stats */}
      <VStack gap={0} py={2} pr={2} align="start" flex={1} mt={1}>
        <Text
          fontSize="xs"
          fontWeight="700"
          color="brand.inkDark"
          lineHeight="1.2"
          truncate
        >
          {civName}
        </Text>

        <Text fontSize="sm" fontWeight="800" color="brand.darkWin" lineHeight="1.4">
          {(winRate * 100).toFixed(1)}%
        </Text>

        <Text fontSize="2xs" color="brand.inkMuted" lineHeight="1.2">
          {totalGames.toLocaleString()} games
        </Text>

        {wilson != null && (
          <Text fontSize="2xs" color="brand.inkMuted" lineHeight="1.2" opacity={0.7}>
            W {(wilson * 100).toFixed(1)}%
          </Text>
        )}
      </VStack>

      {showRight && (
        <Flex
          w="4px"
          flexShrink={0}
          borderRightRadius="md"
          style={{ backgroundColor: stripColor }}
        />
      )}
    </Flex>
  );
}
