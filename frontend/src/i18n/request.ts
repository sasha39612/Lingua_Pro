import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export const VALID_LOCALES = ['en', 'de', 'sq', 'pl', 'uk'] as const;
export type Locale = (typeof VALID_LOCALES)[number];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale: Locale = VALID_LOCALES.includes(cookieLocale as Locale)
    ? (cookieLocale as Locale)
    : 'en';
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
