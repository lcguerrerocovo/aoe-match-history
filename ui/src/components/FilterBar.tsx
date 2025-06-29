import { HStack, Input, Select, Card, Box, Text } from '@chakra-ui/react';
import type { Map, SortDirection } from '../types/match';
import { useLayoutConfig } from '../theme/breakpoints';
import { useState, useEffect, useRef } from 'react';

interface FilterBarProps {
  onMapChange: (map: string) => void;
  onSortChange: (direction: SortDirection) => void;
  onSearchChange: (search: string) => void;
  onClearSearch?: () => void;
  maps: Map[];
  searchResultsCount?: number;
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

export const FilterBar = ({ onMapChange, onSortChange, onSearchChange, onClearSearch, maps, searchResultsCount }: FilterBarProps) => {
  const layout = useLayoutConfig();
  const [searchValue, setSearchValue] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const debouncedSearch = useDebouncedValue(searchValue, 300);

  useEffect(() => {
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

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
      <Card
        variant="filter"
        w="100%"
        p={layout?.filterBar.padding}
        mb={layout?.filterBar.marginBottom}
      >
        <HStack gap={layout?.filterBar.gap}>
          <Box 
            position="relative" 
            w={layout?.filterBar.inputWidth}
            onMouseEnter={() => setIsSearchFocused(true)}
            onMouseLeave={() => setIsSearchFocused(false)}
          >
            <Input
              placeholder={getSearchPlaceholder()}
              w="100%"
              variant="filled"
              fontSize={{ base: 'sm', md: 'sm' }}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
              bg={searchValue ? 'brand.stone' : undefined}
              borderColor={searchValue ? 'brand.steel' : undefined}
              _focus={{
                borderColor: 'brand.slateBlue',
                bg: searchValue ? 'brand.stone' : undefined
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
                color="gray.500"
                fontSize="lg"
                _hover={{ color: 'gray.700' }}
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
          <Select
            defaultValue=""
            onChange={(e) => onMapChange(e.target.value)}
            w={layout?.filterBar.selectWidth}
            variant="filled"
            fontSize={{ base: 'sm', md: 'sm' }}
          >
            <option key="all-maps" value="">All maps</option>
            {maps
              .filter(({ name }) => name && name.trim().length > 0)
              .map(({ name, count }, index) => (
                <option key={`${name}-${index}`} value={name}>
                  {name} ({count || 0})
                </option>
              ))}
          </Select>
          <Select
            defaultValue="desc"
            onChange={(e) => onSortChange(e.target.value as SortDirection)}
            w={layout?.filterBar.selectWidth}
            variant="filled"
            fontSize={{ base: 'sm', md: 'sm' }}
          >
            <option key="sort-desc" value="desc">Recent</option>
            <option key="sort-asc" value="asc">Oldest</option>
          </Select>
        </HStack>
      </Card>
    </Box>
  );
};
