/** @vitest-environment jsdom */
import { beforeAll, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { docToTei, teiToDoc, type PMDoc } from '@/lib/tei-prosemirror';
import { teiEditorExtensions, wrapTei } from '@/lib/tei-tiptap';
import { externalRef, personRefFromScribe, refAttrs } from '@/lib/tei-ref-picker';
import type { ResourceRef } from '@/lib/tei-ref';
import { insertRefIntoLeaf, leafIsRichRepresentable, refIsInnermost } from './msdesc-leaf-editor';

/**
 * The Rich-mode `<ref>` insertion contract (roadmap 4.3): `insertRefIntoLeaf` —
 * the exact function `MsDescLeafEditor.handlePick` calls — plus the `wrapTei` +
 * `refAttrs` pairing it is built on. Driven against a real TipTap editor whose
 * schema mirrors the leaf editor's.
 */

// TipTap/ProseMirror touch layout APIs jsdom omits (mirrors the shared
// vitest.setup + the leaf-editor test's Range polyfills).
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

function makeEditor(tei: string): Editor {
  return new Editor({
    element: document.createElement('div'),
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
        strike: false,
        code: false,
        codeBlock: false,
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        horizontalRule: false,
        hardBreak: false,
        link: false,
        underline: false,
      }),
      ...teiEditorExtensions,
    ],
    content: teiToDoc(tei) as unknown as Record<string, unknown>,
  });
}

const tei = (editor: Editor): string => docToTei(editor.getJSON() as unknown as PMDoc);
const JOHN = personRefFromScribe({ id: 1, name: 'John' });
const JOHN_OPEN = '<ref type="person" key="person_1" target="/scribes/1">';

describe('Rich-mode <ref> insertion via wrapTei', () => {
  it('wraps the selection in a <ref> that round-trips through the leaf gate', () => {
    const editor = makeEditor('<p>Granted by John.</p>');
    // "John" sits at PM positions 12..16 (paragraph text starts at 1).
    const from = 12;
    const to = 16;
    expect(editor.state.doc.textBetween(from, to)).toBe('John');

    editor.commands.setTextSelection({ from, to });
    wrapTei(editor, 'ref', refAttrs(JOHN));

    const out = tei(editor);
    expect(out).toBe(`<p>Granted by ${JOHN_OPEN}John</ref>.</p>`);
    // The emitted leaf still passes the byte-exact rich-representability gate.
    expect(leafIsRichRepresentable(out)).toBe(true);
    editor.destroy();
  });

  it('reports a straddling selection instead of silently doing nothing', () => {
    // [3,7] over `<p>a<seg type="x">bcd</seg>e</p>` only partially covers <seg>.
    const editor = makeEditor('<p>a<seg type="x">bcd</seg>e</p>');
    const before = tei(editor);
    editor.commands.setTextSelection({ from: 3, to: 7 });
    expect(wrapTei(editor, 'ref', refAttrs(JOHN))).toBe(false);
    expect(tei(editor)).toBe(before);
    editor.destroy();
  });
});

