import { Suspense } from 'react';
import { DashboardHome } from '@/components/dashboard-home';
import { PageSkeleton } from '@/components/page-skeleton';

export const dynamic = 'force-dynamic';

export default function DashboardRoute() {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <DashboardHome />
    </Suspense>
  );
}
