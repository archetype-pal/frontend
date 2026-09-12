/** @vitest-environment jsdom */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ViewerTextPanel } from './viewer-text-panel';
import type { ImageTextDetail } from '@/services/image-texts';

// Unmount between tests so the component's injected hover <style> (removed on
// unmount) doesn't leak into the next test's document.head query.
afterEach(() => cleanup());

// A transcription whose "William" clause is linked to region graph 5 (TEI
// `corresp="#gid-5"` → data-graph-id="5" after toDptHtml).
function makeText(overrides: Partial<ImageTextDetail> = {}): ImageTextDetail {
  return {
    id: 1,
    item_image: 42,
    type: 'transcription',
    content: '<p>Charter of <seg corresp="#gid-5">William</seg> of Scotland</p>',
    status: 'Live',
    language: 'la',
    created: '',
    modified: '',
    ...overrides,
  };
}

const baseProps = {
  displayMode: 'transcription' as const,
  linkedGraphId: null,
  onSpanHover: vi.fn(),
  onSpanActivate: vi.fn(),
  onClose: vi.fn(),
  // reader (view) mode so the panel renders ImageTextViewer, not the TEI editor.
  canEdit: false,
};

// The hover highlight is a runtime <style> keyed on the hovered graph id (a
// data attribute would be reverted by the ProseMirror editor). Assert the
// injected stylesheet targets the linked span, since jsdom can't resolve the
// computed background from the CSS itself.
const hoverStyle = () =>
  document.head.querySelector<HTMLStyleElement>('style[data-viewer-hover-highlight]')
    ?.textContent ?? '';

describe('ViewerTextPanel — region hover → text highlight', () => {
  it('injects a stylesheet targeting the linked phrase while its region is hovered', () => {
    const { container, rerender } = render(
      <ViewerTextPanel texts={[makeText()]} hoveredGraphId={null} {...baseProps} />
    );

    // The linked span exists, and nothing is highlighted before hovering.
    expect(container.querySelector('[data-graph-id="5"]')).not.toBeNull();
    expect(hoverStyle()).toBe('');

    // Hover region graph 5 on the image → a rule targeting that span is injected.
    rerender(<ViewerTextPanel texts={[makeText()]} hoveredGraphId={5} {...baseProps} />);
    expect(hoverStyle()).toContain('[data-graph-id="5"]');
    expect(hoverStyle()).toContain('.viewer-text-panel');

    // Pointer leaves the region → the rule clears.
    rerender(<ViewerTextPanel texts={[makeText()]} hoveredGraphId={null} {...baseProps} />);
    expect(hoverStyle()).toBe('');
  });

  it('does not target a phrase that is not linked to the hovered region', () => {
    render(<ViewerTextPanel texts={[makeText()]} hoveredGraphId={999} {...baseProps} />);
    // A rule is written for the hovered id, but it does not match the id-5 span.
    expect(hoverStyle()).toContain('[data-graph-id="999"]');
    expect(hoverStyle()).not.toContain('[data-graph-id="5"]');
  });
});

// Dangling spans are neutralised by a second injected stylesheet, for the same
// reason as the hover one: the ProseMirror editor reverts attribute mutations.
const danglingStyle = () =>
  document.head.querySelector<HTMLStyleElement>('style[data-viewer-dangling-links]')?.textContent ??
  '';

describe('ViewerTextPanel — dangling links (trashed regions)', () => {
  // A trashed region keeps its corresp in the TEI so a restore is lossless, so a
  // span can point at a region that is no longer on the image. Those must read
  // as plain prose: not interactive, and not styled as a link.
  const twoSpans = () =>
    makeText({
      content:
        '<p>Charter of <seg corresp="#gid-5">William</seg> and <seg corresp="#gid-9">Malcolm</seg></p>',
    });

  it('leaves a span alone while its region is still on the image', () => {
    const onSpanActivate = vi.fn();
    const { container } = render(
      <ViewerTextPanel
        texts={[makeText()]}
        liveGraphIds={new Set([5])}
        {...baseProps}
        onSpanActivate={onSpanActivate}
      />
    );
    expect(danglingStyle()).toBe('');

    fireEvent.click(container.querySelector('[data-graph-id="5"]')!);
    expect(onSpanActivate).toHaveBeenCalledWith(5);
  });

  it('neutralises a span once its region is gone, and stops it activating', () => {
    const onSpanActivate = vi.fn();
    const onSpanHover = vi.fn();
    const { container } = render(
      <ViewerTextPanel
        texts={[makeText()]}
        liveGraphIds={new Set([99])}
        {...baseProps}
        onSpanActivate={onSpanActivate}
        onSpanHover={onSpanHover}
      />
    );
    expect(danglingStyle()).toContain('[data-graph-id="5"]');
    expect(danglingStyle()).toContain('cursor:auto');
    // Must also cancel the :hover rule. globals.css hovers `[data-graph-id]:hover`
    // at (0,3,0); a bare attribute selector is (0,2,0) and loses the cascade, so
    // the phrase would keep highlighting on hover even though it links nowhere.
    expect(danglingStyle()).toContain('[data-graph-id="5"]:hover');

    const span = container.querySelector('[data-graph-id="5"]')!;
    fireEvent.click(span);
    expect(onSpanActivate).not.toHaveBeenCalled();

    fireEvent.mouseOver(span);
    expect(onSpanHover).toHaveBeenCalledWith(null);
  });

  it('does not gate anything while liveGraphIds is null (loading, or load failed)', () => {
    // The regression guard: an empty Set claims "nothing is live" and would strip
    // every link. Before the fetch resolves we do not know, so we must not claim.
    const onSpanActivate = vi.fn();
    const { container } = render(
      <ViewerTextPanel
        texts={[makeText()]}
        liveGraphIds={null}
        {...baseProps}
        onSpanActivate={onSpanActivate}
      />
    );
    expect(danglingStyle()).toBe('');

    fireEvent.click(container.querySelector('[data-graph-id="5"]')!);
    expect(onSpanActivate).toHaveBeenCalledWith(5);
  });

  it('neutralises only the span whose region is gone', () => {
    const onSpanActivate = vi.fn();
    const { container } = render(
      <ViewerTextPanel
        texts={[twoSpans()]}
        liveGraphIds={new Set([9])}
        {...baseProps}
        onSpanActivate={onSpanActivate}
      />
    );
    expect(danglingStyle()).toContain('[data-graph-id="5"]');
    expect(danglingStyle()).not.toContain('[data-graph-id="9"]');

    fireEvent.click(container.querySelector('[data-graph-id="9"]')!);
    expect(onSpanActivate).toHaveBeenCalledWith(9);
  });
});
