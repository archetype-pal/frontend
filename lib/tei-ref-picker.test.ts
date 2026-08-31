import { describe, expect, it } from 'vitest';

import { escapeXmlAttr, parseFragment } from '@/lib/msdesc-fragments';
import { docToTei, indexLinkableElements, teiToDoc } from '@/lib/tei-prosemirror';
import { buildRefMarkup, parseRefMarkup, type ResourceRef } from '@/lib/tei-ref';
import { leafIsRichRepresentable } from '@/components/backoffice/manuscripts/msdesc/msdesc-leaf-editor';
import {
  imageRefsFromHits,
  externalRef,
  keyFromRef,
  manuscriptRefFromItemPart,
  personRefFromScribe,
  placeRef,
  placeRefsFromHits,
  placeSearchTarget,
  refAttrs,
  safeInternalTarget,
  savedSearchRef,
  sourceInsertMarkup,
} from '@/lib/tei-ref-picker';
import type { SavedSearch } from '@/lib/saved-searches';
import type { ItemPartHit, PlaceHit, ScribeHit } from '@/services/tei-ref-search';

// ── hit → ResourceRef → markup wiring ─────────────────────────────────────

describe('search hit → ResourceRef → markup', () => {
  it('maps a scribe hit to a Person ref that serializes per §8.3', () => {
    const hit: ScribeHit = { id: 42, name: 'A. Scribe', scriptorium: 'Kelso' };
    const ref = personRefFromScribe(hit);
    expect(ref).toEqual({
      kind: 'person',
      id: 42,
      key: 'person_42',
      target: '/scribes/42',
      label: 'A. Scribe',
    });
    expect(buildRefMarkup(ref, ref.label)).toBe(
      '<ref type="person" key="person_42" target="/scribes/42">A. Scribe</ref>'
    );
    // parseRefMarkup derives id as a string; the rest round-trips exactly.
    expect(parseRefMarkup(buildRefMarkup(ref, ref.label))).toEqual({ ...ref, id: '42' });
  });

  it('maps an item-part hit to a Manuscript ref at the detail route', () => {
    const hit: ItemPartHit = { id: 5, display_label: 'NLS Adv. MS 15.1.18', shelfmark: '15.1.18' };
    const ref = manuscriptRefFromItemPart(hit);
    expect(ref).toEqual({
      kind: 'manuscript',
      id: 5,
      target: '/manuscripts/5',
      label: 'NLS Adv. MS 15.1.18',
    });
    expect(buildRefMarkup(ref, ref.label)).toBe(
      '<ref type="manuscript" target="/manuscripts/5">NLS Adv. MS 15.1.18</ref>'
    );
  });

  it('falls back to the shelfmark, then the id, for a manuscript label', () => {
    expect(manuscriptRefFromItemPart({ id: 7, shelfmark: 'Foo 1' }).label).toBe('Foo 1');
    expect(manuscriptRefFromItemPart({ id: 7 }).label).toBe('#7');
  });

  it('maps a place name to a @target-only search link (no @key)', () => {
    const ref = placeRef('Kelso');
    expect(ref).toEqual({
      kind: 'place',
      target: '/search/manuscripts?keyword=Kelso',
      label: 'Kelso',
    });
    expect(buildRefMarkup(ref, ref.label)).toBe(
      '<ref type="place" target="/search/manuscripts?keyword=Kelso">Kelso</ref>'
    );
    expect(placeSearchTarget('St Andrews')).toBe('/search/manuscripts?keyword=St%20Andrews');
  });

  it('emits a place target that is a real route with a real query param', () => {
    // The site has NO bare `/search/` route (only `search/[type]/page.tsx`) and
    // the page reads `keyword`, never `q` — a bare `/search/?q=` 404s. Pin the
    // shape so it can never regress back.
    const target = placeSearchTarget('Kelso');
    const [path, query] = target.split('?');
    expect(path).toMatch(/^\/search\/[^/?]+$/);
    expect(new URLSearchParams(query).get('keyword')).toBe('Kelso');
  });

  it('de-duplicates place hits by name, capping the list', () => {
    const hits: PlaceHit[] = [
      { id: '1_l0', name: 'Kelso' },
      { id: '2_l0', name: 'kelso' }, // case-insensitive dupe
      { id: '3_l0', name: 'Perth' },
      { id: '4_l0', name: '' }, // dropped
    ];
    const refs = placeRefsFromHits(hits);
    expect(refs.map((r) => r.label)).toEqual(['Kelso', 'Perth']);
    expect(placeRefsFromHits(hits, 1).map((r) => r.label)).toEqual(['Kelso']);
  });

  it('maps a saved search to a Search ref, normalizing the stored url', () => {
    const saved: SavedSearch = {
      id: 'x',
      label: 'Kelso charters',
      resultType: 'manuscripts' as SavedSearch['resultType'],
      keyword: 'Kelso',
      url: '/search/manuscripts?keyword=Kelso',
      filterCount: 1,
      resultCount: 12,
      savedAt: 0,
    };
    const ref = savedSearchRef(saved);
    expect(ref).toEqual({
      kind: 'search',
      target: '/search/manuscripts?keyword=Kelso',
      label: 'Kelso charters',
    });
    // A url stored without a leading slash is repaired to a safe site-relative href.
    expect(safeInternalTarget('search/texts?q=a')).toBe('/search/texts?q=a');
    expect(safeInternalTarget('javascript:alert(1)')).toBeNull();
  });

  it('refuses an authority-form saved url instead of rewriting it into a path', () => {
    // `//evil.com` must NOT be "repaired" to `/evil.com` — that silently turns
    // a rejected cross-origin url into a plausible-looking internal one.
    for (const hostile of ['//evil.example', '/\\evil.example', '\\\\evil.example', '/\\/x']) {
      expect(safeInternalTarget(hostile)).toBeNull();
    }
  });

  it('builds an External ref only for a safe URL', () => {
    expect(externalRef('https://example.org/x', 'CPL 313')).toEqual({
      kind: 'external',
      target: 'https://example.org/x',
      label: 'CPL 313',
    });
    expect(externalRef('/manuscripts/9', '')).toEqual({
      kind: 'external',
      target: '/manuscripts/9',
      label: '/manuscripts/9', // empty label falls back to the target
    });
    expect(externalRef('javascript:alert(1)', 'x')).toBeNull();
    expect(externalRef('  ', 'x')).toBeNull();
  });
});

