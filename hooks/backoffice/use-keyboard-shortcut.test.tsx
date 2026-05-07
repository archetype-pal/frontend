import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useKeyboardShortcut } from './use-keyboard-shortcut';

function Mount({
  combo,
  handler,
  enabled = true,
}: {
  combo: string;
  handler: (e: KeyboardEvent) => void;
  enabled?: boolean;
}) {
  useKeyboardShortcut(combo, handler, enabled);
  return null;
}

function fireKeyDown(init: KeyboardEventInit & { key: string }) {
  const event = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true });
  document.dispatchEvent(event);
}

describe('useKeyboardShortcut', () => {
  it('fires on the matching key combo', () => {
    const handler = vi.fn();
    render(<Mount combo="mod+s" handler={handler} />);
    fireKeyDown({ key: 's', metaKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('fires for both Cmd (metaKey) and Ctrl (ctrlKey) under "mod"', () => {
    const handler = vi.fn();
    render(<Mount combo="mod+s" handler={handler} />);
    fireKeyDown({ key: 's', ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire when Shift is also held but combo only specifies mod+s', () => {
    // Regression net: native macOS "Save As" is Cmd+Shift+S. Without exact
    // modifier matching, the app's mod+s shortcut would steal that combo.
    const handler = vi.fn();
    render(<Mount combo="mod+s" handler={handler} />);
    fireKeyDown({ key: 's', metaKey: true, shiftKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('does NOT fire when Alt is also held but combo only specifies mod+s', () => {
    const handler = vi.fn();
    render(<Mount combo="mod+s" handler={handler} />);
    fireKeyDown({ key: 's', metaKey: true, altKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('fires on `mod+shift+s` when Cmd+Shift+S is pressed (combo explicitly includes shift)', () => {
    const handler = vi.fn();
    render(<Mount combo="mod+shift+s" handler={handler} />);
    fireKeyDown({ key: 's', metaKey: true, shiftKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire on the bare key when the combo requires a modifier', () => {
    const handler = vi.fn();
    render(<Mount combo="mod+s" handler={handler} />);
    fireKeyDown({ key: 's' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('does NOT fire on a modifier+key when the combo expects no modifier', () => {
    const handler = vi.fn();
    render(<Mount combo="escape" handler={handler} />);
    fireKeyDown({ key: 'Escape', metaKey: true });
    expect(handler).not.toHaveBeenCalled();
    fireKeyDown({ key: 'Escape' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('respects the enabled flag', () => {
    const handler = vi.fn();
    render(<Mount combo="mod+s" handler={handler} enabled={false} />);
    fireKeyDown({ key: 's', metaKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('uses the latest handler reference (refresh-on-render via ref)', () => {
    const old = vi.fn();
    const next = vi.fn();
    const { rerender } = render(<Mount combo="mod+s" handler={old} />);
    rerender(<Mount combo="mod+s" handler={next} />);
    fireKeyDown({ key: 's', metaKey: true });
    expect(old).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
