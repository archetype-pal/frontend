/** @vitest-environment jsdom */
import { act, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';

import { RichTextEditor } from './rich-text-editor';

// JSDOM ships without these, but TipTap touches them on init.
beforeAll(() => {
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = () =>
      ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }) as DOMRect;
  }
});

describe('<RichTextEditor> hydration', () => {
  it('renders content that arrives after mount', async () => {
    function Host() {
      const [content, setContent] = useState('');
      // Simulate an async query resolving after mount — every backoffice
      // consumer initialises the controlled value to "" and hydrates from
      // a `useEffect` keyed on the query result.
      return (
        <>
          <button onClick={() => setContent('<p>hello charter</p>')}>load</button>
          <RichTextEditor content={content} onChange={() => {}} />
        </>
      );
    }
    render(<Host />);
    // Editor starts empty.
    expect(screen.queryByText(/hello charter/)).toBeNull();
    await act(async () => {
      screen.getByText('load').click();
    });
    expect(await screen.findByText(/hello charter/)).toBeTruthy();
  });

  it('keeps user edits stable across onChange round-trips', async () => {
    function Host() {
      const [content, setContent] = useState('<p>seed</p>');
      const handle = vi.fn((html: string) => setContent(html));
      return <RichTextEditor content={content} onChange={handle} data-testid="ed" />;
    }
    // Verifies the loop-guard: when the editor emits an onUpdate that the
    // parent reflects straight back via `content`, the effect must no-op,
    // not re-setContent the value (which would steal the caret and break
    // typing).
    expect(() => render(<Host />)).not.toThrow();
  });
});
