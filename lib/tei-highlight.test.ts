import { describe, expect, it } from 'vitest';

import { HIGHLIGHT_DEFAULT, applyHighlightClasses, highlightableOptions } from './tei-highlight';

const TEI = [
  '<p>',
  '<seg type="address" corresp="#gid-1">',
  '<seg type="intitulatio">D<ex>avid</ex> rex</seg> ',
  '<persName type="name">David</persName>',
  '</seg> ',
  '<seg type="salutation">salutem</seg> ',
  '<seg type="disposition">dedisse</seg>',
  '<lb source="ms">|</lb>',
  '</p>',
].join('');

describe('highlightableOptions', () => {
  it('lists the distinct labels in first-appearance order (typed @type, else element kind)', () => {
    const opts = highlightableOptions(TEI);
    // The inner <ex> has no @type → falls back to its kind ("expansion"), and
    // appears in source order between intitulatio and the persName.
    expect(opts.map((o) => o.value)).toEqual([
      'address',
      'intitulatio',
      'expansion',
      'name',
      'salutation',
      'disposition',
    ]);
    expect(highlightableOptions('<ex>avit</ex>')[0]).toMatchObject({
      value: 'expansion',
      category: 'ex',
    });
  });

  it('title-cases the display label and tags the dpt category', () => {
    const opts = highlightableOptions(TEI);
    const name = opts.find((o) => o.value === 'name');
    expect(name).toMatchObject({ label: 'Name', category: 'person' });
    const salutation = opts.find((o) => o.value === 'salutation');
    expect(salutation).toMatchObject({ label: 'Salutation', category: 'clause' });
  });

  it('ignores line breaks and non-highlightable markup', () => {
    expect(highlightableOptions('<p>plain <lb/> text</p>')).toEqual([]);
  });
});

describe('applyHighlightClasses', () => {
  it('adds tei-hl only to spans whose type is selected', () => {
    const html = highlightableApplied(new Set(['name', 'salutation']));
    // name (persName) already carries a class → tei-hl is appended
    expect(html).toMatch(/class="tei-el tei-el-persName tei-hl"/);
    // salutation (seg) had no class → a class is created
    expect(html).toMatch(/data-dpt-type="salutation"[^>]*class="tei-hl"/);
    // disposition was NOT selected → untouched
    expect(html).not.toMatch(/data-dpt-type="disposition"[^>]*tei-hl/);
  });

  it('adds a data-tei-label for the hover pill when absent', () => {
    const html = highlightableApplied(new Set(['salutation']));
    expect(html).toMatch(/data-dpt-type="salutation"[^>]*data-tei-label="salutation"/);
  });

  it('gives each type a distinct colour via inline --hl-* custom properties', () => {
    const html = highlightableApplied(new Set(['name', 'salutation']));
    // both highlighted spans carry a hue variable...
    const hues = [...html.matchAll(/--hl-h:(\d+)/g)].map((m) => m[1]);
    expect(hues.length).toBeGreaterThanOrEqual(2);
    // ...and name's hue differs from salutation's (not one shared category colour)
    const nameHue = html.match(/data-dpt-type="name"[^>]*--hl-h:(\d+)/)?.[1];
    const salHue = html.match(/data-dpt-type="salutation"[^>]*--hl-h:(\d+)/)?.[1];
    expect(nameHue).toBeTruthy();
    expect(salHue).toBeTruthy();
    expect(nameHue).not.toBe(salHue);
  });

  it('is a no-op when nothing is selected', () => {
    const base = importToDpt(TEI);
    expect(applyHighlightClasses(base, new Set())).toBe(base);
  });

  it('defaults highlight name + salutation', () => {
    expect([...HIGHLIGHT_DEFAULT]).toEqual(['name', 'salutation']);
  });
});

// helpers ------------------------------------------------------------------

import { toDptHtml } from './tei-to-dpt-html';
function importToDpt(tei: string): string {
  return toDptHtml(tei);
}
function highlightableApplied(selected: Set<string>): string {
  return applyHighlightClasses(toDptHtml(TEI), selected);
}
