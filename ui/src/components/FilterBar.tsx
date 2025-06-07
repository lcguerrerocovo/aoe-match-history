import { HStack, Input } from '@chakra-ui/react';
import { Select } from '@chakra-ui/select';
import type { Map, SortDirection } from '../types/match';

interface FilterBarProps {
  onMapChange: (map: string) => void;
  onSortChange: (direction: SortDirection) => void;
  maps: Map[];
}

export const FilterBar = ({ onMapChange, onSortChange, maps }: FilterBarProps) => {
  return (
    <HStack gap={4}>
      <Input placeholder="Search matches..." />
      <Select placeholder="All maps" onChange={(e) => onMapChange(e.target.value)}>
        {maps.map(({ name, count }) => (
          <option key={name} value={name}>
            {name} ({count})
          </option>
        ))}
      </Select>
      <Select onChange={(e) => onSortChange(e.target.value as SortDirection)} defaultValue="desc">
        <option value="desc">Recent</option>
        <option value="asc">Oldest</option>
      </Select>
    </HStack>
  );
};
