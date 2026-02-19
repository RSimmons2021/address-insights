'use client';

import ScoreOrb from './ScoreOrb';
import { ScoreBreakdown } from '@/types';

interface ScoreGridProps {
  walkScore: ScoreBreakdown;
  driveScore: ScoreBreakdown;
  urbanIndex: ScoreBreakdown;
}

export default function ScoreGrid({ walkScore, driveScore, urbanIndex }: ScoreGridProps) {
  return (
    <div>
      <span
        className="text-xs uppercase tracking-wide font-semibold mb-4 block"
        style={{ color: 'var(--text-secondary)' }}
      >
        Scores
      </span>
      <div className="grid grid-cols-3 gap-4">
        <ScoreOrb
          score={walkScore.score}
          label="Walking Score"
          description={`${walkScore.label} • ${walkScore.description}`}
          icon="🚶"
          color="var(--clay-green)"
          ingredients={walkScore.ingredients}
          delay={0.2}
        />
        <ScoreOrb
          score={driveScore.score}
          label="Driving Score"
          description={`${driveScore.label} • ${driveScore.description}`}
          icon="🚗"
          color="var(--clay-blue)"
          ingredients={driveScore.ingredients}
          delay={0.4}
        />
        <ScoreOrb
          score={urbanIndex.score}
          label="Urban/Suburban Index"
          description={`${urbanIndex.label} • ${urbanIndex.description}`}
          icon="🏙️"
          color="var(--clay-orange)"
          ingredients={urbanIndex.ingredients}
          delay={0.6}
        />
      </div>
    </div>
  );
}