// ── refAttrs stays byte-for-byte consistent with buildRefMarkup ───────────

describe('refAttrs (Rich-mode wrapTei attrs) matches buildRefMarkup', () => {
  const attrsToString = (attrs: Record<string, string>): string =>
    Object.entries(attrs)
      .map(([n, v]) => ` ${n}="${escapeXmlAttr(v)}"`)
      .join('');

  const refs: ResourceRef[] = [
    personRefFromScribe({ id: 42, name: 'A. Scribe' }),
    manuscriptRefFromItemPart({ id: 5, display_label: 'MS 5' }),
    placeRef('Kelso'),
    { kind: 'search', target: '/search/manuscripts?keyword=charter', label: 'charters' },
    { kind: 'external', target: 'https://example.org', label: 'CPL 313' },
    // Tolerated hand-authored work_ key (external catch-all).
    { kind: 'external', key: 'work_790', target: '/publications/790', label: 'De Civitate Dei' },
  ];

  for (const ref of refs) {
    it(`emits the same attribute set for a ${ref.kind}${ref.key ? ` (${ref.key})` : ''} ref`, () => {
      expect(buildRefMarkup(ref, 'X')).toBe(`<ref${attrsToString(refAttrs(ref))}>X</ref>`);
    });
  }
});

// ── source-mode inner text ────────────────────────────────────────────────

describe('sourceInsertMarkup', () => {
  const ref = personRefFromScribe({ id: 1, name: 'A. Scribe' });
  const open = '<ref type="person" key="person_1" target="/scribes/1">';

  it('wraps the current selection when there is one', () => {
    expect(sourceInsertMarkup(ref, 'the scribe')).toBe(`${open}the scribe</ref>`);
  });

  it('uses the resource label when the selection is empty', () => {
    expect(sourceInsertMarkup(ref, '   ')).toBe(`${open}A. Scribe</ref>`);
  });

  // The Source-tab selection is RAW TEI, not plain text. Escaping it would turn
  // the encoding into literal angle brackets — and the result still parses, so
  // nothing downstream would catch the loss.
  it('splices a balanced inline element verbatim instead of escaping it', () => {
    const selection = '<persName>John of Perth</persName>';
    const markup = sourceInsertMarkup(ref, selection);
    expect(markup).toBe(`${open}${selection}</ref>`);
    expect(markup).not.toContain('&lt;');
  });

  it('preserves a self-closing element and pre-escaped entities in the selection', () => {
    expect(sourceInsertMarkup(ref, 'Robert<lb/>I')).toBe(`${open}Robert<lb/>I</ref>`);
    expect(sourceInsertMarkup(ref, 'Rot &amp; Ruin')).toBe(`${open}Rot &amp; Ruin</ref>`);
    expect(sourceInsertMarkup(ref, 'a <hi rend="italic">b</hi> c')).toBe(
      `${open}a <hi rend="italic">b</hi> c</ref>`
    );
  });

  it('refuses a selection that straddles a tag boundary', () => {
    // Would otherwise emit `<ref …><persName>John</ref>` — malformed XML.
    expect(sourceInsertMarkup(ref, '<persName>John')).toBeNull();
    expect(sourceInsertMarkup(ref, 'John</persName> in 1180.</p>')).toBeNull();
    // A bare `&` is not a valid entity, so it is not a balanced fragment either.
    expect(sourceInsertMarkup(ref, 'Rot & Ruin')).toBeNull();
  });

  it('produces a fragment that re-parses (round-trips through parseFragment)', () => {
    const markup = sourceInsertMarkup(ref, '<persName>John of Perth</persName>');
    expect(parseFragment(markup!).ok).toBe(true);
    const parsed = parseFragment(markup!);
    expect(parsed.ok && parsed.root.children[0].kind).toBe('element');
  });
});

