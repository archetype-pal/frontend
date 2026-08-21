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
});
