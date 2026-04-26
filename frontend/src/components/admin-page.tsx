'use client';

import { useState } from 'react';
import { LabFrame } from '@/components/lab-frame';
import { SelectDropdown } from '@/components/select-dropdown';
import { useAppStore } from '@/store/app-store';
import { useAdminStats, useAdminUsers } from '@/lib/admin-hooks';
import type { AdminStatsOverview, AdminUser } from '@/lib/types';
import { useTranslations } from 'next-intl';

// ─── Date utilities ───────────────────────────────────────────────────────────

/**
 * Parse a YYYY-MM-DD string as UTC midnight.
 * Never use new Date(dateStr) for time-series dates — it applies the local
 * timezone offset and can shift dates by ±1 day depending on the browser locale.
 */
function parseUtcDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z');
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminTab = 'overview' | 'users' | 'learning' | 'ai-usage';
type Period = 'week' | 'month' | 'all';

// ─── Forbidden panel ──────────────────────────────────────────────────────────

function ForbiddenPanel() {
  const t = useTranslations('admin');
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-500">
      <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <p className="text-lg font-semibold">{t('accessDenied')}</p>
      <p className="text-sm">{t('adminRoleRequired')}</p>
    </div>
  );
}

// ─── Skeleton / error / empty states ─────────────────────────────────────────

function AdminSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
}

function AdminErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTranslations('admin');
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="text-sm text-red-700">{message}</p>
      <button
        onClick={onRetry}
        className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
      >
        {t('retry')}
      </button>
    </div>
  );
}

function AdminEmptyState() {
  const t = useTranslations('admin');
  return (
    <div className="flex h-32 items-center justify-center text-sm text-slate-400">
      {t('noData')}
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <article className="rounded-2xl bg-white p-5 shadow-float">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </article>
  );
}

// ─── Simple bar chart ─────────────────────────────────────────────────────────

