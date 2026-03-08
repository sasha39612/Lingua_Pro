'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAppStore } from '@/store/app-store';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const token = useAppStore((s) => s.token);
  const user = useAppStore((s) => s.user);
  const isPublicRoute =
    pathname === '/dashboard' ||
    pathname === '/login' ||
    pathname === '/' ||
    pathname === '/contact' ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/faq';

  useEffect(() => {
    if (!token && !isPublicRoute) {
      router.replace('/login');
    }
    if (token && pathname === '/admin' && user && user.role !== 'admin') {
      router.replace('/dashboard');
    }
    if (token && pathname === '/login') {
      router.replace('/dashboard');
    }
  }, [token, pathname, router, isPublicRoute, user]);

  if (!token && !isPublicRoute) {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-2xl bg-white p-6 text-center shadow-float">
        <h1 className="text-xl font-semibold">Authentication Required</h1>
        <p className="mt-2 text-sm text-slate-600">Redirecting to login...</p>
      </div>
    );
  }

  if (token && pathname === '/admin' && user && user.role !== 'admin') {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-2xl bg-white p-6 text-center shadow-float">
        <h1 className="text-xl font-semibold">Admin Access Required</h1>
        <p className="mt-2 text-sm text-slate-600">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
