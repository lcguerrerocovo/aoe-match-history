import { HStack, Input, NativeSelect, Card, Box, Text, IconButton } from '@chakra-ui/react';
import { cardVariant } from '../types/chakra-overrides';
import { FaSortAmountDown, FaSortAmountUpAlt } from 'react-icons/fa';
import type { Map, MatchType, SortDirection } from '../types/match';
import { useLayoutConfig } from '../theme/breakpoints';
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

export const FilterBar = ({ onMapChange, onMatchTypeChange, onSortChange, onSearchChange, onClearSearch, maps, matchTypes, searchResultsCount, searchValue: externalSearchValue = '', selectedMap: externalSelectedMap = '', selectedMatchType: externalSelectedMatchType = '', sortDirection: externalSortDirection = 'desc' }: FilterBarProps) => {
  const layout = useLayoutConfig();
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
    return 'Search matches...';
  };

  const shouldShowDropdown = searchValue && searchResultsCount !== undefined && isSearchFocused;

  return (
    <Box w={layout?.matchList.width} maxWidth={layout?.matchList.maxWidth}>
      <Card.Root
        variant={cardVariant('filter')}
        w="100%"
        p={layout?.filterBar.padding}
        mb={layout?.filterBar.marginBottom}
      >
        <HStack justify="space-between" align="center">
          {/* Left: Search Box */}
          <Box 
            position="relative" 
            flex="1"
            maxW={{ base: "300px", md: "220px" }}
            mr={4}
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
              bg={searchValue ? 'brand.stone' : 'brand.inputBg'}
              borderWidth="1px"
              borderColor="brand.slateBorder"
              _focus={{
                borderColor: 'brand.gold',
                borderWidth: '1px',
                bg: searchValue ? 'brand.stone' : 'brand.inputBg'
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
                color="brand.steel"
                fontSize="lg"
                _hover={{ color: 'brand.bronze' }}
              >
                ×
              </Box>
            )}
            
            {/* Search Results Dropdown */}
            {shouldShowDropdown && (
              <Box
                position="absolute"
                top="100%"
                left={0}
                right={0}
                mt={1}
                bg="brand.stone"
                borderRadius="md"
                borderWidth="1px"
                borderColor="brand.steel"
                p={2}
                fontSize="sm"
                zIndex={10}
                boxShadow="md"
              >
                <Text color="brand.midnightBlue" textAlign="center">
                  {searchResultsCount} matches found
                </Text>
              </Box>
            )}
          </Box>

          {/* Right: Filter Controls */}
          <HStack gap={layout?.filterBar.gap}>
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
                bg="brand.inputBg"
                borderWidth="1px"
                borderColor="brand.slateBorder"
                _focus={{
                  borderColor: 'brand.gold',
                  borderWidth: '1px',
                  bg: 'brand.inputBg'
                }}
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
                bg="brand.inputBg"
                borderWidth="1px"
                borderColor="brand.slateBorder"
                _focus={{
                  borderColor: 'brand.gold',
                  borderWidth: '1px',
                  bg: 'brand.inputBg'
                }}
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
            <IconButton
              aria-label={`Sort ${sortDirection === 'desc' ? 'oldest first' : 'newest first'}`}
              onClick={() => {
                const newDirection = sortDirection === 'desc' ? 'asc' : 'desc';
                setSortDirection(newDirection);
                onSortChange(newDirection);
              }}
              variant="solid"
              size="md"
              bg="brand.inputBg"
              borderWidth="1px"
              borderColor="brand.slateBorder"
              color="brand.midnightBlue"
              _hover={{ bg: 'brand.stone', borderColor: 'brand.gold' }}
              borderRadius="md"
            >
              {sortDirection === 'desc' ? <FaSortAmountDown /> : <FaSortAmountUpAlt />}
            </IconButton>
          </HStack>
        </HStack>
      </Card.Root>
    </Box>
  );
};
