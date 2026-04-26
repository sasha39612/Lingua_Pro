import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { VALID_LOCALES, type Locale } from './locales';

export { VALID_LOCALES, type Locale };

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