// ── form key-stamp path ───────────────────────────────────────────────────

describe('keyFromRef (form @key stamp)', () => {
  it('derives person_{id} from a picked scribe (author/title/origPlace key field)', () => {
    expect(keyFromRef(personRefFromScribe({ id: 42, name: 'A. Scribe' }))).toBe('person_42');
  });

  it('yields no key for target-only kinds (place/manuscript/search/external)', () => {
    expect(keyFromRef(placeRef('Kelso'))).toBeUndefined();
    expect(keyFromRef(manuscriptRefFromItemPart({ id: 5 }))).toBeUndefined();
    expect(keyFromRef({ kind: 'external', target: 'https://x.org', label: 'x' })).toBeUndefined();
  });
});

// ── Rich-mode insertions pass the byte-exact leaf gate + stay non-linkable ─

describe('a ref-bearing prose leaf is rich-representable and not linkable', () => {
  const leaves = [
    '<p>See <ref type="person" key="person_42" target="/scribes/42">A. Scribe</ref> here.</p>',
    '<p><ref type="manuscript" target="/manuscripts/5">MS 5</ref></p>',
    '<p><ref target="https://example.org/x">CPL 313</ref></p>',
    `<p>${buildRefMarkup(placeRef('Kelso'), 'Kelso')}</p>`,
    '<p><ref type="search" target="/search/manuscripts?keyword=charter">charters</ref></p>',
  ];

  for (const leaf of leaves) {
    it(`round-trips byte-exact and adds no linkable element: ${leaf.slice(0, 24)}…`, () => {
      // The class of values Rich-mode emits (a <ref> inside a <p>) survives the
      // leaf editor's data-safety gate unchanged.
      expect(docToTei(teiToDoc(leaf))).toBe(leaf);
      expect(leafIsRichRepresentable(leaf)).toBe(true);
      // <ref> must never be a region-link target (it is not in LINKABLE_ELEMENTS).
      expect(indexLinkableElements(teiToDoc(leaf)).size).toBe(0);
    });
  }

  // `escapeXmlAttr` (msdesc-fragments) and `escapeAttr` (tei-prosemirror) must
  // agree byte-for-byte: any attribute character one escapes and the other does
  // not makes `docToTei(teiToDoc(v)) !== v`, which permanently demotes the leaf
  // to the plain-textarea fallback — it reads to a scholar as the editor
  // breaking. Apostrophes are the live case: `encodeURIComponent` leaves `'`
  // alone, so every place whose name contains one produces such a target.
  const escapingCases: Array<[string, string]> = [
    ['a place name with an apostrophe', "St Andrew's"],
    ['a place name with an angle bracket', 'A > B'],
    ['a place name with a quote and ampersand', 'Rot "a" & Ruin'],
  ];

  for (const [name, placeName] of escapingCases) {
    it(`keeps a leaf rich-representable for ${name}`, () => {
      const leaf = `<p>${buildRefMarkup(placeRef(placeName), placeName)}</p>`;
      expect(docToTei(teiToDoc(leaf))).toBe(leaf);
      expect(leafIsRichRepresentable(leaf)).toBe(true);
    });
  }

  it('keeps a leaf rich-representable for an external URL containing an apostrophe', () => {
    const ref = externalRef("https://example.org/x?q=O'Brien>", 'CPL 313');
    const leaf = `<p>${buildRefMarkup(ref!, ref!.label)}</p>`;
    expect(leafIsRichRepresentable(leaf)).toBe(true);
  });
});

describe('imageRefsFromHits (docs/tei.md §4.5)', () => {
  it('builds a two-id target from the part and the image', () => {
    const [ref] = imageRefsFromHits([
      { id: 1581, item_part: 228, locus: 'f. 1r', display_label: 'BL Cotton Ch. xviii.14' },
    ]);
    expect(ref.target).toBe('/manuscripts/228/images/1581');
    expect(ref.kind).toBe('image');
  });

  it('keys the row by the IMAGE id, so folios of one manuscript stay distinct', () => {
    const refs = imageRefsFromHits([
      { id: 1580, item_part: 228, locus: 'f. 1r', display_label: 'Cotton' },
      { id: 1581, item_part: 228, locus: 'f. 1v', display_label: 'Cotton' },
    ]);
    expect(refs.map((r) => r.id)).toEqual([1580, 1581]);
  });

  it('combines label and locus, because display_label is the PART label', () => {
    const refs = imageRefsFromHits([
      { id: 1580, item_part: 228, locus: 'f. 1r', display_label: 'Cotton' },
      { id: 1581, item_part: 228, locus: 'f. 1v', display_label: 'Cotton' },
    ]);
    expect(refs.map((r) => r.label)).toEqual(['Cotton, f. 1r', 'Cotton, f. 1v']);
  });

  it('drops a hit with no item_part rather than guessing a path', () => {
    expect(imageRefsFromHits([{ id: 9, locus: 'f. 2r' }])).toEqual([]);
  });

  it('falls back to the id when nothing nameable is present', () => {
    expect(imageRefsFromHits([{ id: 9, item_part: 3 }])[0].label).toBe('#9');
  });
});
