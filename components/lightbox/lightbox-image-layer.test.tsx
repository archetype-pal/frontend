import { act, fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/lightbox-db', () => ({
  saveImage: vi.fn(async () => undefined),
}));

import { LightboxImageLayer } from './lightbox-image-layer';
import { useLightboxStore } from '@/stores/lightbox-store';
import type { LightboxImage } from '@/lib/lightbox-db';

const image: LightboxImage = {
  id: 'img-1',
  originalId: 1,
  type: 'image',
  imageUrl: 'http://x/full/max/0/default.jpg',
  metadata: { shelfmark: 'MS 1' },
  workspaceId: 'ws-1',
  position: { x: 100, y: 100, zIndex: 1 },
  size: { width: 200, height: 200 },
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

function renderLayer() {
  const { container } = render(<LightboxImageLayer images={[image]} />);
  return container.querySelector('.lightbox-container > div') as HTMLElement;
}

const isSelected = () => useLightboxStore.getState().selectedImageIds.has(image.id);

function press(el: HTMLElement, from: [number, number], to: [number, number]) {
  fireEvent.mouseDown(el, { clientX: from[0], clientY: from[1] });
  fireEvent.mouseMove(document, { clientX: to[0], clientY: to[1] });
  fireEvent.mouseUp(el, { clientX: to[0], clientY: to[1] });
  fireEvent.click(el, { clientX: to[0], clientY: to[1] });
}

describe('LightboxImageLayer selection', () => {
  beforeEach(() => {
    act(() => {
      useLightboxStore.setState({
        images: new Map([[image.id, image]]),
        selectedImageIds: new Set(),
      });
    });
  });

  it('toggles selection on a plain click', async () => {
    const item = renderLayer();

    await act(async () => press(item, [150, 150], [150, 150]));
    expect(isSelected()).toBe(true);

    await act(async () => press(item, [150, 150], [151, 151]));
    expect(isSelected()).toBe(false);
  });

  it('moves the image without toggling selection when it is dragged', async () => {
    const item = renderLayer();

    await act(async () => press(item, [150, 150], [250, 220]));
    expect(isSelected()).toBe(false);
    expect(useLightboxStore.getState().images.get(image.id)?.position).not.toEqual(image.position);

    act(() => useLightboxStore.getState().selectImage(image.id));
    await act(async () => press(item, [150, 150], [250, 220]));
    expect(isSelected()).toBe(true);
  });

  it('keeps the image selected when it is resized', async () => {
    act(() => useLightboxStore.getState().selectImage(image.id));
    const item = renderLayer();
    const handle = item.querySelector('.cursor-se-resize') as HTMLElement;

    await act(async () => press(handle, [300, 300], [360, 360]));
    expect(isSelected()).toBe(true);

    // A mostly sideways drag: the aspect-ratio lock grows the height too, so the
    // handle ends up below the pointer and the mouseup lands on the image body.
    const body = item.firstElementChild as HTMLElement;
    await act(async () => {
      fireEvent.mouseDown(handle, { clientX: 360, clientY: 360 });
      fireEvent.mouseMove(document, { clientX: 460, clientY: 370 });
      fireEvent.mouseUp(body, { clientX: 460, clientY: 370 });
      fireEvent.click(item, { clientX: 460, clientY: 370 });
    });
    expect(isSelected()).toBe(true);
  });

  it('still toggles on the next click after a touch drag that produced no click', async () => {
    const item = renderLayer();

    await act(async () => {
      fireEvent.touchStart(item, { touches: [{ clientX: 150, clientY: 150 }] });
      fireEvent.touchMove(document, { touches: [{ clientX: 250, clientY: 220 }] });
      fireEvent.touchEnd(document);
    });
    expect(isSelected()).toBe(false);

    await act(async () => press(item, [150, 150], [150, 150]));
    expect(isSelected()).toBe(true);
  });
});
