import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AppState } from '@/store/app-store';
import { SettingsPage } from '@/components/settings-page';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/store/app-store', () => ({
  useAppStore: (selector: (s: AppState) => unknown) =>
    selector({
      user: { id: 1, email: 'test@test.com', role: 'student', language: 'English' },
      level: 'A2',
      theme: 'system',
      language: 'English',
      uiLocale: 'en',
      lastTaskTitle: null,
      audioScores: [],
      recentResults: [],
      setUser: vi.fn(),
      setLevel: vi.fn(),
      setTheme: vi.fn(),
      setLanguage: vi.fn(),
      setUiLocale: vi.fn(),
      setLastTaskTitle: vi.fn(),
      addAudioScore: vi.fn(),
      addResult: vi.fn(),
      clearResults: vi.fn(),
      logout: vi.fn(),
    } as AppState),
}));

vi.mock('@/components/lab-frame', () => ({
  LabFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/i18n/locales', () => ({
  VALID_LOCALES: ['en', 'de', 'sq', 'pl', 'uk'],
}));

const createWrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
};

describe('SettingsPage accessibility', () => {
  it('has no violations', async () => {
    const { container } = render(<SettingsPage />, { wrapper: createWrapper() });
    expect(await axe(container)).toHaveNoViolations();
  });
});
