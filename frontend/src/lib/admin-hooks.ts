'use client';

import { useQuery } from '@tanstack/react-query';
import type { AdminStatsOverview, AdminUser } from '@/lib/types';

type Period = 'week' | 'month' | 'all';

export function useAdminStats(period: Period, language: string, token: string | null) {
  return useQuery<AdminStatsOverview>({
    queryKey: ['admin-stats', period, language],
    enabled: !!token,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (language) params.set('language', language);
      const res = await fetch(`/api/admin/stats?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}

export function useAdminUsers(limit = 100, offset = 0, token: string | null) {
  return useQuery<{ data?: { users?: AdminUser[] } }>({
    queryKey: ['admin-users', limit, offset],
    enabled: !!token,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      const res = await fetch(`/api/admin/users?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}