function SimpleBarChart({
  data,
  labelKey,
  valueKey,
  color = 'bg-indigo-500',
}: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  color?: string;
}) {
  if (!data.length) return <AdminEmptyState />;
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const val = Number(d[valueKey]) || 0;
        const pct = (val / max) * 100;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-24 truncate text-right text-xs text-slate-500 capitalize">
              {String(d[labelKey])}
            </span>
            <div className="flex-1 rounded-full bg-slate-100 h-2">
              <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-8 text-right text-xs font-medium text-slate-700">{val}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Time-series line chart (SVG) ─────────────────────────────────────────────

function DailyLineChart({ data }: { data: Array<{ date: string; count: number }> }) {
  if (!data.length) return <AdminEmptyState />;
  const W = 460; const H = 120;
  const PAD = { top: 8, right: 12, bottom: 24, left: 32 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const n = data.length;
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const toX = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * cW : cW / 2);
  const toY = (v: number) => PAD.top + cH - (v / maxVal) * cH;
  const pts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.count).toFixed(1)}`).join(' ');

  const labelIdxs = new Set<number>([0, n - 1]);
  const step = Math.max(1, Math.floor(n / 5));
  for (let i = step; i < n - 1; i += step) labelIdxs.add(i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
      {[0, 0.5, 1].map((pct) => {
        const y = toY(pct * maxVal);
        return (
          <g key={pct}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={PAD.left - 4} y={y + 3} fontSize={8} textAnchor="end" fill="#94a3b8">
              {Math.round(pct * maxVal)}
            </text>
          </g>
        );
      })}
      <polyline points={pts} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {[...labelIdxs].map((i) => (
        <text key={i} x={toX(i)} y={H - 4} fontSize={8} textAnchor="middle" fill="#94a3b8">
          {parseUtcDate(data[i].date).toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
        </text>
      ))}
    </svg>
  );
}

// ─── Funnel row ───────────────────────────────────────────────────────────────

function FunnelRow({ registered, activePeriod, completedTask }: {
  registered: number;
  activePeriod: number;
  completedTask: number;
}) {
  const t = useTranslations('admin');
  const activeRate  = registered > 0 ? Math.round((activePeriod / registered) * 100) : 0;
  const taskRate    = activePeriod > 0 ? Math.round((completedTask / activePeriod) * 100) : 0;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {[
        { label: t('registered'), value: registered },
        { label: t('active'), value: activePeriod, rate: activeRate },
        { label: t('completedTask'), value: completedTask, rate: taskRate },
      ].map((step, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="rounded-xl bg-white p-4 text-center shadow-float min-w-[100px]">
            <p className="text-xl font-bold text-slate-900">{step.value.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">{step.label}</p>
            {step.rate !== undefined && (
              <p className="text-xs text-indigo-600 font-medium">{step.rate}%</p>
            )}
          </div>
          {i < 2 && <span className="text-slate-300 text-lg">›</span>}
        </div>
      ))}
    </div>
  );
}

// ─── Tabs (built inside AdminPage to allow translations) ──────────────────────

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ data, onRetry, isLoading, error }: {
  data: AdminStatsOverview | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  const t = useTranslations('admin');
  if (isLoading) return <AdminSkeleton />;
  if (error)     return <AdminErrorBanner message={error.message} onRetry={onRetry} />;
  if (!data)     return <AdminEmptyState />;

  const { platform, funnel, avg_scores, time_series, session_counts_by_feature } = data;

  return (
    <div className="space-y-5">
      {/* Funnel */}
      <div className="rounded-2xl bg-white p-5 shadow-float">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t('conversionFunnel')}
        </h2>
        <FunnelRow
          registered={funnel.registered}
          activePeriod={funnel.active_users_cross_service_estimate}
          completedTask={funnel.completed_task}
        />
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t('totalSessions')} value={platform.total_sessions.toLocaleString()} />
        <KpiCard
          label={t('topLanguage')}
          value={platform.most_popular_language ?? '—'}
        />
        <KpiCard
          label={t('avgReadingScore')}
          value={`${Math.round(avg_scores.reading * 100)}%`}
        />
        <KpiCard
          label={t('avgSpeakingScore')}
          value={`${Math.round(avg_scores.speaking * 100)}%`}
        />
      </div>

      {/* Sessions by feature */}
      <div className="rounded-2xl bg-white p-5 shadow-float">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t('sessionsByFeature')}
        </h2>
        <SimpleBarChart
          data={[
            { label: 'Reading',   count: session_counts_by_feature.reading },
            { label: 'Writing',   count: session_counts_by_feature.writing },
            { label: 'Speaking',  count: session_counts_by_feature.speaking },
            { label: 'Listening', count: session_counts_by_feature.listening },
          ]}
          labelKey="label"
          valueKey="count"
          color="bg-indigo-500"
        />
      </div>

      {/* Daily sessions */}
      <div className="rounded-2xl bg-white p-5 shadow-float">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t('dailyActiveUsers')} <span className="text-slate-400 normal-case font-normal text-xs">{t('dailyActiveUsersSub')}</span>
        </h2>
        <DailyLineChart data={time_series.daily_active_user_estimate} />
      </div>

      <p className="text-right text-xs text-slate-400">
        {t('lastUpdated', { time: new Date(data.last_updated).toLocaleTimeString() })}
      </p>
    </div>
  );
}

// ─── Users tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const t = useTranslations('admin');
  const PAGE_SIZE = 100;
  const [offset, setOffset] = useState(0);
  const { data, isLoading, error, refetch } = useAdminUsers(PAGE_SIZE, offset);

  const users: AdminUser[] = data?.data?.users ?? [];

  if (isLoading) return <AdminSkeleton />;
  if (error)     return <AdminErrorBanner message={(error as Error).message} onRetry={() => refetch()} />;
  if (!users.length && offset === 0) return <AdminEmptyState />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white shadow-float overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">{t('emailHeader')}</th>
                <th className="px-5 py-3">{t('roleHeader')}</th>
                <th className="px-5 py-3">{t('languageHeader')}</th>
                <th className="px-5 py-3">{t('joinedHeader')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-800">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 capitalize text-slate-600">{u.language}</td>
                  <td className="px-5 py-3 text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          {t('showing', { from: offset + 1, to: offset + users.length })}
        </span>
        <div className="flex gap-2">
          <button
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
          >
            {t('previousPage')}
          </button>
          <button
            disabled={users.length < PAGE_SIZE}
            onClick={() => setOffset(offset + PAGE_SIZE)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
          >
            {t('nextPage')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Learning tab ─────────────────────────────────────────────────────────────

function LearningTab({ data, onRetry, isLoading, error }: {
  data: AdminStatsOverview | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  const t = useTranslations('admin');
  if (isLoading) return <AdminSkeleton />;
  if (error)     return <AdminErrorBanner message={error.message} onRetry={onRetry} />;
  if (!data)     return <AdminEmptyState />;

  const { by_language, avg_scores } = data;

  return (
    <div className="space-y-5">
      {/* Avg scores by skill */}
      <div className="rounded-2xl bg-white p-5 shadow-float">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t('averageScoreBySkill')}
        </h2>
        <SimpleBarChart
          data={[
            { skill: 'Reading',   score: Math.round(avg_scores.reading   * 100) },
            { skill: 'Writing',   score: Math.round(avg_scores.writing   * 100) },
            { skill: 'Speaking',  score: Math.round(avg_scores.speaking  * 100) },
            { skill: 'Listening', score: Math.round(avg_scores.listening * 100) },
          ]}
          labelKey="skill"
          valueKey="score"
          color="bg-emerald-500"
        />
      </div>

      {/* Per-language breakdown */}
      <div className="rounded-2xl bg-white p-5 shadow-float">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t('perLanguageBreakdown')}
        </h2>
        {by_language.length === 0 ? (
          <AdminEmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2 pr-4">{t('languageHeader')}</th>
                  <th className="py-2 pr-4 text-right">{t('textSessions')}</th>
                  <th className="py-2 pr-4 text-right">{t('speakingSessions')}</th>
                  <th className="py-2 pr-4 text-right">{t('avgTextScore')}</th>
                  <th className="py-2 text-right">{t('avgSpeakingScoreCol')}</th>
                </tr>
              </thead>
              <tbody>
                {by_language.map((l) => (
                  <tr key={l.language} className="border-t border-slate-100">
                    <td className="py-2 pr-4 font-medium capitalize">{l.language}</td>
                    <td className="py-2 pr-4 text-right text-slate-600">{l.text_count.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right text-slate-600">{l.speaking_count.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right text-slate-600">{Math.round(l.avg_text_score * 100)}%</td>
                    <td className="py-2 text-right text-slate-600">{Math.round(l.avg_speaking_score * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AI Usage tab ─────────────────────────────────────────────────────────────

function AiUsageTab({ data, onRetry, isLoading, error }: {
  data: AdminStatsOverview | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}) {
  const t = useTranslations('admin');
  if (isLoading) return <AdminSkeleton />;
  if (error)     return <AdminErrorBanner message={error.message} onRetry={onRetry} />;
  if (!data)     return <AdminEmptyState />;

  const { feature_usage_proxy, session_counts_by_feature } = data;
  const totalProxy = feature_usage_proxy.text_operations +
    feature_usage_proxy.speech_operations +
    feature_usage_proxy.listening_operations;

  return (
    <div className="space-y-5">
      {/* Session-derived AI load proxies */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t('textOps')} value={feature_usage_proxy.text_operations.toLocaleString()} sub={t('textOpsSub')} />
        <KpiCard label={t('speechOps')} value={feature_usage_proxy.speech_operations.toLocaleString()} sub={t('speechOpsSub')} />
        <KpiCard label={t('listeningOps')} value={feature_usage_proxy.listening_operations.toLocaleString()} sub={t('listeningOpsSub')} />
        <KpiCard label={t('totalOps')} value={totalProxy.toLocaleString()} sub={t('totalOpsSub')} />
      </div>

      {/* Sessions by feature */}
      <div className="rounded-2xl bg-white p-5 shadow-float">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t('sessionsByFeature')}
        </h2>
        <SimpleBarChart
          data={[
            { label: 'Reading',   count: session_counts_by_feature.reading },
            { label: 'Writing',   count: session_counts_by_feature.writing },
            { label: 'Speaking',  count: session_counts_by_feature.speaking },
            { label: 'Listening', count: session_counts_by_feature.listening },
          ]}
          labelKey="label"
          valueKey="count"
          color="bg-violet-500"
        />
      </div>

      {/* Cost & Tokens — populated when AI usage logging is active */}
      <div className="rounded-2xl bg-white p-5 shadow-float">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t('costTokens')}
        </h2>
        {data.ai_cost === null ? (
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            <svg className="h-5 w-5 shrink-0 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('noCostData')}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label={t('totalTokens')}
              value={data.ai_cost.total_tokens.toLocaleString()}
              sub={t('totalTokensSub')}
            />
            <KpiCard
              label={t('estCost')}
              value={`$${data.ai_cost.total_cost_usd.toFixed(4)}`}
              sub={t('estCostSub')}
            />
            <KpiCard
              label={t('failureRate')}
              value={`${(data.ai_cost.failure_rate * 100).toFixed(1)}%`}
              sub={t('failureRateSub')}
            />
            <KpiCard
              label={t('retryRate')}
              value={`${(data.ai_cost.retry_rate * 100).toFixed(1)}%`}
              sub={t('retryRateSub')}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminPage() {
  const ta = useTranslations('admin');
  const user  = useAppStore((s) => s.user);

  const [tab, setTab]         = useState<AdminTab>('overview');
  const [period, setPeriod]   = useState<Period>('week');
  const [language, setLanguage] = useState('');

  const { data, isLoading, error, refetch } = useAdminStats(period, language);

  const PERIOD_OPTIONS = [
    { value: 'week',  label: ta('thisWeek') },
    { value: 'month', label: ta('thisMonth') },
    { value: 'all',   label: ta('allTime') },
  ];

  const LANGUAGE_OPTIONS = [
    { value: '',          label: ta('allLanguages') },
    { value: 'english',   label: 'English' },
    { value: 'german',    label: 'German' },
    { value: 'albanian',  label: 'Albanian' },
    { value: 'polish',    label: 'Polish' },
    { value: 'ukrainian', label: 'Ukrainian' },
  ];

  const TABS: { id: AdminTab; label: string }[] = [
    { id: 'overview',  label: ta('tabOverview') },
    { id: 'users',     label: ta('tabUsers') },
    { id: 'learning',  label: ta('tabLearning') },
    { id: 'ai-usage',  label: ta('tabAiUsage') },
  ];

  // Guard — no API calls for non-admins
  if (!user || user.role !== 'admin') {
    return (
      <LabFrame>
        <ForbiddenPanel />
      </LabFrame>
    );
  }

  return (
    <LabFrame>
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Header + global filters */}
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-float">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{ta('title')}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {ta('subtitle')}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <div className="w-36">
                <SelectDropdown
                  value={language}
                  options={LANGUAGE_OPTIONS}
                  onChange={(v) => setLanguage(v)}
                />
              </div>
              <div className="w-36">
                <SelectDropdown
                  value={period}
                  options={PERIOD_OPTIONS}
                  onChange={(v) => setPeriod(v as Period)}
                />
              </div>
            </div>
            <p className="text-xs text-slate-400">{ta('filtersNote')}</p>
          </div>
        </section>

        {/* Tab bar */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'overview' && (
          <OverviewTab
            data={data}
            isLoading={isLoading}
            error={error as Error | null}
            onRetry={() => refetch()}
          />
        )}
        {tab === 'users' && <UsersTab />}
        {tab === 'learning' && (
          <LearningTab
            data={data}
            isLoading={isLoading}
            error={error as Error | null}
            onRetry={() => refetch()}
          />
        )}
        {tab === 'ai-usage' && (
          <AiUsageTab
            data={data}
            isLoading={isLoading}
            error={error as Error | null}
            onRetry={() => refetch()}
          />
        )}
      </div>
    </LabFrame>
  );
}
