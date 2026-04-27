import { Suspense } from 'react';
import { SpeakingPage } from '@/components/speaking-page';
import { PageSkeleton } from '@/components/page-skeleton';

export const dynamic = 'force-dynamic';

export default function SpeakingRoute() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SpeakingPage />
    </Suspense>
  );
}
