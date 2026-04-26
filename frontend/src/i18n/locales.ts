export const VALID_LOCALES = ['en', 'de', 'sq', 'pl', 'uk'] as const;
export type Locale = (typeof VALID_LOCALES)[number];
