import { HStack, Input, Select, Card } from '@chakra-ui/react';
import type { Map, SortDirection } from '../types/match';
import { useLayoutConfig } from '../theme/breakpoints';

interface FilterBarProps {
  onMapChange: (map: string) => void;
  onSortChange: (direction: SortDirection) => void;
  maps: Map[];
}

export const FilterBar = ({ onMapChange, onSortChange, maps }: FilterBarProps) => {
  const layout = useLayoutConfig();

  return (
    <Card
      variant="filter"
      w={layout?.filterBar.width}
      p={layout?.filterBar.padding}
      mb={layout?.filterBar.marginBottom}
    >
      <HStack gap={layout?.filterBar.gap}>
        <Input
          placeholder="Search matches..."
          w={layout?.filterBar.inputWidth}
          variant="filled"
        />
        <Select
          defaultValue=""
          onChange={(e) => onMapChange(e.target.value)}
          w={layout?.filterBar.selectWidth}
          variant="filled"
        >
          <option key="all-maps" value="">All maps</option>
          {maps.map(({ name, count }) => (
            <option key={name} value={name}>
              {name} ({count})
            </option>
          ))}
        </Select>
        <Select
          defaultValue="desc"
          onChange={(e) => onSortChange(e.target.value as SortDirection)}
          w={layout?.filterBar.selectWidth}
          variant="filled"
        >
          <option key="sort-desc" value="desc">Recent</option>
          <option key="sort-asc" value="asc">Oldest</option>
        </Select>
      </HStack>
    </Card>
  );
};
