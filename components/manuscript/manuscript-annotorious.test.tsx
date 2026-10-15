/** @vitest-environment jsdom */
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ManuscriptAnnotorious, { type Annotation, type ViewerApi } from './manuscript-annotorious';

// Runs the real OpenSeadragon + Annotorious; only the IIIF info.json fetch is
// stubbed (jsdom can't draw tiles, which these tests don't need).
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const iiifInfo = {
  '@context': 'http://iiif.io/api/image/3/context.json',
  id: 'http://iiif.test/img',
  type: 'ImageService3',
  protocol: 'http://iiif.io/api/image',
  profile: 'level1',
  width: 1000,
  height: 800,
};

const savedGlyph: Annotation = {
  id: '#glyph-1',
  type: 'Annotation',
  body: [],
  target: {
    selector: {
      type: 'FragmentSelector',
      conformsTo: 'http://www.w3.org/TR/media-frags/',
      value: 'xywh=pixel:10,10,50,50',
    },
  },
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

async function renderViewer(props: Partial<Parameters<typeof ManuscriptAnnotorious>[0]> = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(iiifInfo)))
  );
  let api: ViewerApi | null = null;
  render(
    <ManuscriptAnnotorious
      iiifImageUrl="http://iiif.test/img/info.json"
      initialAnnotations={[savedGlyph]}
      exposeApi={(exposed) => (api = exposed)}
      {...props}
    />
  );
  await waitFor(() => expect(api?.getAnnotations()).toHaveLength(1));
  return api as unknown as ViewerApi;
}

describe('ManuscriptAnnotorious', () => {
  it('keeps a selected annotation when the Delete key is pressed', async () => {
    const onDelete = vi.fn();
    const api = await renderViewer({ onDelete });

    await act(async () => {
      api.selectAnnotationById?.(savedGlyph.id);
      await settle();
    });
    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent('keyup', { key: 'Delete', keyCode: 46, which: 46 } as KeyboardEventInit)
      );
      await settle();
    });

    // Delete only arms the delete tool (the viewer shortcut); it must not drop
    // the shape from the image behind the confirm + unsaved-change flow.
    expect(api.getAnnotations().map((a) => a.id)).toEqual([savedGlyph.id]);
    expect(onDelete).not.toHaveBeenCalled();
  });
});
