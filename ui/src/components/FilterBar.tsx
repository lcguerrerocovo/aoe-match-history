import { HStack, Input } from '@chakra-ui/react';
import { Select } from '@chakra-ui/select';
import type { Map } from '../types/match';

interface FilterBarProps {
  onMapChange: (map: string) => void;
  maps: Map[];
}

export const FilterBar = ({ onMapChange, maps }: FilterBarProps) => {
  return (
    <HStack gap={4}>
      <Input placeholder="Search matches..." />
      <Select placeholder="Filter by map" onChange={(e) => onMapChange(e.target.value)}>
        <option value="">All Maps</option>
        {maps.map(({ name, count }) => (
          <option key={name} value={name}>
            {name} ({count})
          </option>
        ))}
      </Select>
      <Select placeholder="Sort by">
        <option value="date-desc">Date (Newest)</option>
        <option value="date-asc">Date (Oldest)</option>
        <option value="duration">Duration</option>
      </Select>
    </HStack>
  );
};
