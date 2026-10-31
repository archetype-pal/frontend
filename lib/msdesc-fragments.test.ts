import { describe, expect, it } from 'vitest';

import { escapeXmlAttr, escapeXmlText } from '@/lib/markup-escape';
import type { ElementShape, XmlElementNode } from '@/lib/msdesc-fragments';
import {
  attrValue,
  checkShape,
  childElements,
  el,
  elementText,
  hasNonWhitespaceText,
  innerXml,
  parseFragment,
  raw,
  serializeFragment,
  text,
} from '@/lib/msdesc-fragments';

function parseOk(fragment: string): { root: XmlElementNode; source: string } {
  const parsed = parseFragment(fragment);
  if (!parsed.ok) throw new Error(`expected parse to succeed: ${parsed.error}`);
  return parsed;
}

function parseError(fragment: string): string {
  const parsed = parseFragment(fragment);
  if (parsed.ok) throw new Error('expected parse to fail');
  return parsed.error;
}

describe('parseFragment', () => {
  it('parses an element tree with attributes in source order', () => {
    const { root } = parseOk('<layout columns="2" topLine="below"><p>text</p></layout>');
    expect(root.name).toBe('layout');
    expect(root.attrs).toEqual([
      { name: 'columns', value: '2' },
      { name: 'topLine', value: 'below' },
    ]);
    expect(childElements(root).map((c) => c.name)).toEqual(['p']);
    expect(elementText(childElements(root)[0])).toBe('text');
  });

  it('tolerates surrounding whitespace and records offsets against the trimmed source', () => {
    const { root, source } = parseOk('  \n<note>Hi</note>\n ');
    expect(source).toBe('<note>Hi</note>');
    expect(root.start).toBe(0);
    expect(root.end).toBe(source.length);
  });

  it('decodes named and numeric entities in text and attributes', () => {
    const { root } = parseOk('<q rend="a&amp;b &#x41;">x &lt; y &amp; z &#233;</q>');
    expect(attrValue(root, 'rend')).toBe('a&b A');
    expect(elementText(root)).toBe('x < y & z é');
  });

  it('parses self-closing elements', () => {
    const { root } = parseOk('<extent><measure type="leaf"/></extent>');
    const measure = childElements(root)[0];
    expect(measure.selfClosing).toBe(true);
    expect(measure.children).toEqual([]);
    expect(attrValue(measure, 'type')).toBe('leaf');
  });

  it('accepts xml:id-style names', () => {
    const { root } = parseOk('<handNote xml:id="hand-1"/>');
    expect(attrValue(root, 'xml:id')).toBe('hand-1');
  });

  it.each([
    ['comment', '<a><!-- hidden --></a>'],
    ['processing instruction', '<?xml version="1.0"?><a/>'],
    ['CDATA', '<a><![CDATA[x]]></a>'],
    ['DOCTYPE', '<!DOCTYPE a><a/>'],
    ['mismatched closing tag', '<a><b></a></b>'],
    ['unclosed element', '<a><b>'],
    ['duplicate attribute', '<a x="1" x="2"/>'],
    ['unknown entity', '<a>&nbsp;</a>'],
    ['bare ampersand', '<a>fish & chips</a>'],
    ['unquoted attribute', '<a x=1/>'],
    ['angle bracket in attribute value', '<a x="<b>"/>'],
    ['content after the root element', '<a/><b/>'],
    ['trailing text', '<a/>tail'],
    ['empty input', '   '],
  ])('rejects %s instead of dropping it', (_label, fragment) => {
    expect(parseError(fragment)).toBeTruthy();
  });
});

describe('innerXml', () => {
  const source =
    '<history>\n' +
    '  <provenance notAfter="1500"><p>Old owner</p></provenance>\n' +
    '  <acquisition when="1602"><p>Keep &amp; hold</p></acquisition>\n' +
    '</history>';

  it('extracts a leaf inner XML byte-exactly (entities left raw)', () => {
    const { root } = parseOk(source);
    const acquisition = childElements(root).find((c) => c.name === 'acquisition');
    expect(acquisition).toBeDefined();
    expect(innerXml(source, acquisition!)).toBe('<p>Keep &amp; hold</p>');
  });
});

