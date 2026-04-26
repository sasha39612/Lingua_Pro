'use client';

import { useTranslations } from 'next-intl';

interface Achievement {
  label: string;
  icon: string;
  earned: boolean;
}

interface AchievementsProps {
  streak: number;
  accuracy: number;
  activeDays: number;
}

export function Achievements({ streak, accuracy, activeDays }: AchievementsProps) {
  const t = useTranslations('stats');
  const achievements: Achievement[] = [
    { label: t('streak7'),    icon: '🔥', earned: streak >= 7 },
    { label: t('streak30'),   icon: '🏆', earned: streak >= 30 },
    { label: t('accuracy70'), icon: '🎯', earned: accuracy >= 70 },
    { label: t('accuracy90'), icon: '💎', earned: accuracy >= 90 },
    { label: t('sessions10'), icon: '📚', earned: activeDays >= 10 },
    { label: t('sessions30'), icon: '🚀', earned: activeDays >= 30 },
  ];
  const earned = achievements.filter((a) => a.earned);
  const locked = achievements.filter((a) => !a.earned);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-float">
      <h3 className="mb-4 font-semibold text-slate-800">
        {t('achievements')}
        {earned.length > 0 && (
          <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
            {earned.length}/{achievements.length}
          </span>
        )}
      </h3>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {earned.map((a) => (
          <div
            key={a.label}
            className="flex min-w-[110px] flex-col items-center gap-2 rounded-xl bg-gradient-to-b from-teal-50 to-white p-4 text-center shadow-sm ring-1 ring-teal-200"
          >
            <span className="text-2xl">{a.icon}</span>
            <p className="text-xs font-medium text-slate-700">{a.label}</p>
          </div>
        ))}

        {locked.map((a) => (
          <div
            key={a.label}
            className="flex min-w-[110px] flex-col items-center gap-2 rounded-xl bg-slate-50 p-4 text-center opacity-40"
          >
            <span className="text-2xl grayscale">{a.icon}</span>
            <p className="text-xs text-slate-500">{a.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
