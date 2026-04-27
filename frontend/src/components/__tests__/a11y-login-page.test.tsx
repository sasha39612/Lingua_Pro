import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { vi } from 'vitest';
import type { AppState } from '@/store/app-store';
import { LoginPage } from '@/components/login-page';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/store/app-store', () => ({
  useAppStore: (selector: (s: AppState) => unknown) =>
    selector({ setUser: vi.fn() } as unknown as AppState),
}));

vi.mock('@/components/lab-frame', () => ({
  LabFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('LoginPage accessibility', () => {
  it('has no violations', async () => {
    const { container } = render(<LoginPage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
