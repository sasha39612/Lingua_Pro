import { ExamSkillCounts, ExamSkillScores } from './types';

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

interface StatusMeta {
  label: string;
  color: string;
  icon: string;
}

function getStatusMeta(value: number): StatusMeta {
  if (value > 75) return { label: 'Ready',            color: 'text-green-600',  icon: '🟢' };
  if (value > 50) return { label: 'Needs improvement', color: 'text-yellow-600', icon: '🟡' };
  return             { label: 'Weak',             color: 'text-red-600',    icon: '🔴' };
}

const SKILL_GROUPS: Array<{ key: keyof ExamSkillScores; label: string; color: string }> = [
  { key: 'reading',   label: 'Reading',   color: 'bg-teal-500'    },
  { key: 'writing',   label: 'Writing',   color: 'bg-emerald-500' },
  { key: 'speaking',  label: 'Speaking',  color: 'bg-violet-500'  },
  { key: 'listening', label: 'Listening', color: 'bg-blue-500'    },
];

interface SkillsCardProps {
  scores: ExamSkillScores;
  counts: ExamSkillCounts;
  isLoading: boolean;
}

export function SkillsCard({ scores, counts, isLoading }: SkillsCardProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-float">
      <h3 className="font-semibold text-slate-800">Exam Sections</h3>
      <div className="mt-4 space-y-5">
        {SKILL_GROUPS.map(({ key, label, color }) => {
          const pct = isLoading ? 0 : scores[key];
          const count = isLoading ? 0 : counts[key];
          const meta = getStatusMeta(pct);
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>{label}</span>
                <span className="flex items-center gap-2">
                  {!isLoading && count > 0 && (
                    <span className="text-xs text-slate-400">{count} {count === 1 ? 'session' : 'sessions'}</span>
                  )}
                  <span>{isLoading ? '…' : `${pct}%`}</span>
                </span>
              </div>
              <ProgressBar value={pct} color={color} />
              {!isLoading && (
                <p className={`mt-1 text-xs font-medium ${count === 0 ? 'text-slate-400' : meta.color}`}>
                  {count === 0 ? 'No sessions yet' : `${meta.icon} ${meta.label}`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
