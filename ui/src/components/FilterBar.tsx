import { HStack, Input, NativeSelect, Card, Box, Text, IconButton, VStack, useBreakpointValue } from '@chakra-ui/react';
import { cardVariant } from '../types/chakra-overrides';
import { FaSortAmountDown, FaSortAmountUpAlt } from 'react-icons/fa';
import type { Map, MatchType, SortDirection } from '../types/match';
import { useLayoutConfig } from '../theme/breakpoints';
import { system } from '../theme/theme';
import { useState, useEffect, useRef } from 'react';

interface FilterBarProps {
  onMapChange: (map: string) => void;
  onMatchTypeChange: (matchType: string) => void;
  onSortChange: (direction: SortDirection) => void;
  onSearchChange: (search: string) => void;
  onClearSearch?: () => void;
  maps: Map[];
  matchTypes: MatchType[];
  searchResultsCount?: number;
  searchValue?: string;
  selectedMap?: string;
  selectedMatchType?: string;
  sortDirection?: SortDirection;
}

function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  const timeout = useRef<number | null>(null);
  useEffect(() => {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = window.setTimeout(() => setDebounced(value), delay);
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, [value, delay]);
  return debounced;
}

// Shared ruled-input styles: bottom-rule only, transparent bg, manuscript feel
const ruledInputStyles = {
  bg: 'transparent',
  borderWidth: '0 0 1px 0',
  borderColor: 'brand.borderWarm',
  borderRadius: '0',
  _focus: {
    borderColor: 'brand.redChalk',
    borderWidth: '0 0 2px 0',
    bg: 'transparent',
  },
};

// Annotation label: small manuscript marginalia above controls
const AnnotationLabel = ({ children }: { children: string }) => (
  <Text
    fontSize="2xs"
    textTransform="uppercase"
    letterSpacing="wider"
    color="brand.inkMuted"
    fontWeight="bold"
    mb={0.5}
    lineHeight="1"
  >
    {children}
  </Text>
);

