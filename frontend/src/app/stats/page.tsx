import { Suspense } from 'react';
import { StatsPage } from '@/components/stats-page';
import { PageSkeleton } from '@/components/page-skeleton';

export const dynamic = 'force-dynamic';

export default function StatsRoute() {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <StatsPage />
    </Suspense>
  );
}
