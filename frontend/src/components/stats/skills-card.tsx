import { SkillScores } from './types';

interface ProgressBarProps {
  value: number;
  color: string;
}

function ProgressBar({ value, color }: ProgressBarProps) {
  return (
    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

const SKILL_CONFIG: Array<{ key: keyof SkillScores; label: string; color: string }> = [
  { key: 'reading',  label: 'Reading',  color: 'bg-sky-500' },
  { key: 'writing',  label: 'Writing',  color: 'bg-teal-500' },
  { key: 'speaking', label: 'Speaking', color: 'bg-violet-500' },
  { key: 'listening',label: 'Listening',color: 'bg-amber-500' },
];

interface SkillsCardProps {
  scores: SkillScores;
  isLoading: boolean;
}

export function SkillsCard({ scores, isLoading }: SkillsCardProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-float">
      <h3 className="font-semibold text-slate-800">Skills</h3>
      <div className="mt-4 space-y-4">
        {SKILL_CONFIG.map(({ key, label, color }) => (
          <div key={key}>
            <div className="flex justify-between text-sm text-slate-600">
              <span>{label}</span>
              <span>{isLoading ? '…' : `${scores[key]}%`}</span>
            </div>
            <ProgressBar value={isLoading ? 0 : scores[key]} color={color} />
          </div>
        ))}
        <p className="text-xs text-slate-400">
          Listening shares the Speaking pronunciation score until tracked separately
        </p>
      </div>
    </div>
  );
}
