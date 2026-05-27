import { describe, expect, it } from 'vitest';

import { isTei, teiToDptHtml, toDptHtml } from '@/lib/tei-to-dpt-html';

describe('isTei', () => {
  it('detects TEI element markup', () => {
    expect(isTei('<p><seg type="address">x</seg></p>')).toBe(true);
    expect(isTei('<persName type="name">John</persName>')).toBe(true);
  });

  it('treats legacy data-dpt HTML as not-TEI', () => {
    expect(isTei('<span data-dpt="clause" data-dpt-type="address">x</span>')).toBe(false);
  });

  it('treats plain HTML as not-TEI', () => {
    expect(isTei('<p>plain text</p>')).toBe(false);
  });
});

describe('teiToDptHtml', () => {
  const cases: Array<[string, string]> = [
    [
      '<seg type="address">x</seg>',
      '<span data-dpt="clause" data-dpt-cat="words" data-dpt-type="address">x</span>',
    ],
    [
      '<persName type="name">x</persName>',
      '<span data-dpt="person" data-dpt-cat="chars" data-dpt-type="name">x</span>',
    ],
    [
      '<placeName type="name">x</placeName>',
      '<span data-dpt="place" data-dpt-cat="chars" data-dpt-type="name">x</span>',
    ],
    ['<ex>us</ex>', '<span data-dpt="ex" data-dpt-cat="chars">us</span>'],
    ['<supplied>x</supplied>', '<span data-dpt="supplied" data-dpt-cat="chars">x</span>'],
    ['<lb source="ms">|</lb>', '<span data-dpt="lb" data-dpt-src="ms">|</span>'],
    ['<lb type="sep">|</lb>', '<span data-dpt="lb" data-dpt-cat="sep">|</span>'],
  ];

  it.each(cases)('translates %s', (tei, dpt) => {
    expect(teiToDptHtml(tei)).toBe(dpt);
  });

  it('maps corresp back to data-graph-id (single + multi)', () => {
    expect(teiToDptHtml('<seg type="salutation" corresp="#gid-2824">s</seg>')).toBe(
      '<span data-dpt="clause" data-dpt-cat="words" data-dpt-type="salutation" data-graph-id="2824">s</span>'
    );
    expect(teiToDptHtml('<seg type="address" corresp="#gid-10 #gid-11">x</seg>')).toBe(
      '<span data-dpt="clause" data-dpt-cat="words" data-dpt-type="address" data-graph-id="10,11">x</span>'
    );
  });

  it('passes non-TEI markup through unchanged', () => {
    const html = '<p>plain <em>emph</em> <a href="/x">link</a> &amp; &nbsp;end</p>';
    expect(teiToDptHtml(html)).toBe(html);
  });

  it('handles nested constructs', () => {
    const tei = '<p><seg type="intitulatio">Arnald<ex>us</ex></seg></p>';
    expect(teiToDptHtml(tei)).toBe(
      '<p><span data-dpt="clause" data-dpt-cat="words" data-dpt-type="intitulatio">' +
        'Arnald<span data-dpt="ex" data-dpt-cat="chars">us</span></span></p>'
    );
  });
});

describe('toDptHtml', () => {
  it('leaves data-dpt content untouched', () => {
    const dpt = '<span data-dpt="clause" data-dpt-cat="words" data-dpt-type="address">x</span>';
    expect(toDptHtml(dpt)).toBe(dpt);
  });

  it('translates TEI content', () => {
    expect(toDptHtml('<seg type="address">x</seg>')).toContain('data-dpt="clause"');
  });
});
