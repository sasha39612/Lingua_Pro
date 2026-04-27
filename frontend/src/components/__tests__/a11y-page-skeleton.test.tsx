import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { PageSkeleton } from '@/components/page-skeleton';

describe('PageSkeleton accessibility', () => {
  it('has no violations with default rows', async () => {
    const { container } = render(<PageSkeleton />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations with custom row count', async () => {
    const { container } = render(<PageSkeleton rows={6} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
