import { act, fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/lightbox-db', () => ({
  saveImage: vi.fn(async () => undefined),
}));

import { LightboxImageLayer } from './lightbox-image-layer';
import { useLightboxStore } from '@/stores/lightbox-store';
import { saveImage, type LightboxImage } from '@/lib/lightbox-db';

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

// Every move or resize (even a click's 1px jitter) is persisted by a
// fire-and-forget write. Wait for each one so it can't outlive the test or race
// the next write: two concurrent dynamic imports of the mocked db module can hand
// one of them the real Dexie module, which rejects without IndexedDB.
const persisted = (times: number) =>
  vi.waitFor(() => expect(saveImage).toHaveBeenCalledTimes(times));

const isSelected = () => useLightboxStore.getState().selectedImageIds.has(image.id);

function press(el: HTMLElement, from: [number, number], to: [number, number]) {
  fireEvent.mouseDown(el, { clientX: from[0], clientY: from[1] });
  if (to[0] !== from[0] || to[1] !== from[1]) {
    fireEvent.mouseMove(document, { clientX: to[0], clientY: to[1] });
  }
  fireEvent.mouseUp(el, { clientX: to[0], clientY: to[1] });
  fireEvent.click(el, { clientX: to[0], clientY: to[1] });
}

describe('LightboxImageLayer selection', () => {
  beforeEach(() => {
    vi.mocked(saveImage).mockClear();
    act(() => {
      useLightboxStore.setState({
        images: new Map([[image.id, image]]),
        selectedImageIds: new Set(),
      });
    });
  });

  it('toggles selection on a plain click', async () => {
    const item = renderLayer();

    act(() => press(item, [150, 150], [150, 150]));
    expect(isSelected()).toBe(true);

    act(() => press(item, [150, 150], [151, 151]));
    expect(isSelected()).toBe(false);
    await persisted(1);
  });

  it('moves the image without toggling selection when it is dragged', async () => {
    const item = renderLayer();

    act(() => press(item, [150, 150], [250, 220]));
    expect(isSelected()).toBe(false);
    expect(useLightboxStore.getState().images.get(image.id)?.position).not.toEqual(image.position);
    await persisted(1);

    act(() => useLightboxStore.getState().selectImage(image.id));
    act(() => press(item, [150, 150], [250, 220]));
    expect(isSelected()).toBe(true);
    await persisted(2);
  });

  it('keeps the image selected when it is resized', async () => {
    act(() => useLightboxStore.getState().selectImage(image.id));
    const item = renderLayer();
    const handle = item.querySelector('.cursor-se-resize') as HTMLElement;

    act(() => press(handle, [300, 300], [360, 360]));
    expect(isSelected()).toBe(true);
    await persisted(1);

    // A mostly sideways drag: the aspect-ratio lock grows the height too, so the
    // handle ends up below the pointer and the mouseup lands on the image body.
    const body = item.firstElementChild as HTMLElement;
    act(() => {
      fireEvent.mouseDown(handle, { clientX: 360, clientY: 360 });
      fireEvent.mouseMove(document, { clientX: 460, clientY: 370 });
      fireEvent.mouseUp(body, { clientX: 460, clientY: 370 });
      fireEvent.click(item, { clientX: 460, clientY: 370 });
    });
    expect(isSelected()).toBe(true);
    await persisted(2);
  });

  it('still toggles on the next click after a touch drag that produced no click', async () => {
    const item = renderLayer();

    act(() => {
      fireEvent.touchStart(item, { touches: [{ clientX: 150, clientY: 150 }] });
      fireEvent.touchMove(document, { touches: [{ clientX: 250, clientY: 220 }] });
      fireEvent.touchEnd(document);
    });
    expect(isSelected()).toBe(false);
    await persisted(1);

    act(() => press(item, [150, 150], [150, 150]));
    expect(isSelected()).toBe(true);
  });
});
