import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { vi } from 'vitest';
import { SelectDropdown } from '@/components/select-dropdown';

const OPTIONS = [
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
];

describe('SelectDropdown accessibility', () => {
  it('has no violations when closed', async () => {
    const { container } = render(
      <SelectDropdown label="Level" value="A2" options={OPTIONS} onChange={() => {}} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations without a label prop', async () => {
    const { container } = render(
      <SelectDropdown value="A1" options={OPTIONS} onChange={() => {}} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no violations when open', async () => {
    const { container } = render(
      <SelectDropdown label="Level" value="A2" options={OPTIONS} onChange={() => {}} />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(await axe(container)).toHaveNoViolations();
  });

  it('selects option with keyboard Enter', () => {
    const onChange = vi.fn();
    render(<SelectDropdown label="Level" value="A1" options={OPTIONS} onChange={onChange} />);
    const trigger = screen.getByRole('button');
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    // list is now open with A1 focused (index 0); press ArrowDown to move to A2
    const list = screen.getByRole('listbox');
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('A2');
  });

  it('closes list on Escape and preserves original value', () => {
    const onChange = vi.fn();
    render(<SelectDropdown label="Level" value="A1" options={OPTIONS} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
