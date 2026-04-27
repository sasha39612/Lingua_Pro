import { Suspense } from 'react';
import { WritingPage } from '@/components/writing-page';
import { PageSkeleton } from '@/components/page-skeleton';

export const dynamic = 'force-dynamic';

export default function WritingRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WritingPage />
    </Suspense>
  );
}
