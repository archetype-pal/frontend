/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { docToTei, teiToDoc } from '@/lib/tei-prosemirror';
import { MsDescLeafEditor, leafIsRichRepresentable, normalizeLeafEmit } from './msdesc-leaf-editor';

// TipTap/ProseMirror touch layout APIs jsdom omits (the shared vitest.setup
// already polyfills ResizeObserver/elementFromPoint/etc.); Range measurement is
// the remaining gap needed for the editor to mount.
beforeAll(() => {
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = () =>
      ({ x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 }) as DOMRect;
  }
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = () =>
      ({
        length: 0,
        item: () => null,
        [Symbol.iterator]: function* () {},
      }) as unknown as DOMRectList;
  }
});

// Representable `<p>`-rooted prose leaves (byte-exact through the shared model).
const PLAIN = '<p>Granted by the king.</p>';
const PERSNAME = '<p>Granted by <persName type="name">John</persName>.</p>';
const REF = '<p>See <ref target="/scribes/1">John</ref> for details.</p>';
const MULTI_P = '<p>First clause.</p><p>Second clause.</p>';

// Inner XML the shared model canNOT round-trip: an XML comment is re-emitted as
// escaped text, so docToTei(teiToDoc(x)) !== x — must fall back to the textarea.
const NON_REPRESENTABLE = '<p>note<!-- draft --></p>';
// A stray container element is silently dropped by teiToDoc (a `<p>` resets the
// ancestor stack) — also non-representable, and must be preserved verbatim.
const CONTAINER_WRAPPED = '<provenance><p>x</p></provenance>';

describe('leafIsRichRepresentable — byte-exact gate (data-safety contract)', () => {
  it('treats the empty leaf as representable (rich path)', () => {
    expect(leafIsRichRepresentable('')).toBe(true);
  });

  it.each([PLAIN, PERSNAME, REF, MULTI_P])('accepts round-tripping prose: %s', (value) => {
    // Sanity: the fixture really is byte-exact through the model.
    expect(docToTei(teiToDoc(value))).toBe(value);
    expect(leafIsRichRepresentable(value)).toBe(true);
  });

  it.each([NON_REPRESENTABLE, CONTAINER_WRAPPED])(
    'rejects non-round-tripping markup: %s',
    (value) => {
      expect(docToTei(teiToDoc(value))).not.toBe(value);
      expect(leafIsRichRepresentable(value)).toBe(false);
    }
  );
});

describe('normalizeLeafEmit — empty-leaf edge', () => {
  it('collapses a bare empty paragraph to the empty string', () => {
    // TipTap keeps at least one paragraph, so an emptied editor emits <p></p>;
    // the leaf must return to '' rather than dirtying with <p></p>.
    expect(normalizeLeafEmit('<p></p>')).toBe('');
  });

  it('emits real content verbatim', () => {
    expect(normalizeLeafEmit(PLAIN)).toBe(PLAIN);
    expect(normalizeLeafEmit(PERSNAME)).toBe(PERSNAME);
  });

  it('does not collapse an empty paragraph that carries attributes', () => {
    expect(normalizeLeafEmit('<p rend="x"></p>')).toBe('<p rend="x"></p>');
  });

  it('the mount no-op guard swallows a stored <p></p> but not a genuine clear', () => {
    // The onUpdate guard skips when `emitted === normalizeLeafEmit(currentValue)`.
    // A stored '<p></p>' has canonical emit '' (== the mount emit) → swallowed, so
    // the empty paragraph is not dropped on mere open. Clearing '<p>text</p>' also
    // emits '', but its canonical form is '<p>text</p>' !== '' → the edit still
    // propagates. This is the pure predicate behind the mount-time regression.
    expect(normalizeLeafEmit('<p></p>')).toBe('');
    expect(normalizeLeafEmit('<p>Granted by the king.</p>')).not.toBe('');
  });
});

describe('emit round-trip — the editor loses nothing on a representable leaf', () => {
  // The editor emits `normalizeLeafEmit(docToTei(getJSON()))`; getJSON() is
  // teiToDoc(value) for the loaded content, so this is exactly what an
  // unedited-then-serialised leaf emits. (Driving contenteditable keystrokes is
  // unreliable headlessly, so the no-loss guarantee is asserted at the exact
  // serialisation layer the editor emits through.)
  it.each([PLAIN, PERSNAME, REF, MULTI_P])('round-trips %s byte-exact', (value) => {
    expect(normalizeLeafEmit(docToTei(teiToDoc(value)))).toBe(value);
  });

  it('an empty leaf serialises back to the empty string', () => {
    expect(normalizeLeafEmit(docToTei(teiToDoc('')))).toBe('');
  });
});

describe('MsDescLeafEditor — gate decides rich vs textarea fallback', () => {
  it('routes non-representable markup to the textarea, preserved verbatim', () => {
    render(<MsDescLeafEditor label="Note" value={NON_REPRESENTABLE} onChange={() => {}} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    // The raw string is editable byte-for-byte (no data loss).
    expect(textarea.value).toBe(NON_REPRESENTABLE);
    // The fallback carries the "not representable as rich" hint.
    expect(
      screen.getByText('Markup not representable as rich text — editing as TEI source')
    ).toBeTruthy();
  });

  it('renders inline TEI as a styled entity, not raw angle brackets', async () => {
    const { container } = render(
      <MsDescLeafEditor label="Provenance" value={PERSNAME} onChange={() => {}} />
    );
    const span = await waitFor(() => {
      const el = container.querySelector('.tei-el-persName');
      expect(el).not.toBeNull();
      return el as HTMLElement;
    });
    expect(span.textContent).toContain('John');
    // The markup is rendered, never surfaced as literal source text.
    expect(container.textContent).not.toContain('<persName');
    // Not the fallback path: no "not representable" hint.
    expect(
      screen.queryByText('Markup not representable as rich text — editing as TEI source')
    ).toBeNull();
  });

  it('keeps an empty leaf empty on mount — never spuriously emits <p></p>', async () => {
    const onChange = vi.fn();
    const { container } = render(<MsDescLeafEditor label="Note" value="" onChange={onChange} />);
    // Wait for the rich editor to actually mount (immediatelyRender: false).
    await waitFor(() => expect(container.querySelector('.tei-rich')).not.toBeNull());
    // Mounting/focusing an untouched empty leaf must not dirty it.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps a stored <p></p> leaf unchanged on mount — never emits onChange("")', async () => {
    // '<p></p>' (reachable byte-exact from e.g. <provenance><p></p></provenance>)
    // is representable, so it mounts on the rich path — the sole representable
    // value whose canonical emit ('') differs from its raw bytes. The mount-time
    // onUpdate emits '' and MUST be swallowed: firing onChange('') here would drop
    // the empty <p> and dirty the area with zero user interaction.
    expect(leafIsRichRepresentable('<p></p>')).toBe(true);
    const onChange = vi.fn();
    const { container } = render(
      <MsDescLeafEditor label="Note" value="<p></p>" onChange={onChange} />
    );
    await waitFor(() => expect(container.querySelector('.tei-rich')).not.toBeNull());
    expect(onChange).not.toHaveBeenCalled();
  });
});
