import Link from 'next/link';
import { WeakPoint } from './types';

interface WeakPointsCardProps {
  items: WeakPoint[];
  isLoading: boolean;
}

export function WeakPointsCard({ items, isLoading }: WeakPointsCardProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-float">
      <h3 className="mb-3 font-semibold text-slate-800">Weak Points</h3>

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">
          Complete a few exercises to see your exam readiness
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between py-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                  {item.count}×
                </span>
                <span className="text-sm text-slate-700">{item.label}</span>
              </div>
              <Link
                href={item.href}
                className="text-xs font-medium text-[#0a54c2] hover:underline"
              >
                Practice
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
