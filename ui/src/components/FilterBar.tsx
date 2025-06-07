import { HStack, Input, Select } from '@chakra-ui/react';
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
      <Select defaultValue="" onChange={(e) => onMapChange(e.target.value)}>
        <option key="all-maps" value="">All maps</option>
        {maps.map(({ name, count }) => (
          <option key={name} value={name}>
            {name} ({count})
          </option>
        ))}
      </Select>
      <Select defaultValue="desc" onChange={(e) => onSortChange(e.target.value as SortDirection)}>
        <option key="sort-desc" value="desc">Recent</option>
        <option key="sort-asc" value="asc">Oldest</option>
      </Select>
    </HStack>
  );
};
