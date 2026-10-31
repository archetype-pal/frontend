import { describe, expect, it } from 'vitest';

import { decodeEntities, escapeHtml, escapeXmlAttr, escapeXmlText } from './markup-escape';

describe('escapeXmlText', () => {
  it('escapes only the three characters XML forbids in text', () => {
    expect(escapeXmlText(`a & b < c > "d" 'e'`)).toBe(`a &amp; b &lt; c &gt; "d" 'e'`);
  });
});

describe('escapeXmlAttr', () => {
  it('escapes both quote styles like html.escape(quote=True)', () => {
    expect(escapeXmlAttr(`"x" & 'y'`)).toBe('&quot;x&quot; &amp; &#x27;y&#x27;');
  });

  it('is the same function as escapeHtml', () => {
    expect(escapeHtml).toBe(escapeXmlAttr);
  });
});

describe('decodeEntities', () => {
  it('decodes the five XML entities, case-insensitively, and numeric references', () => {
    expect(decodeEntities('&amp;&LT;&gt;&quot;&apos;&#65;&#x42;')).toBe('&<>"\'AB');
  });

  it('leaves an uppercase &#X…; alone, as XML does not allow it', () => {
    expect(decodeEntities('&#X43;')).toBe('&#X43;');
  });

  it('round-trips with escapeXmlAttr', () => {
    const raw = `<p class="x">it's & more</p>`;
    expect(decodeEntities(escapeXmlAttr(raw))).toBe(raw);
  });

  it('leaves unknown names and out-of-range code points as written', () => {
    expect(decodeEntities('&nbsp;&#x110000;&#99999999;')).toBe('&nbsp;&#x110000;&#99999999;');
  });
});
