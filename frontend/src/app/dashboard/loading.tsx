'use client';
import { useTranslations } from 'next-intl';
import { PageSkeleton } from '@/components/page-skeleton';
export default function Loading() {
  const t = useTranslations('common');
  return <PageSkeleton rows={6} label={t('loading')} />;
}
