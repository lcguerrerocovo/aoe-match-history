import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Box, Card, Input, Spinner, HStack, Text, Portal } from '@chakra-ui/react';
import ReactCountryFlag from 'react-country-flag';

const MOCK_RESULTS = [
  { id: '4764337', name: '<NT>.tornasol', country: 'SE', matches: 2826 },
  { id: '742535', name: 'tornasol', country: 'SE', matches: 1000 },
  { id: '2066416', name: 'xtornasol', country: 'SE', matches: 3000 },
  { id: '4764337', name: '<NT>.tornasolero', country: 'SE', matches: 1 },
  { id: '4764335', name: 'tornasoloco', country: 'SE', matches: 2 },
  { id: '4764336', name: 'xtornasoly', country: 'SE', matches: 3 },
];

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

export type PlayerSearchResult = {
  id: string;
  name: string;
  country: string;
  matches: number;
};

interface PlayerSearchProps {
  onSelect: (player: PlayerSearchResult) => void;
  placeholder?: string;
  searchFn?: (query: string) => Promise<PlayerSearchResult[]>;
  size?: 'sm' | 'md';
  context?: 'topbar' | 'landing';
}

interface PlayerSearchDropdownProps {
  anchorRef: React.RefObject<HTMLElement>;
  show: boolean;
  children: React.ReactNode;
}

// Simple dropdown positioning hook
const useDropdownPosition = (
  anchorRef: React.RefObject<HTMLElement>,
  isOpen: boolean
) => {
  const [style, setStyle] = useState<React.CSSProperties>();

  const updatePosition = () => {
    if (!anchorRef.current || !isOpen) return;

    const anchor = anchorRef.current.getBoundingClientRect();
    
    setStyle({ 
      position: 'fixed', 
      left: `${anchor.left}px`, 
      top: `${anchor.bottom + 4}px`, 
      width: `${anchor.width}px`, 
      zIndex: 1000 
    });
  };

  useLayoutEffect(() => {
    updatePosition();
    if (!isOpen) return;

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  return style;
};

const PlayerSearchDropdown: React.FC<PlayerSearchDropdownProps> = ({ anchorRef, show, children }) => {
  const dropdownStyle = useDropdownPosition(anchorRef, show);

  if (!show || !dropdownStyle) return null;
  
  return (
    <Portal>
      <Box
        position="fixed"
        left={dropdownStyle.left}
        top={dropdownStyle.top}
        width={dropdownStyle.width}
        zIndex={dropdownStyle.zIndex}
        bg="white"
        borderRadius="lg"
        boxShadow="xl"
        border="1.5px solid"
        borderColor="brand.gold"
        maxH="270px"
        overflowY="auto"
        p={0}
      >
        {children}
      </Box>
    </Portal>
  );
};

export const PlayerSearch: React.FC<PlayerSearchProps> = ({ onSelect, placeholder = 'Search players...', searchFn, size = 'md', context }) => {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputBoxRef = useRef<HTMLDivElement>(null);
  const lastSearched = useRef('');

  const debouncedValue = useDebouncedValue(value, 500);
  useEffect(() => {
    if (debouncedValue.trim() !== '' && debouncedValue !== lastSearched.current) {
      lastSearched.current = debouncedValue;
      doSearch(debouncedValue.trim());
    }
    if (debouncedValue.trim() === '') {
      setResults([]);
      setHasSearched(false);
      setLoading(false);
    }
    // eslint-disable-next-line
  }, [debouncedValue]);

  // Enter/Go key triggers search immediately
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && value.trim() !== '' && value !== lastSearched.current) {
      lastSearched.current = value;
      doSearch(value.trim());
    }
  };

  // Dropdown open if focused, value is not empty, and hasSearched
  const shouldShowDropdown = focused && value.trim() !== '' && hasSearched;

  function doSearch(query: string) {
    setLoading(true);
    setHasSearched(true);
    if (searchFn) {
      searchFn(query).then((res) => {
        setResults(res);
        setLoading(false);
      });
    } else {
      setTimeout(() => {
        const filtered = MOCK_RESULTS.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
        setResults(filtered);
        setLoading(false);
      }, 700);
    }
  }

  function handleSelect(player: PlayerSearchResult) {
    setValue('');
    setResults([]);
    setHasSearched(false);
    setLoading(false);
    onSelect(player);
  }

  return (
    <Box position="relative" w="100%" ref={inputBoxRef}>
      <Card variant="filter" p={0} w="100%">
        <Box position="relative">
          <Input
            ref={inputRef}
            placeholder={placeholder}
            width="100%"
            variant="filled"
            fontSize={size === 'sm' ? 'sm' : { base: 'md', md: 'lg' }}
            borderRadius="lg"
            borderWidth={0}
            _placeholder={{ color: 'brand.steel' }}
            bg="white"
            color="brand.midnightBlue"
            boxShadow="none"
            h={size === 'sm' ? '38px' : '50px'}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            pr={loading ? '2.5rem' : undefined}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 120)}
          />
          {value && !loading && (
            <Box
              position="absolute"
              right={3}
              top="50%"
              transform="translateY(-50%)"
              cursor="pointer"
              onClick={() => setValue('')}
              color="brand.steel"
              fontSize="lg"
            >
              ×
            </Box>
          )}
        </Box>
      </Card>
      <PlayerSearchDropdown
        anchorRef={inputRef}
        show={shouldShowDropdown}
      >
        {loading ? (
          <Box display="flex" alignItems="center" justifyContent="center" py={4}>
            <Spinner size="sm" color="brand.gold" thickness="3px" />
          </Box>
        ) : results.length > 0 ? (
          results
            .slice()
            .sort((a, b) => b.matches - a.matches)
            .slice(0, 5)
            .map((player) => (
              <Card
                key={player.id + player.name}
                variant="filter"
                py={context === 'topbar' ? { base: 2.5, md: 2 } : { base: 3, md: 3 }}
                px={size === 'sm' ? 1.5 : 2}
                display="flex"
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                _hover={{ bg: 'brand.parchment', cursor: 'pointer' }}
                borderRadius="md"
                boxShadow="none"
                borderWidth={0}
                border="none"
                mb={1}
                onMouseDown={() => handleSelect(player)}
              >
                <HStack spacing={size === 'sm' ? 1 : 2} align="center">
                  <Box
                    as={ReactCountryFlag}
                    countryCode={player.country}
                    svg
                    style={{
                      width: size === 'sm' ? '1em' : '1.3em',
                      height: size === 'sm' ? '1em' : '1.3em',
                      borderRadius: '6px',
                      border: '1.5px solid #eee',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.07)'
                    }}
                  />
                  <Text fontWeight="bold" color="brand.midnightBlue" fontSize={size === 'sm' ? 'xs' : 'sm'}>{player.name}</Text>
                </HStack>
                <Text color="brand.steel" fontSize={size === 'sm' ? '2xs' : 'xs'}>{player.matches} Games</Text>
              </Card>
            ))
        ) : (
          <Text color="brand.steel" fontSize="sm" textAlign="center" py={2}>No players found</Text>
        )}
      </PlayerSearchDropdown>
    </Box>
  );
}; 