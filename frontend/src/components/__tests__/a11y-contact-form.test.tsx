import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { vi } from 'vitest';
import { ContactForm } from '@/components/contact-form';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}(${JSON.stringify(params)})` : key,
}));

describe('ContactForm accessibility', () => {
  it('has no violations in idle state', async () => {
    const { container } = render(<ContactForm />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