export const FilterBar = ({ onMapChange, onMatchTypeChange, onSortChange, onSearchChange, onClearSearch, maps, matchTypes, searchResultsCount, searchValue: externalSearchValue = '', selectedMap: externalSelectedMap = '', selectedMatchType: externalSelectedMatchType = '', sortDirection: externalSortDirection = 'desc' }: FilterBarProps) => {
  const layout = useLayoutConfig();
  const isDesktop = useBreakpointValue({ base: false, md: true });
  const [searchValue, setSearchValue] = useState(externalSearchValue);
  const [selectedMap, setSelectedMap] = useState(externalSelectedMap);
  const [selectedMatchType, setSelectedMatchType] = useState(externalSelectedMatchType);
  const [sortDirection, setSortDirection] = useState(externalSortDirection);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const debouncedSearch = useDebouncedValue(searchValue, 300);

  useEffect(() => {
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  // Sync external values with internal state
  useEffect(() => {
    setSearchValue(externalSearchValue);
  }, [externalSearchValue]);

  useEffect(() => {
    setSelectedMap(externalSelectedMap);
  }, [externalSelectedMap]);

  useEffect(() => {
    setSelectedMatchType(externalSelectedMatchType);
  }, [externalSelectedMatchType]);

  useEffect(() => {
    setSortDirection(externalSortDirection);
  }, [externalSortDirection]);

  const handleClear = () => {
    setSearchValue('');
    onClearSearch?.();
  };

  const getSearchPlaceholder = () => {
    if (searchValue && searchResultsCount !== undefined) {
      return `${searchResultsCount} matches found`;
    }
    return 'Filter matches...';
  };

  const shouldShowDropdown = searchValue && searchResultsCount !== undefined && isSearchFocused;

  return (
    <Box w={layout?.matchList.width} maxWidth={layout?.matchList.maxWidth}>
      {isDesktop && <AnnotationLabel>Index</AnnotationLabel>}
      <Card.Root
        variant={cardVariant('filter')}
        w="100%"
        p={layout?.filterBar.padding}
        mb={layout?.filterBar.marginBottom}
      >
        <HStack justify="space-between" align="flex-end">
          {/* Left: Search input with annotation */}
          <VStack align="flex-start" gap={0} flex="1" maxW={{ base: "300px", md: "220px" }} mr={4}>
            <AnnotationLabel>Search</AnnotationLabel>
            <Box
              position="relative"
              w="100%"
              onMouseEnter={() => setIsSearchFocused(true)}
              onMouseLeave={() => setIsSearchFocused(false)}
            >
              <Input
                placeholder={getSearchPlaceholder()}
                w="100%"
                variant="outline"
                fontSize={{ base: 'xs', md: 'sm' }}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
                {...ruledInputStyles}
                bg={searchValue ? 'brand.stone' : 'transparent'}
                _focus={{
                  ...ruledInputStyles._focus,
                  bg: searchValue ? 'brand.stone' : 'transparent',
                }}
              />
              {searchValue && (
                <Box
                  position="absolute"
                  right={3}
                  top="50%"
                  transform="translateY(-50%)"
                  cursor="pointer"
                  onClick={handleClear}
                  color="brand.inkMuted"
                  fontSize="lg"
                  _hover={{ color: 'brand.redChalk' }}
                >
                  ×
                </Box>
              )}

              {/* Filter Results Dropdown */}
              {shouldShowDropdown && (
                <Box
                  position="absolute"
                  top="100%"
                  left={0}
                  right={0}
                  mt={1}
                  bg="brand.stone"
                  borderRadius={0}
                  p={2}
                  fontSize="sm"
                  zIndex={10}
                  boxShadow={{ base: '1px 2px 6px rgba(107,82,64,0.15), 0 0 0 0.5px rgba(139,90,43,0.2)', _dark: '1px 2px 6px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.15)' }}
                >
                  <Text color="brand.inkDark" textAlign="center">
                    {searchResultsCount} matches found
                  </Text>
                </Box>
              )}
            </Box>
          </VStack>

          {/* Right: Filter Controls with annotations */}
          <HStack gap={layout?.filterBar.gap} align="flex-end">
            <VStack align="flex-start" gap={0}>
              <AnnotationLabel>Map</AnnotationLabel>
              <NativeSelect.Root
                w={{ base: '90px', md: layout?.filterBar.selectWidth }}
              >
                <NativeSelect.Field
                  value={selectedMap}
                  onChange={(e) => {
                    setSelectedMap(e.target.value);
                    onMapChange(e.target.value);
                  }}
                  fontSize={{ base: 'xs', md: 'sm' }}
                  {...ruledInputStyles}
                >
                  <option key="all-maps" value="">All maps</option>
                  {maps
                    .filter(({ name }) => name && name.trim().length > 0)
                    .map(({ name, count }, index) => (
                      <option key={`${name}-${index}`} value={name}>
                        {name} ({count || 0})
                      </option>
                    ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </VStack>
            <VStack align="flex-start" gap={0}>
              <AnnotationLabel>Type</AnnotationLabel>
              <NativeSelect.Root
                w={{ base: '85px', md: layout?.filterBar.selectWidth }}
              >
                <NativeSelect.Field
                  value={selectedMatchType}
                  onChange={(e) => {
                    setSelectedMatchType(e.target.value);
                    onMatchTypeChange(e.target.value);
                  }}
                  fontSize={{ base: 'xs', md: 'sm' }}
                  {...ruledInputStyles}
                >
                  <option key="all-match-types" value="">All types</option>
                  {matchTypes
                    .filter(({ name }) => name && name.trim().length > 0)
                    .map(({ name, count }, index) => (
                      <option key={`${name}-${index}`} value={name}>
                        {name} ({count || 0})
                      </option>
                    ))}
                </NativeSelect.Field>
              </NativeSelect.Root>
            </VStack>
            <IconButton
              aria-label={`Sort ${sortDirection === 'desc' ? 'oldest first' : 'newest first'}`}
              onClick={() => {
                const newDirection = sortDirection === 'desc' ? 'asc' : 'desc';
                setSortDirection(newDirection);
                onSortChange(newDirection);
              }}
              variant="solid"
              size="md"
              bg="transparent"
              borderWidth="0"
              color="brand.inkDark"
              borderRadius="full"
              boxShadow={`0 0 0 1px ${system.token('colors.brand.borderWarm', '#9C8567')}`}
              _hover={{
                bg: 'brand.stone',
                boxShadow: `0 0 0 1.5px ${system.token('colors.brand.inkMedium', '#6B5240')}`,
              }}
            >
              {sortDirection === 'desc' ? <FaSortAmountDown /> : <FaSortAmountUpAlt />}
            </IconButton>
          </HStack>
        </HStack>
      </Card.Root>
    </Box>
  );
};
