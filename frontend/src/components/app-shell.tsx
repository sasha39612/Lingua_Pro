'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { useTranslations } from 'next-intl';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const t = useTranslations('errors');
  // Zustand persist reads from localStorage only on the client. Delay auth
  // enforcement until after first mount so we don't redirect before the
  // persisted user has been loaded.
  const [hydrated, setHydrated] = useState(false);
  const isPublicRoute =
    pathname === '/dashboard' ||
    pathname === '/login' ||
    pathname === '/' ||
    pathname === '/contact' ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/faq';

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!user && !isPublicRoute) {
      router.replace('/login');
    }
    if (user && pathname === '/admin' && user.role !== 'admin') {
      router.replace('/dashboard');
    }
    if (user && pathname === '/login') {
      router.replace('/dashboard');
    }
  }, [hydrated, user, pathname, router, isPublicRoute]);

  if (!hydrated) {
    return <div className="min-h-screen">{children}</div>;
  }

  if (!user && !isPublicRoute) {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-2xl bg-white p-6 text-center shadow-float">
        <h1 className="text-xl font-semibold">{t('authRequired')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('authRequiredSub')}</p>
      </div>
    );
  }

  if (user && pathname === '/admin' && user.role !== 'admin') {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-2xl bg-white p-6 text-center shadow-float">
        <h1 className="text-xl font-semibold">{t('adminRequired')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('adminRequiredSub')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
