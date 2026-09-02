import { describe, expect, it } from 'vitest';

import { renderMsDescArea } from '@/lib/tei-msdesc-render';
import { placeSearchTarget } from '@/lib/tei-ref-picker';

/**
 * Roadmap 4.4 verification: the shipped msDesc renderer already turns every
 * `<ref>` / `@key` shape the picker emits into the correct `<a>` (or the
 * plain-text + tooltip fallback). This exercises the renderer AS-IS — it does
 * not modify it — over each serialization from `lib/tei-ref-picker.ts`.
 */

// One msContents fragment carrying all five picker `<ref>` kinds inline (prose),
// a tolerated key-only work_ ref, plus the ODD-native @key-on-element variant
// (author = person, title = work_).
const PLACE_TARGET = placeSearchTarget('Kelso');

const FRAGMENT = `<msContents>
  <summary><p>See <ref type="person" key="person_42" target="/scribes/42">A. Scribe</ref>, <ref type="place" target="${PLACE_TARGET}">Kelso</ref>, <ref type="manuscript" target="/manuscripts/5">MS 5</ref>, <ref type="search" target="/search/manuscripts?keyword=charter">charters</ref>, <ref target="https://example.org/x">CPL 313</ref>, and <ref key="work_790">De Civ</ref>.</p></summary>
  <msItem>
    <author key="person_42">Augustine</author>
    <title key="work_790">De Civitate Dei</title>
  </msItem>
</msContents>`;

// The third form-path shape MsKeyField/history-form can persist: a bare @key on
// origPlace's country/region/settlement.
const HISTORY_FRAGMENT = `<history>
  <origin>
    <origPlace>
      <settlement key="person_42">Kelso</settlement>
      <country key="place_3">Scotland</country>
    </origPlace>
  </origin>
</history>`;

describe('renderMsDescArea covers every picker <ref>/@key shape (4.4)', () => {
  const html = renderMsDescArea('msContents', FRAGMENT);

  it('renders a Person <ref> as a site-relative <a> to /scribes/{id}', () => {
    expect(html).toContain('<a href="/scribes/42"');
    expect(html).toContain('>A. Scribe</a>');
  });

  it('renders a Place <ref> as an <a> to the search link', () => {
    expect(html).toContain(`<a href="${PLACE_TARGET}"`);
    expect(html).toContain('>Kelso</a>');
  });

  it('renders a Manuscript <ref> as an <a> to /manuscripts/{id}', () => {
    expect(html).toContain('<a href="/manuscripts/5"');
    expect(html).toContain('>MS 5</a>');
  });

  it('renders a Search <ref> as an <a> to the saved-search link', () => {
    expect(html).toContain('<a href="/search/manuscripts?keyword=charter"');
  });

  it('renders an External <ref> as an <a> opening in a new tab', () => {
    expect(html).toContain(
      '<a href="https://example.org/x" class="tei-el tei-el-ref" data-tei-label="ref" target="_blank" rel="noopener noreferrer">CPL 313</a>'
    );
  });

  it('renders a key-only work_ <ref> as a plain-text tooltip span, not an <a>', () => {
    // No client-derivable route for work_ → unresolved span (never an anchor).
    expect(html).toContain('msdesc-unresolved');
    expect(html).toContain('>De Civ</span>');
    expect(html).not.toContain('href="/publications/790"');
  });

  it('renders the ODD-native @key-on-<author> (person) as an <a>', () => {
    expect(html).toContain('<a href="/scribes/42"');
    expect(html).toContain('>Augustine</a>');
  });

  it('renders the ODD-native @key-on-<title> (work_) as an unresolved span', () => {
    expect(html).toContain('>De Civitate Dei</span>');
  });
});

describe('renderMsDescArea covers the origPlace @key shape (form path)', () => {
  const html = renderMsDescArea('history', HISTORY_FRAGMENT);

  it('renders a resolvable @key on <settlement> as an <a>', () => {
    expect(html).toContain('<a href="/scribes/42"');
    expect(html).toContain('>Kelso</a>');
  });

  it('renders an unresolvable place_ @key on <country> as a tooltip span', () => {
    expect(html).toContain('msdesc-unresolved');
    expect(html).toContain('>Scotland</span>');
    expect(html).not.toContain('href="/places/3"');
  });
});

describe('every place target the picker emits resolves to a real route', () => {
  it('emits a typed /search/{type} path and always carries ?keyword=', () => {
    for (const name of ['Kelso', 'St Andrews', "St Andrew's"]) {
      const target = placeSearchTarget(name);
      const [path, query] = target.split('?');
      expect(path).toMatch(/^\/search\/[^/?]+$/);
      expect(new URLSearchParams(query).get('keyword')).toBe(name);
    }
  });
});
