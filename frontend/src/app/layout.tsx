import type { Metadata } from 'next';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/components/providers';
import { AppShell } from '@/components/app-shell';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getLocale } from 'next-intl/server';
import '@/i18n/types';

const heading = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: 'Lingua Pro Frontend',
  description: 'Student and admin interface for Lingua Pro',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={`${heading.variable} ${mono.variable}`}>
      <body className="font-[var(--font-heading)] antialiased">
        <NextIntlClientProvider messages={messages}>
          <AppProviders>
            <AppShell>{children}</AppShell>
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