describe('insertRefIntoLeaf — the leaf editor handlePick contract', () => {
  it('wraps a non-empty selection', () => {
    const editor = makeEditor('<p>Granted by John.</p>');
    editor.commands.setTextSelection({ from: 12, to: 16 });
    expect(insertRefIntoLeaf(editor, JOHN)).toBe('ok');
    expect(tei(editor)).toBe(`<p>Granted by ${JOHN_OPEN}John</ref>.</p>`);
    editor.destroy();
  });

  it('inserts the label at an empty selection and wraps exactly that text', () => {
    const editor = makeEditor('<p>Granted by KING.</p>');
    editor.commands.setTextSelection({ from: 12, to: 12 });
    expect(insertRefIntoLeaf(editor, JOHN)).toBe('ok');
    expect(tei(editor)).toBe(`<p>Granted by ${JOHN_OPEN}John</ref>KING.</p>`);
    editor.destroy();
  });

  it('inserts into an empty leaf', () => {
    const editor = makeEditor('<p></p>');
    editor.commands.setTextSelection({ from: 1, to: 1 });
    expect(insertRefIntoLeaf(editor, JOHN)).toBe('ok');
    expect(tei(editor)).toBe(`<p>${JOHN_OPEN}John</ref></p>`);
    editor.destroy();
  });

  // The External tab's "Link text" is free text and index-supplied labels
  // (`hit.name`, `hit.display_label`) are trusted verbatim. `insertContent(str)`
  // HTML-PARSES its argument, so any of these used to insert fewer characters
  // than `label.length` and the follow-up selection overshot into the prose,
  // dragging existing text into the link (or tearing the paragraph apart).
  const hostileLabels: Array<[string, string]> = [
    ['an anchor', '<a href="https://evil.example/">click</a>'],
    ['an underline', '<u>u</u>'],
    ['a block element', '<p>X</p>'],
    ['a div', '<div>x</div>'],
    ['a bare angle bracket and ampersand', 'Rot & <Ruin>'],
  ];

  for (const [name, label] of hostileLabels) {
    it(`treats a label containing ${name} as literal text, leaving following prose intact`, () => {
      const editor = makeEditor('<p>Granted by KING.</p>');
      editor.commands.setTextSelection({ from: 12, to: 12 });
      const ref: ResourceRef = { ...JOHN, label };
      expect(insertRefIntoLeaf(editor, ref)).toBe('ok');

      const out = tei(editor);
      // Exactly one paragraph, one ref, and the pre-existing text untouched.
      expect(out.match(/<p>/g)?.length ?? 0).toBe(1);
      expect(out.match(/<ref\b/g)?.length ?? 0).toBe(1);
      expect(out.endsWith('</ref>KING.</p>')).toBe(true);
      // The label round-trips as text, escaped — never as markup.
      expect(out).not.toContain(label);
      expect(leafIsRichRepresentable(out)).toBe(true);
      editor.destroy();
    });
  }

  it('sanitizes only the URL, never the label — so the label must stay inert', () => {
    const ref = externalRef('https://example.org/x', '<a href="https://evil.example/">click</a>');
    const editor = makeEditor('<p>Granted by KING.</p>');
    editor.commands.setTextSelection({ from: 12, to: 12 });
    expect(insertRefIntoLeaf(editor, ref!)).toBe('ok');
    // Text content escapes & < > (quotes need no escaping in XML text).
    expect(tei(editor)).toContain('&lt;a href="https://evil.example/"&gt;click&lt;/a&gt;');
    expect(tei(editor)).not.toContain('<a href');
    editor.destroy();
  });

  it('keeps a label inserted inside an element inside that element', () => {
    // `tr.insertText` inherits the marks at the caret; an unmarked node would
    // split <persName> into two runs around the inserted text.
    const editor = makeEditor('<p>Granted by <persName>John</persName>.</p>');
    editor.commands.setTextSelection({ from: 14, to: 14 }); // inside "John"
    expect(insertRefIntoLeaf(editor, { ...JOHN, label: 'X' })).toBe('ok');
    const out = tei(editor);
    expect(out.match(/<persName>/g)?.length ?? 0).toBe(1);
    expect(out).toBe(`<p>Granted by <persName>Jo${JOHN_OPEN}X</ref>hn</persName>.</p>`);
    editor.destroy();
  });

  it('refuses to nest a <ref> inside an existing one', () => {
    const start = `<p>see ${JOHN_OPEN}John</ref>.</p>`;
    const editor = makeEditor(start);
    editor.commands.setTextSelection({ from: 6, to: 8 }); // inside "John"
    expect(insertRefIntoLeaf(editor, personRefFromScribe({ id: 2, name: 'B' }))).toBe('nested');
    expect(tei(editor)).toBe(start);
    editor.destroy();
  });

  it('refuses a straddling selection and leaves the document untouched', () => {
    const editor = makeEditor('<p>a<seg type="x">bcd</seg>e</p>');
    const before = tei(editor);
    editor.commands.setTextSelection({ from: 3, to: 7 });
    expect(insertRefIntoLeaf(editor, JOHN)).toBe('refused');
    expect(tei(editor)).toBe(before);
    editor.destroy();
  });

  it('refuses an empty label at an empty selection', () => {
    const editor = makeEditor('<p>x</p>');
    editor.commands.setTextSelection({ from: 2, to: 2 });
    expect(insertRefIntoLeaf(editor, { ...JOHN, label: '' })).toBe('refused');
    expect(tei(editor)).toBe('<p>x</p>');
    editor.destroy();
  });
});

describe('refIsInnermost — gates the unlink control', () => {
  it('is true with the caret directly inside a <ref>', () => {
    const editor = makeEditor(`<p>see ${JOHN_OPEN}John</ref>.</p>`);
    editor.commands.setTextSelection({ from: 6, to: 8 });
    expect(refIsInnermost(editor)).toBe(true);
    editor.destroy();
  });

  it('is false inside a nested entity, so unlink cannot delete it by mistake', () => {
    // unwrapTei removes the INNERMOST element; here that is <persName>.
    const editor = makeEditor(`<p>${JOHN_OPEN}<persName>John</persName></ref></p>`);
    editor.commands.setTextSelection({ from: 3, to: 5 });
    expect(refIsInnermost(editor)).toBe(false);
    editor.destroy();
  });

  it('is false in plain prose', () => {
    const editor = makeEditor('<p>plain</p>');
    editor.commands.setTextSelection({ from: 2, to: 4 });
    expect(refIsInnermost(editor)).toBe(false);
    editor.destroy();
  });
});
