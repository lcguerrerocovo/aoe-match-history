/**
 * Type helper for custom Card variants defined in theme.ts cardSlotRecipe.
 * Usage: variant={cardVariant('match')} instead of variant={"match" as any}
 */

export type CustomCardVariant = 'elevated' | 'outline' | 'subtle' | 'match' | 'summary' | 'winner' | 'loser' | 'filter';

// Type-safe cast for custom card variants — avoids `as any` while being explicit about valid values
export const cardVariant = (v: CustomCardVariant) => v as 'outline';
