/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { DescriptionTeiEditor } from './description-tei-editor';

// TipTap mounts a ProseMirror view, which needs Range measurement jsdom does not
// implement. Same polyfill the msDesc leaf-editor tests install.
beforeAll(() => {
  const proto = Range.prototype as unknown as {
    getBoundingClientRect: () => DOMRect;
    getClientRects: () => {
      length: number;
      item: () => null;
      [Symbol.iterator]: () => Iterator<never>;
    };
  };
  proto.getBoundingClientRect = () => ({ top: 0, bottom: 0, left: 0, right: 0 }) as DOMRect;
  proto.getClientRects = () => ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: function* () {},
  });
});

const PROSE =
  '<p>Granted by <ref type="person" key="person_42" target="/scribes/42">William I</ref>.</p>';

describe('DescriptionTeiEditor', () => {
  it('opens in Rich mode so the picker is the default surface', async () => {
    render(<DescriptionTeiEditor label="Description" value={PROSE} onChange={vi.fn()} />);
    await waitFor(() => expect(document.querySelector('.tei-rich')).not.toBeNull());
  });

  it('previews through the PUBLIC pipeline, so a ref renders as a live link', async () => {
    render(<DescriptionTeiEditor label="Description" value={PROSE} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Preview' }));

    // The charter previewer would show this as plain text: it does not know
    // <ref>, and isTei() does not even classify <p>+<ref> as TEI.
    const anchor = await waitFor(() => {
      const found = document.querySelector('a[href="/scribes/42"]');
      expect(found).not.toBeNull();
      return found!;
    });
    expect(anchor.textContent).toBe('William I');
    expect(anchor.getAttribute('data-ref-kind')).toBe('person');
  });

  it('says so rather than showing an empty box when there is nothing to preview', async () => {
    render(<DescriptionTeiEditor label="Description" value="" onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Preview' }));
    expect(await screen.findByText('Nothing to preview yet.')).toBeTruthy();
  });

  it('never shows the storage wrapper — it receives bare prose', async () => {
    render(<DescriptionTeiEditor label="Description" value={PROSE} onChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Preview' }));
    await waitFor(() => expect(document.querySelector('a[href="/scribes/42"]')).not.toBeNull());
    expect(document.body.textContent).not.toContain('tei-c.org');
  });
});
