import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AnnotationHeader } from './annotation-header';

describe('AnnotationHeader allograph gallery control', () => {
  it('disables the eye button until an allograph is selected', () => {
    render(<AnnotationHeader unsavedCount={0} onOpenAllographModal={vi.fn()} />);

    const eyeButton = screen.getByRole('button', { name: 'Select an allograph first' });
    expect(eyeButton.hasAttribute('disabled')).toBe(true);
    expect(eyeButton.textContent).toContain('0');
  });

  it('shows the selected allograph count and opens its thumbnail gallery', () => {
    const onOpenAllographModal = vi.fn();

    render(
      <AnnotationHeader
        unsavedCount={0}
        activeAllographLabel="a, Caroline"
        activeAllographCount={3}
        onOpenAllographModal={onOpenAllographModal}
      />
    );

    const eyeButton = screen.getByRole('button', {
      name: 'View a, Caroline annotation thumbnails',
    });
    expect(eyeButton.hasAttribute('disabled')).toBe(false);
    expect(eyeButton.textContent).toContain('3');

    fireEvent.click(eyeButton);
    expect(onOpenAllographModal).toHaveBeenCalledTimes(1);
  });
});
