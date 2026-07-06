import { describe, expect, it } from 'vitest';

import { docToTei, indexLinkableElements, teiToDoc } from '@/lib/tei-prosemirror';

function roundTrip(tei: string): string {
  return docToTei(teiToDoc(tei));
}

describe('teiToDoc / docToTei round-trip', () => {
  const cases: [string, string][] = [
    ['plain paragraph', '<p>just text</p>'],
    ['single seg', '<p><seg type="address">Omnibus</seg></p>'],
    ['persName with type', '<p><persName type="name">Walter</persName></p>'],
    ['nested persName > ex', '<p><persName type="name">Walt<ex>erus</ex></persName></p>'],
    ['lb wrapping a separator', '<p>Ad <lb source="ms">|</lb> spectat</p>'],
    ['corresp attribute', '<p><seg type="salutation" corresp="#gid-2824">salutem</seg></p>'],
    [
      'nested same-type seg (address > intitulatio)',
      '<p><seg type="address">A <seg type="intitulatio">Arnald<ex>us</ex></seg> B</seg></p>',
    ],
    [
      'sibling same-type segs must stay separate',
      '<p><seg type="address">X</seg><seg type="address">Y</seg></p>',
    ],
    ['multiple paragraphs', '<p><seg type="address">A</seg></p><p>plain B</p>'],
    [
      'deeply mixed',
      '<p><seg type="address">Omnibus <persName type="name">Dauid</persName> rex ' +
        '<seg type="intitulatio">scott<ex>orum</ex></seg> salutem</seg></p>',
    ],
  ];

  it.each(cases)('round-trips %s', (_name, tei) => {
    expect(roundTrip(tei)).toBe(tei);
  });

  it('models nesting as an ancestor stack on each run', () => {
    const doc = teiToDoc('<p><seg type="address">A<persName>B</persName></seg></p>');
    const runs = doc.content[0].content;
    // "A" carries [seg]; "B" carries [seg, persName].
    expect(runs[0].marks?.[0].attrs.stack.map((e) => e.el)).toEqual(['seg']);
    expect(runs[1].marks?.[0].attrs.stack.map((e) => e.el)).toEqual(['seg', 'persName']);
  });

  it('skips unknown node types instead of crashing (no elAttrs)', () => {
    // A stray hardBreak-style node (no elAttrs) must not throw in docToTei.
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { pAttrs: {} },
          content: [
            { type: 'text', text: 'a' },
            { type: 'hardBreak' },
            { type: 'text', text: 'b' },
          ],
        },
      ],
    } as unknown as Parameters<typeof docToTei>[0];
    expect(docToTei(doc)).toBe('<p>ab</p>');
  });

  it('preserves entities canonically', () => {
    expect(roundTrip('<p>a &amp; b &lt;c&gt;</p>')).toBe('<p>a &amp; b &lt;c&gt;</p>');
  });
});

function indexByText(tei: string): Record<number, string> {
  const map = indexLinkableElements(teiToDoc(tei));
  const out: Record<number, string> = {};
  for (const { index, text } of map.values()) out[index] = text.replace(/\s+/g, ' ').trim();
  return out;
}

describe('indexLinkableElements', () => {
  it('numbers linkable elements in document start-tag order', () => {
    expect(
      indexByText('<p><seg>A</seg><persName>B</persName><seg>C<placeName>D</placeName></seg></p>')
    ).toEqual({ 0: 'A', 1: 'B', 2: 'CD', 3: 'D' });
  });

  it('indexes an inner element after its enclosing element (outer→inner)', () => {
    expect(indexByText('<p><seg>Wil<persName>son</persName></seg></p>')).toEqual({
      0: 'Wilson',
      1: 'son',
    });
  });

  it('counts a void <lb/> as an index even though it holds no text and is not a target', () => {
    // lb consumes index 0 (no id/text in the map); the seg is therefore index 1 —
    // matching the backend, which counts <lb/> among linkable elements.
    expect(indexByText('<p>X<lb/><seg>Y</seg></p>')).toEqual({ 1: 'Y' });
  });

  it('does not count non-linkable wrappers like paragraphs', () => {
    expect(indexByText('<p>plain</p><p><seg>only</seg></p>')).toEqual({ 0: 'only' });
  });
});
