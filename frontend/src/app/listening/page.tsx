import { Suspense } from 'react';
import { ListeningPage } from '@/components/listening-page';
import { PageSkeleton } from '@/components/page-skeleton';

export const dynamic = 'force-dynamic';

export default function ListeningRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ListeningPage />
    </Suspense>
  );
}
