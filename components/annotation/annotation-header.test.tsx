import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AnnotationHeader } from './annotation-header';

describe('AnnotationHeader allograph gallery control', () => {
  const allograph = {
    id: 1,
    character_name: 'a',
    name: 'Caroline',
  } as never;

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

  it('hides the dropdown and eye button in text view', () => {
    render(
      <AnnotationHeader
        unsavedCount={0}
        viewMode="text"
        allographs={[allograph]}
        onAllographSelect={vi.fn()}
        onOpenAllographModal={vi.fn()}
      />
    );

    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Select an allograph first' })).toBeNull();
  });

  it('shows the dropdown and eye button in both view', () => {
    render(
      <AnnotationHeader
        unsavedCount={0}
        viewMode="both"
        allographs={[allograph]}
        onAllographSelect={vi.fn()}
        onOpenAllographModal={vi.fn()}
      />
    );

    expect(screen.getByRole('combobox')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Select an allograph first' })).toBeTruthy();
  });
});

describe('AnnotationHeader page collection controls', () => {
  it('toggles the page collection button and enables bulk collection creation when annotations exist', () => {
    const onTogglePageCollection = vi.fn();
    const onCreateAnnotationCollection = vi.fn();

    render(
      <AnnotationHeader
        unsavedCount={0}
        onTogglePageCollection={onTogglePageCollection}
        annotationCollectionCount={3}
        onCreateAnnotationCollection={onCreateAnnotationCollection}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add page to collection' }));
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Create a new Collection containing all of the annotations on this page',
      })
    );

    expect(onTogglePageCollection).toHaveBeenCalledTimes(1);
    expect(onCreateAnnotationCollection).toHaveBeenCalledTimes(1);
  });
});
