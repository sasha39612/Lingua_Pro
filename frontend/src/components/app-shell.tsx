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
  const [isNavigating, setIsNavigating] = useState(false);

  // Every route is dynamically rendered (root layout reads the locale cookie),
  // so a Link click always waits on a server round-trip before the new page
  // paints. Without this, clicking a nav link looks like nothing happened
  // until the new page arrives. Give instant feedback on click, and clear it
  // once the pathname actually changes (a timeout guards against it getting
  // stuck if navigation is cancelled).
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement)?.closest?.('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('/')) return;
      if (anchor.target === '_blank') return;
      if (href === pathname) return;
      setIsNavigating(true);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname]);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  useEffect(() => {
    if (!isNavigating) return;
    const timeout = setTimeout(() => setIsNavigating(false), 8000);
    return () => clearTimeout(timeout);
  }, [isNavigating]);

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
      <>
        <NavigationProgressBar active={isNavigating} />
        <div className="mx-auto mt-10 max-w-xl rounded-2xl bg-white p-6 text-center shadow-float">
          <h1 className="text-xl font-semibold">{t('authRequired')}</h1>
          <p className="mt-2 text-sm text-slate-600">{t('authRequiredSub')}</p>
        </div>
      </>
    );
  }

  if (user && pathname === '/admin' && user.role !== 'admin') {
    return (
      <>
        <NavigationProgressBar active={isNavigating} />
        <div className="mx-auto mt-10 max-w-xl rounded-2xl bg-white p-6 text-center shadow-float">
          <h1 className="text-xl font-semibold">{t('adminRequired')}</h1>
          <p className="mt-2 text-sm text-slate-600">{t('adminRequiredSub')}</p>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen">
      <NavigationProgressBar active={isNavigating} />
      {children}
    </div>
  );
}

function NavigationProgressBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className="fixed left-0 top-0 z-50 h-1 w-full overflow-hidden bg-transparent"
    >
      <div className="h-full w-1/3 animate-[nav-progress_1s_ease-in-out_infinite] bg-teal-600" />
    </div>
  );
}