describe('tree accessors', () => {
  it('elementText returns null for elements with element children', () => {
    const { root } = parseOk('<a>mixed <b>x</b></a>');
    expect(elementText(root)).toBeNull();
    expect(hasNonWhitespaceText(root)).toBe(true);
  });

  it('elementText returns the empty string for empty elements', () => {
    expect(elementText(parseOk('<a/>').root)).toBe('');
    expect(elementText(parseOk('<a></a>').root)).toBe('');
  });
});

describe('checkShape', () => {
  const shape: ElementShape = {
    content: 'elements',
    children: {
      origDate: { content: 'text', attrs: ['calendar'] },
      provenance: { content: 'inner-xml', attrs: ['notAfter'] },
    },
  };

  it('accepts a conforming tree', () => {
    const { root } = parseOk(
      '<origin><origDate calendar="#Gregorian">c. 1300</origDate><provenance notAfter="1500"><p>Any <q>markup</q> at all</p></provenance></origin>'
    );
    expect(checkShape(root, shape)).toEqual({ ok: true });
  });

  it('rejects unknown elements', () => {
    const { root } = parseOk('<origin><sealDesc/></origin>');
    const result = checkShape(root, shape);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('<sealDesc>');
  });

  it('rejects unknown attributes at any depth', () => {
    const { root } = parseOk(
      '<origin><origDate calendar="#Gregorian" evidence="internal"/></origin>'
    );
    const result = checkShape(root, shape);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('evidence');
  });

  it('rejects text content inside element-only containers', () => {
    const { root } = parseOk('<origin>stray text</origin>');
    expect(checkShape(root, shape).ok).toBe(false);
  });

  it('rejects element children inside text leaves', () => {
    const { root } = parseOk('<origin><origDate>c. <hi>1300</hi></origDate></origin>');
    expect(checkShape(root, shape).ok).toBe(false);
  });

  it('allows arbitrary content inside inner-xml leaves', () => {
    const { root } = parseOk(
      '<origin><provenance><p>a<persName key="p1">b</persName></p><p>c</p></provenance></origin>'
    );
    expect(checkShape(root, shape)).toEqual({ ok: true });
  });
});

describe('serializeFragment', () => {
  it('block-indents element-only content and inlines text content', () => {
    const built = el('support', [], [el('material', [], [text('Parchment')])]);
    expect(serializeFragment(built)).toBe(
      '<support>\n  <material>Parchment</material>\n</support>'
    );
  });

  it('self-closes empty elements and skips undefined attributes', () => {
    expect(
      serializeFragment(
        el('measure', [
          ['type', 'leaf'],
          ['quantity', undefined],
        ])
      )
    ).toBe('<measure type="leaf"/>');
  });

  it('escapes text and attribute values', () => {
    const built = el('condition', [['n', 'a&"b']], [text('x < y & z')]);
    expect(serializeFragment(built)).toBe(
      '<condition n="a&amp;&quot;b">x &lt; y &amp; z</condition>'
    );
  });

  it('splices raw children verbatim', () => {
    const built = el('collation', [], [raw('<p>1–3<hi rend="superscript">8</hi></p>')]);
    expect(serializeFragment(built)).toBe(
      '<collation><p>1–3<hi rend="superscript">8</hi></p></collation>'
    );
  });

  it('escape helpers cover the canonical escape sets', () => {
    expect(escapeXmlText('a<b>&c')).toBe('a&lt;b&gt;&amp;c');
    expect(escapeXmlAttr('a"b<c&d')).toBe('a&quot;b&lt;c&amp;d');
  });

  it("escapes attributes exactly like the ProseMirror emitter (incl. > and ')", () => {
    // The two emitters must agree byte-for-byte or the leaf editor's
    // rich-representability gate demotes apostrophe-bearing leaves forever.
    const value = `St Andrew's & <x> "q" >`;
    expect(escapeXmlAttr(value)).toBe(escapeAttrLikeProseMirror(value));
    expect(escapeXmlAttr("St Andrew's")).toBe('St Andrew&#x27;s');
    expect(escapeXmlAttr('a>b')).toBe('a&gt;b');
  });
});

/** Local copy of `escapeAttr` from lib/tei-prosemirror.ts (module-private there). */
function escapeAttrLikeProseMirror(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
