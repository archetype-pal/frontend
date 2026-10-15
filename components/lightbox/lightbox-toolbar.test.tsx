import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LightboxToolbar } from './lightbox-toolbar';
import { useLightboxStore } from '@/stores/lightbox-store';
import type { LightboxImage } from '@/lib/lightbox-db';

const isDisabled = (name: string) =>
  (screen.getByRole('button', { name }) as HTMLButtonElement).disabled;

function makeImage(id: string): LightboxImage {
  return {
    id,
    originalId: 1,
    type: 'image',
    imageUrl: 'http://x/full/max/0/default.jpg',
    metadata: {},
    workspaceId: 'ws-1',
    position: { x: 0, y: 0, zIndex: 1 },
    size: { width: 100, height: 100 },
    transform: {
      opacity: 1,
      brightness: 100,
      contrast: 100,
      rotation: 0,
      flipX: false,
      flipY: false,
      grayscale: false,
    },
    createdAt: 1,
    updatedAt: 1,
  };
}

// Controls that act on whatever is selected.
const selectionControls = [
  'Adjust',
  'Rotate 90°',
  'Flip Horizontal',
  'Flip Vertical',
  'Bring to Front',
  'Move Up',
  'Move Down',
  'Send to Back',
  'Crop Image',
];

describe('LightboxToolbar selection-only controls', () => {
  beforeEach(() => {
    act(() => {
      useLightboxStore.setState({
        images: new Map(['a', 'b'].map((id) => [id, makeImage(id)])),
        selectedImageIds: new Set(),
      });
    });
  });

  it('are present but disabled when nothing is selected, so the toolbar does not reflow', () => {
    render(<LightboxToolbar onCrop={vi.fn()} onToggleComparison={vi.fn()} />);

    for (const name of selectionControls) {
      expect(isDisabled(name)).toBe(true);
    }
    expect(isDisabled('Toggle annotations overlay')).toBe(true);
    expect(isDisabled('Compare Images')).toBe(true);
  });

  it('still name themselves on hover while disabled', () => {
    render(<LightboxToolbar onCrop={vi.fn()} onToggleComparison={vi.fn()} />);

    // jsdom applies no Tailwind CSS, so check the two halves of a hover tooltip:
    // the `title` text, and the class that keeps a disabled button hoverable.
    const iconControls = selectionControls.filter((name) => name !== 'Adjust');
    for (const name of [...iconControls, 'Compare Images', 'Undo', 'Redo']) {
      const button = screen.getByRole('button', { name }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.title).toBe(name);
      expect(button.className).toContain('disabled:pointer-events-auto');
    }
    const annotations = screen.getByRole('button', { name: 'Toggle annotations overlay' });
    expect(annotations.title).toBe('Toggle Annotations');
    expect(annotations.className).toContain('disabled:pointer-events-auto');
  });

  it('become enabled once images are selected', () => {
    render(<LightboxToolbar onCrop={vi.fn()} onToggleComparison={vi.fn()} />);

    act(() => useLightboxStore.getState().selectImage('a'));
    for (const name of selectionControls) {
      expect(isDisabled(name)).toBe(false);
    }
    expect(isDisabled('Toggle annotations overlay')).toBe(false);
    expect(isDisabled('Compare Images')).toBe(true);

    act(() => useLightboxStore.getState().selectImage('b'));
    expect(isDisabled('Compare Images')).toBe(false);
    expect(isDisabled('Toggle annotations overlay')).toBe(true);
  });
});
