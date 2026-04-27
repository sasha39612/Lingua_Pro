import { Suspense } from 'react';
import { ReadingPage } from '@/components/reading-page';
import { PageSkeleton } from '@/components/page-skeleton';

export const dynamic = 'force-dynamic';

export default function ReadingRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReadingPage />
    </Suspense>
  );
}
