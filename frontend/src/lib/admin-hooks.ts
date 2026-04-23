'use client';

import { useQuery } from '@tanstack/react-query';
import type { AdminStatsOverview, AdminUser } from '@/lib/types';

type Period = 'week' | 'month' | 'all';

export function useAdminStats(period: Period, language: string) {
  return useQuery<AdminStatsOverview>({
    queryKey: ['admin-stats', period, language],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const params = new URLSearchParams({ period });
      if (language) params.set('language', language);
      // Cookie is sent automatically (same-origin); server route reads it via getAuthToken.
      const res = await fetch(`/api/admin/stats?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}

export function useAdminUsers(limit = 100, offset = 0) {
  return useQuery<{ data?: { users?: AdminUser[] } }>({
    queryKey: ['admin-users', limit, offset],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}
