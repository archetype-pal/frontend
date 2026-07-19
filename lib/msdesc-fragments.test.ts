import { describe, expect, it } from 'vitest';

import type { ElementShape, XmlElementNode } from '@/lib/msdesc-fragments';
import {
  attrValue,
  canonicalizeFragment,
  checkShape,
  childElements,
  el,
  elementText,
  escapeXmlAttr,
  escapeXmlText,
  hasNonWhitespaceText,
  innerXml,
  parseFragment,
  raw,
  replaceInnerXml,
  resolvePath,
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

describe('inner XML extraction and replacement', () => {
  const source =
    '<history>\n' +
    '  <provenance notAfter="1500"><p>Old owner</p></provenance>\n' +
    '  <acquisition when="1602"><p>Keep &amp; hold</p></acquisition>\n' +
    '</history>';

  it('extracts a leaf inner XML byte-exactly (entities left raw)', () => {
    const { root } = parseOk(source);
    const acquisition = resolvePath(root, ['acquisition']);
    expect(acquisition).not.toBeNull();
    expect(innerXml(source, acquisition!)).toBe('<p>Keep &amp; hold</p>');
  });

  it('replaces a leaf inner XML without disturbing sibling bytes', () => {
    const { root } = parseOk(source);
    const provenance = resolvePath(root, ['provenance']);
    const replacement = '<p>New <persName key="person_1">X</persName></p>';
    const result = replaceInnerXml(source, provenance!, replacement);
    expect(result).toBe(source.replace('<p>Old owner</p>', replacement));
    // The untouched sibling keeps its exact bytes, including the raw entity.
    expect(result).toContain('<acquisition when="1602"><p>Keep &amp; hold</p></acquisition>');
  });

  it('expands a self-closing element when given content', () => {
    const src = '<msItem n="1">\n  <note/>\n  <rubric>Keep</rubric>\n</msItem>';
    const { root } = parseOk(src);
    const note = resolvePath(root, ['note']);
    expect(replaceInnerXml(src, note!, '<p>added</p>')).toBe(
      '<msItem n="1">\n  <note><p>added</p></note>\n  <rubric>Keep</rubric>\n</msItem>'
    );
  });

  it('leaves a self-closing element untouched when given empty content', () => {
    const src = '<a><b/></a>';
    const { root } = parseOk(src);
    expect(replaceInnerXml(src, resolvePath(root, ['b'])!, '')).toBe(src);
  });

  it('empties an open/close pair in place', () => {
    const src = '<a><b>x</b><c>y</c></a>';
    const { root } = parseOk(src);
    expect(replaceInnerXml(src, resolvePath(root, ['b'])!, '')).toBe('<a><b></b><c>y</c></a>');
  });

  it('resolves indexed paths', () => {
    const src = '<d><n>a</n><n>b</n></d>';
    const { root } = parseOk(src);
    expect(elementText(resolvePath(root, [['n', 1]])!)).toBe('b');
    expect(resolvePath(root, [['n', 2]])).toBeNull();
    expect(resolvePath(root, ['missing'])).toBeNull();
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
});

describe('canonicalizeFragment', () => {
  it('normalizes indentation and self-closing while preserving attribute order', () => {
    const result = canonicalizeFragment('<a  z="1"   b="2"><c></c><d>x &amp; y</d>\n</a>');
    expect(result).toEqual({
      ok: true,
      xml: '<a z="1" b="2">\n  <c/>\n  <d>x &amp; y</d>\n</a>',
    });
  });

  it('is idempotent', () => {
    const once = canonicalizeFragment('<a><b>text <hi>inline</hi></b><c/></a>');
    if (!once.ok) throw new Error(once.error);
    expect(canonicalizeFragment(once.xml)).toEqual(once);
  });

  it('keeps mixed content byte-verbatim', () => {
    const mixed =
      '<p>Owner: <persName key="person_1">X</persName>, <q type="pressmark">A 1</q>.</p>';
    expect(canonicalizeFragment(mixed)).toEqual({ ok: true, xml: mixed });
    expect(canonicalizeFragment(`<provenance>${mixed}</provenance>`)).toEqual({
      ok: true,
      xml: `<provenance>\n  ${mixed}\n</provenance>`,
    });
  });

  it('propagates parse errors', () => {
    const result = canonicalizeFragment('<a><!-- no --></a>');
    expect(result.ok).toBe(false);
  });
});
