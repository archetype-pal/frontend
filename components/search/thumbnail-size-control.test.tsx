import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ThumbnailSizeControl } from './thumbnail-size-control';

describe('ThumbnailSizeControl', () => {
  it('renders S/M/L options and marks the active one', () => {
    render(<ThumbnailSizeControl size="small" onChange={vi.fn()} />);

    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.textContent)).toEqual(['S', 'M', 'L']);

    const small = screen.getByRole('radio', { name: 'Small thumbnails' });
    expect(small.getAttribute('aria-checked')).toBe('true');
    expect(
      screen.getByRole('radio', { name: 'Medium thumbnails' }).getAttribute('aria-checked')
    ).toBe('false');
  });

  it('reports the chosen size on click', () => {
    const onChange = vi.fn();
    render(<ThumbnailSizeControl size="medium" onChange={onChange} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Large thumbnails' }));
    expect(onChange).toHaveBeenCalledWith('large');
  });
});
