import type { Metadata } from 'next';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/components/providers';
import { AppShell } from '@/components/app-shell';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${mono.variable}`}>
      <body className="font-[var(--font-heading)] antialiased">
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
