import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES, type SupportedLanguage } from '../i18n';

/**
 * Language picker for the top bar. Options are listed in their native names —
 * never translated — because someone hunting for their language cannot read
 * the one currently active.
 */
export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const resolved = i18n.resolvedLanguage ?? '';
  const active = (SUPPORTED_LANGUAGES as readonly string[]).includes(resolved)
    ? (resolved as SupportedLanguage)
    : 'en';

  function choose(lng: SupportedLanguage) {
    i18n.changeLanguage(lng);
    setOpen(false);
  }

  return (
    <Box position="relative" data-testid="language-switcher">
      <Button
        onClick={() => setOpen(o => !o)}
        size="sm"
        variant="ghost"
        aria-label={`Language: ${LANGUAGE_NAMES[active]}`}
        aria-expanded={open}
        color="brand.topbarText"
        fontSize="xs"
        fontWeight="600"
        letterSpacing="wide"
        px={2}
        opacity={0.8}
        _hover={{ opacity: 1, bg: 'brand.stoneLight' }}
      >
        {active.toUpperCase()}
      </Button>

      {open && (
        <Flex
          position="absolute"
          top="100%"
          right={0}
          mt={1}
          direction="column"
          minW="130px"
          bg="brand.stoneLight"
          border="1px solid"
          borderColor="brand.inkLight"
          borderRadius="md"
          boxShadow="md"
          zIndex={20}
          overflow="hidden"
        >
          {SUPPORTED_LANGUAGES.map(lng => (
            <Text
              key={lng}
              as="button"
              data-lang={lng}
              onClick={() => choose(lng)}
              textAlign="left"
              px={3}
              py={2}
              fontSize="sm"
              color={lng === active ? 'brand.inkDark' : 'brand.inkMuted'}
              fontWeight={lng === active ? 'bold' : '500'}
              _hover={{ bg: 'brand.statsPanelBg', color: 'brand.inkDark' }}
            >
              {LANGUAGE_NAMES[lng]}
            </Text>
          ))}
        </Flex>
      )}
    </Box>
  );
}
