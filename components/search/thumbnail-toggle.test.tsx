import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThumbnailToggle } from './thumbnail-toggle';

describe('ThumbnailToggle', () => {
  it('renders thumbnail toggle when thumbnails are on', () => {
    const onChange = vi.fn();
    render(<ThumbnailToggle showThumbnails={true} onChange={onChange} />);

    const button = screen.getByRole('button');
    expect(button.textContent).toContain('Thumbnails');

    fireEvent.click(button);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('renders text only label when thumbnails are off', () => {
    const onChange = vi.fn();
    render(<ThumbnailToggle showThumbnails={false} onChange={onChange} />);

    const button = screen.getByRole('button');
    expect(button.textContent).toContain('Text only');

    fireEvent.click(button);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('exposes its state as a pressed toggle, named by its visible text', () => {
    // An aria-label would replace the visible text in the accessible name,
    // leaving "Text only" addressable only as "Show thumbnails" (WCAG 2.5.3).
    const { rerender } = render(<ThumbnailToggle showThumbnails={true} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { pressed: true, name: 'Thumbnails' })).toBeTruthy();

    rerender(<ThumbnailToggle showThumbnails={false} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { pressed: false, name: 'Text only' })).toBeTruthy();
  });
});
