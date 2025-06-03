import { Box, VStack, Text, Link } from '@chakra-ui/react';
import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/accordion';
import type { MatchGroup } from '../types/match';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { useEffect, useState } from 'react';
import { getCivMap } from '../services/matchService';

const BASE_URL = import.meta.env.PROD
  ? 'https://aoe2-match-history-site.storage.googleapis.com'
  : window.location.origin;

interface MatchListProps {
  matchGroups: MatchGroup[];
}

function renderTeams(match: any, civMap: Record<string, string>) {
  if (Array.isArray(match.teams)) {
    console.log('Match:', match.match_id, 'Winning team:', match.winning_team);
    return (
      <Box>
        {match.teams.map((team: any[], idx: number) => {
          console.log(
            'Team index:',
            idx,
            'Team number:',
            idx + 1,
            'Is winner:',
            match.winning_team === idx + 1
          );
          return (
            <Box key={idx} mb={1} display="flex" alignItems="center">
              <Text as="span" fontWeight="bold" mr={2}>
                Team {idx + 1}:
              </Text>
              <Text as="span">
                {team.map((p, i) => (
                  <span key={p.name}>
                    {p.name} ({civMap[String(p.civ)] || p.civ}){i < team.length - 1 ? ', ' : ''}
                  </span>
                ))}
                {match.winning_team === idx + 1 && ' 🏆'}
              </Text>
            </Box>
          );
        })}
      </Box>
    );
  }
  return null;
}

export function MatchList({ matchGroups }: MatchListProps) {
  const [civMap, setCivMap] = useState<Record<string, string>>({});

  useEffect(() => {
    getCivMap().then(setCivMap);
  }, []);

  return (
    <Accordion allowMultiple>
      {matchGroups.map((group) => (
        <AccordionItem key={group.date}>
          <h2>
            <AccordionButton>
              <Box flex="1" textAlign="left">
                {group.date} ({group.matches.length} matches)
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <VStack spacing={4} align="stretch">
              {group.matches.map((match) => {
                const matchId = match.match_id;
                return (
                  <Box key={matchId} p={4} borderWidth="1px" borderRadius="lg">
                    <Box mb={2}>
                      <Text as="span" fontWeight="bold">
                        Match {matchId}
                      </Text>
                      {' | '}
                      <Link
                        href={`${BASE_URL}/site/matches/${matchId}/match.html`}
                        color="blue.500"
                      >
                        View Match Charts <ExternalLinkIcon mx="2px" />
                      </Link>
                    </Box>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 'bold', width: 120 }}>Start Time</td>
                          <td>{match.start_time}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold' }}>Type</td>
                          <td>
                            {match.diplomacy?.type}
                            {match.teams?.reduce((total, team) => total + team.length, 0) > 2 &&
                            match.diplomacy?.team_size
                              ? ` ${match.diplomacy.team_size}`
                              : ''}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold' }}>Map</td>
                          <td>{match.map || ''}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold' }}>Duration</td>
                          <td>{match.duration}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold' }}>Teams</td>
                          <td>{renderTeams(match, civMap)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </Box>
                );
              })}
            </VStack>
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
