import { HStack, Input } from '@chakra-ui/react'
import { Select } from '@chakra-ui/select'

export const FilterBar = () => {
  return (
    <HStack gap={4}>
      <Input placeholder="Search matches..." />
      <Select placeholder="Filter by map">
        <option value="arabia">Arabia</option>
        <option value="black-forest">Black Forest</option>
        <option value="arena">Arena</option>
      </Select>
      <Select placeholder="Sort by">
        <option value="date-desc">Date (Newest)</option>
        <option value="date-asc">Date (Oldest)</option>
        <option value="duration">Duration</option>
      </Select>
    </HStack>
  )
}
