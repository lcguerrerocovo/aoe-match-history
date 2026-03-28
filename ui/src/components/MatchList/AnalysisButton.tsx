import { APMGenerator } from '../APMGenerator';

export function AnalysisButton({ matchId, profileId, groupOpen }: { matchId: string; profileId: string; groupOpen: boolean }) {
  if (!groupOpen) return null;

  return (
    <APMGenerator
      matchId={matchId}
      profileId={profileId}
    />
  );
}
