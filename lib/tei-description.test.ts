import { describe, expect, it } from 'vitest';

import {
  TEI_NS,
  isTeiDescription,
  teiDescriptionFromText,
  teiDescriptionProse,
  wrapTeiDescription,
} from '@/lib/tei-description';

const PROSE =
  '<p>Granted by <persName>William I</persName> at <placeName>Roxburgh</placeName>.</p>';
const WRAPPED = `<div xmlns="${TEI_NS}" type="description">${PROSE}</div>`;

describe('isTeiDescription — accepts', () => {
  it('the canonical wrapper', () => {
    expect(isTeiDescription(WRAPPED)).toBe(true);
  });

  it('attributes in the other order', () => {
    expect(isTeiDescription(`<div type="description" xmlns="${TEI_NS}">${PROSE}</div>`)).toBe(true);
  });

  it('single-quoted attribute values', () => {
    expect(isTeiDescription(`<div xmlns='${TEI_NS}' type='description'>${PROSE}</div>`)).toBe(true);
  });

  it('surrounding and internal whitespace', () => {
    expect(
      isTeiDescription(`\n  <div\n   xmlns="${TEI_NS}"\n   type="description">\n${PROSE}\n</div>\n`)
    ).toBe(true);
  });

  it('an empty wrapper, self-closing or not', () => {
    expect(isTeiDescription(`<div xmlns="${TEI_NS}" type="description"></div>`)).toBe(true);
    expect(isTeiDescription(`<div xmlns="${TEI_NS}" type="description"/>`)).toBe(true);
  });

  it('a wrapper whose prose contains nested divs', () => {
    expect(
      isTeiDescription(`<div xmlns="${TEI_NS}" type="description"><div><p>x</p></div></div>`)
    ).toBe(true);
  });
});

describe('isTeiDescription — rejects', () => {
  it('legacy catalogue HTML', () => {
    expect(isTeiDescription('<p><b>Melrose, Liber Sancte Marie</b>, no. 175.</p>')).toBe(false);
  });

  it('legacy HTML that merely quotes TEI element names — the false-positive a sniff would fail', () => {
    const quoting =
      '<p>The editors mark witnesses with <code>&lt;persName&gt;</code> and places with ' +
      '<code>&lt;placeName&gt;</code>. A clause is <code>&lt;seg type="disposition"&gt;</code>.</p>';
    expect(isTeiDescription(quoting)).toBe(false);
  });

  it('legacy HTML that literally contains unescaped TEI markup', () => {
    expect(isTeiDescription('<p>Witnessed by <persName>Walter</persName>.</p>')).toBe(false);
  });

  it('a plain HTML div — legacy content routinely opens with one', () => {
    expect(isTeiDescription('<div class="cat-entry"><p>no. 175</p></div>')).toBe(false);
  });

  it('a div carrying some other namespace', () => {
    expect(isTeiDescription('<div xmlns="http://www.w3.org/1999/xhtml"><p>x</p></div>')).toBe(
      false
    );
  });

  it('a wrapper that is not the root — trailing siblings would be truncated on unwrap', () => {
    expect(isTeiDescription(`<div xmlns="${TEI_NS}">${PROSE}</div><p>orphan</p>`)).toBe(false);
  });

  it('a wrapper that starts part-way through the value', () => {
    expect(isTeiDescription(`<p>lead</p><div xmlns="${TEI_NS}">${PROSE}</div>`)).toBe(false);
  });

  it('the namespace mentioned in text rather than declared', () => {
    expect(isTeiDescription(`<p>Encoded to ${TEI_NS} P5.</p>`)).toBe(false);
  });

  it('the empty string', () => {
    expect(isTeiDescription('')).toBe(false);
  });
});

describe('teiDescriptionProse', () => {
  it('returns the inner p-sequence, wrapper stripped', () => {
    expect(teiDescriptionProse(WRAPPED)).toBe(PROSE);
  });

  it('returns null for legacy HTML so callers cannot mistake it for empty prose', () => {
    expect(teiDescriptionProse('<p>no. 175</p>')).toBeNull();
  });

  it('returns empty prose for both empty wrapper forms', () => {
    expect(teiDescriptionProse(`<div xmlns="${TEI_NS}" type="description"></div>`)).toBe('');
    expect(teiDescriptionProse(`<div xmlns="${TEI_NS}" type="description"/>`)).toBe('');
  });

  it('keeps a nested div in the prose intact', () => {
    const inner = '<div><p>x</p></div>';
    expect(teiDescriptionProse(`<div xmlns="${TEI_NS}">${inner}</div>`)).toBe(inner);
  });
});

describe('wrapTeiDescription', () => {
  it('round-trips prose through wrap and unwrap', () => {
    expect(teiDescriptionProse(wrapTeiDescription(PROSE))).toBe(PROSE);
  });

  it('is idempotent under wrap → unwrap → wrap', () => {
    const once = wrapTeiDescription(PROSE);
    expect(wrapTeiDescription(teiDescriptionProse(once) ?? '')).toBe(once);
  });

  it('keeps the row TEI when the prose is emptied', () => {
    const empty = wrapTeiDescription('');
    expect(isTeiDescription(empty)).toBe(true);
    expect(teiDescriptionProse(empty)).toBe('');
  });

  it('declares the namespace on the root, which is what makes it TEI', () => {
    expect(wrapTeiDescription(PROSE)).toContain(`xmlns="${TEI_NS}"`);
  });
});

describe('teiDescriptionFromText', () => {
  it('keeps the words and drops nothing else', () => {
    expect(teiDescriptionProse(teiDescriptionFromText('Melrose, no. 175.'))).toBe(
      '<p>Melrose, no. 175.</p>'
    );
  });

  it('tags nothing — a name in the text does not become a persName', () => {
    const seeded = teiDescriptionFromText('Witnessed by Walter de Bidun.');
    expect(seeded).not.toContain('persName');
    expect(seeded).not.toContain('<ref');
  });

  it('escapes characters that would otherwise become markup', () => {
    expect(teiDescriptionProse(teiDescriptionFromText('Cotton & heirs, <1631'))).toBe(
      '<p>Cotton &amp; heirs, &lt;1631</p>'
    );
  });

  it('does not double-escape an already-decoded entity', () => {
    // The bug this signature exists to prevent: a decoded non-breaking space is
    // a character, and must stay one rather than becoming the text "&nbsp;".
    const seeded = teiDescriptionFromText('Melrose,\u00a0no. 175');
    expect(seeded).toContain('\u00a0');
    expect(seeded).not.toContain('&amp;nbsp;');
  });

  it('produces an empty TEI row rather than a wrapper full of nothing', () => {
    expect(teiDescriptionFromText('   ')).toBe(wrapTeiDescription(''));
  });
});
