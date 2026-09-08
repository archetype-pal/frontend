import { describe, expect, it } from 'vitest';

import { resolveRefKeyHref } from '@/lib/tei-msdesc-render';
import {
  buildRefMarkup,
  buildRefMarkupRaw,
  isBalancedRefContent,
  keyForResource,
  parseRefMarkup,
  stampKeyOnElement,
  targetForKey,
  unstampKey,
  type ResourceRef,
} from '@/lib/tei-ref';

// ── buildRefMarkup — canonical serialization per §8.3 ─────────────────────

describe('buildRefMarkup', () => {
  it('emits an external URL ref with a @target-only attribute set', () => {
    const ref: ResourceRef = {
      kind: 'external',
      target: 'https://example.org/x',
      label: 'CPL 313',
    };
    expect(buildRefMarkup(ref, 'CPL 313')).toBe(
      '<ref target="https://example.org/x">CPL 313</ref>'
    );
  });

  it('emits a person ref with type + derived key + target', () => {
    const ref: ResourceRef = { kind: 'person', id: 42, target: '/scribes/42', label: 'A. Scribe' };
    expect(buildRefMarkup(ref, 'A. Scribe')).toBe(
      '<ref type="person" key="person_42" target="/scribes/42">A. Scribe</ref>'
    );
  });

  it('emits a place ref as a @target-only search link (no @key)', () => {
    const ref: ResourceRef = { kind: 'place', target: '/search/?q=Kelso', label: 'Kelso' };
    expect(buildRefMarkup(ref, 'Kelso')).toBe(
      '<ref type="place" target="/search/?q=Kelso">Kelso</ref>'
    );
  });

  it('emits a manuscript ref pointing at the detail route', () => {
    const ref: ResourceRef = { kind: 'manuscript', id: 5, target: '/manuscripts/5', label: 'MS 5' };
    expect(buildRefMarkup(ref, 'MS 5')).toBe(
      '<ref type="manuscript" target="/manuscripts/5">MS 5</ref>'
    );
  });

  it('emits a search ref from a saved search', () => {
    const ref: ResourceRef = { kind: 'search', target: '/search/?q=charter', label: 'charters' };
    expect(buildRefMarkup(ref, 'charters')).toBe(
      '<ref type="search" target="/search/?q=charter">charters</ref>'
    );
  });

  it('refuses to build a ref with a javascript: target', () => {
    const ref: ResourceRef = {
      kind: 'external',
      target: 'javascript:alert(1)',
      label: 'x',
    };
    expect(() => buildRefMarkup(ref, 'x')).toThrow(/unsafe target/);
  });
});

// ── build ⇄ parse mutual inverse ──────────────────────────────────────────

describe('buildRefMarkup / parseRefMarkup are mutual inverses', () => {
  const cases: Array<{ name: string; ref: ResourceRef }> = [
    {
      name: 'external',
      ref: { kind: 'external', target: 'https://example.org/x', label: 'CPL 313' },
    },
    {
      name: 'person',
      ref: {
        kind: 'person',
        id: '42',
        key: 'person_42',
        target: '/scribes/42',
        label: 'A. Scribe',
      },
    },
    {
      name: 'place',
      ref: { kind: 'place', target: '/search/?q=Kelso', label: 'Kelso' },
    },
    {
      name: 'manuscript',
      ref: { kind: 'manuscript', id: '5', target: '/manuscripts/5', label: 'MS 5' },
    },
    {
      name: 'search',
      ref: { kind: 'search', target: '/search/?q=charter', label: 'charters' },
    },
    {
      // Deferred to v2, but a hand-authored work_ key is tolerated: it lands in
      // the external catch-all (no @type), key preserved so it round-trips.
      name: 'tolerated work_ key',
      ref: {
        kind: 'external',
        key: 'work_790',
        target: '/publications/790',
        label: 'De Civitate Dei',
      },
    },
  ];

  for (const { name, ref } of cases) {
    it(`round-trips a ${name} ref through markup`, () => {
      const markup = buildRefMarkup(ref, ref.label);
      const parsed = parseRefMarkup(markup);
      expect(parsed).toEqual(ref);
      // build ∘ parse ∘ build is byte-stable.
      expect(buildRefMarkup(parsed!, parsed!.label)).toBe(markup);
    });
  }

  it('parses a hand-authored key-only work_ ref (target derivable to null)', () => {
    const parsed = parseRefMarkup(
      '<ref key="work_790" target="/publications/790">De Civitate Dei</ref>'
    );
    expect(parsed).toEqual({
      kind: 'external',
      id: undefined,
      key: 'work_790',
      target: '/publications/790',
      label: 'De Civitate Dei',
    });
    expect(targetForKey(parsed!.key!)).toBeNull();
  });

  it('rejects markup that is not a single <ref> element', () => {
    expect(parseRefMarkup('<persName>x</persName>')).toBeNull();
    expect(parseRefMarkup('not xml')).toBeNull();
    expect(parseRefMarkup('<ref target="/a">a</ref><ref target="/b">b</ref>')).toBeNull();
  });

  it('rejects a parsed ref carrying a javascript: target', () => {
    expect(parseRefMarkup('<ref target="javascript:alert(1)">x</ref>')).toBeNull();
    expect(parseRefMarkup('<ref type="place" target="data:text/html,x">x</ref>')).toBeNull();
  });

  it('rejects a parsed ref whose target is a backslash-authority url', () => {
    expect(parseRefMarkup('<ref target="/\\evil.example">x</ref>')).toBeNull();
    expect(parseRefMarkup('<ref target="//evil.example">x</ref>')).toBeNull();
  });

  // PARSE SCOPE (pinned, see the module docstring): parseRefMarkup reads the
  // shapes this module emits — it is NOT a general <ref> round-trip.
  it('drops an unrecognized @type and any extra attribute on re-emit', () => {
    const parsed = parseRefMarkup(
      '<ref type="work" key="work_790" n="3" target="/publications/790">Regesta</ref>'
    );
    expect(parsed).toEqual({
      kind: 'external',
      id: undefined,
      key: 'work_790',
      target: '/publications/790',
      label: 'Regesta',
    });
    // `type="work"` and `@n` are NOT re-emitted; only type/key/target survive.
    expect(buildRefMarkup(parsed!, parsed!.label)).toBe(
      '<ref key="work_790" target="/publications/790">Regesta</ref>'
    );
    // A bare hand-authored work_ key (the shape the contract requires be
    // tolerated) IS byte-stable.
    const bare = '<ref key="work_790">Regesta</ref>';
    expect(buildRefMarkup(parseRefMarkup(bare)!, 'Regesta')).toBe(bare);
  });

  it('flattens inner markup to text (not an edit round-trip)', () => {
    const parsed = parseRefMarkup(
      '<ref target="/scribes/1">John <hi rend="italic">le</hi> Scot</ref>'
    );
    expect(parsed?.label).toBe('John le Scot');
  });
});

// ── Source-mode raw wrap (buildRefMarkupRaw / isBalancedRefContent) ───────

describe('buildRefMarkupRaw', () => {
  const ref: ResourceRef = { kind: 'person', id: 7, target: '/scribes/7', label: 'John' };

  it('splices inner XML verbatim where buildRefMarkup would escape it', () => {
    const inner = '<persName>John of Perth</persName>';
    expect(buildRefMarkupRaw(ref, inner)).toBe(
      `<ref type="person" key="person_7" target="/scribes/7">${inner}</ref>`
    );
    expect(buildRefMarkup(ref, inner)).toContain('&lt;persName&gt;');
  });

  it('is identical to buildRefMarkup for markup-free inner text', () => {
    expect(buildRefMarkupRaw(ref, 'John')).toBe(buildRefMarkup(ref, 'John'));
  });

  it('still refuses an unsafe target', () => {
    expect(() => buildRefMarkupRaw({ ...ref, target: 'javascript:alert(1)' }, 'x')).toThrow(
      /unsafe target/
    );
  });
});

describe('isBalancedRefContent', () => {
  it('accepts plain text, balanced elements, self-closing tags and entities', () => {
    expect(isBalancedRefContent('')).toBe(true);
    expect(isBalancedRefContent('plain text')).toBe(true);
    expect(isBalancedRefContent('<persName>John</persName>')).toBe(true);
    expect(isBalancedRefContent('Robert<lb/>I')).toBe(true);
    expect(isBalancedRefContent('Rot &amp; Ruin')).toBe(true);
    expect(isBalancedRefContent('a <hi rend="i">b <persName>c</persName></hi> d')).toBe(true);
  });

  it('rejects a selection straddling a tag boundary or carrying a bare &', () => {
    expect(isBalancedRefContent('<persName>John')).toBe(false);
    expect(isBalancedRefContent('John</persName> in 1180.</p>')).toBe(false);
    expect(isBalancedRefContent('Rot & Ruin')).toBe(false);
  });
});

// ── entity / quote escaping round-trips in target and text ────────────────

describe('escaping round-trips through build/parse', () => {
  it('escapes ampersands and quotes in the target and survives the round trip', () => {
    const ref: ResourceRef = {
      kind: 'search',
      target: '/search/?q="a"&type=b',
      label: 'query',
    };
    const markup = buildRefMarkup(ref, ref.label);
    expect(markup).toBe(
      '<ref type="search" target="/search/?q=&quot;a&quot;&amp;type=b">query</ref>'
    );
    expect(parseRefMarkup(markup)).toEqual(ref);
  });

  it('escapes apostrophes and > in the target exactly like docToTei does', () => {
    // The two attribute emitters must agree or the leaf editor's byte-exact
    // rich-representability gate rejects the leaf (see tei-ref-picker.test.ts).
    const ref: ResourceRef = {
      kind: 'place',
      target: "/search/manuscripts?keyword=St Andrew's>",
      label: "St Andrew's",
    };
    const markup = buildRefMarkup(ref, ref.label);
    expect(markup).toBe(
      '<ref type="place" target="/search/manuscripts?keyword=St Andrew&#x27;s&gt;">' +
        "St Andrew's</ref>"
    );
    expect(parseRefMarkup(markup)).toEqual(ref);
  });

  it('escapes entity-significant characters in the visible text', () => {
    const ref: ResourceRef = {
      kind: 'external',
      target: 'https://example.org',
      label: 'Rot & Ruin < > "end"',
    };
    const markup = buildRefMarkup(ref, ref.label);
    expect(markup).toBe('<ref target="https://example.org">Rot &amp; Ruin &lt; &gt; "end"</ref>');
    expect(parseRefMarkup(markup)?.label).toBe('Rot & Ruin < > "end"');
  });
});

// ── key ↔ target derivation matches the renderer exactly ──────────────────

describe('targetForKey matches lib/tei-msdesc-render resolveRefKeyHref', () => {
  const keys = [
    'person_42',
    'person_100184667',
    'work_790', // deferred authority — no client route
    'place_5', // no Place model — @target-only
    'person_', // malformed
    'garbage',
    ' person_7 ', // trimmed by both
  ];
  for (const key of keys) {
    it(`derives the same href for "${key}"`, () => {
      expect(targetForKey(key)).toBe(resolveRefKeyHref(key));
    });
  }

  it('resolves a person key to the scribe detail route', () => {
    expect(targetForKey('person_42')).toBe('/scribes/42');
  });

  it('keyForResource derives person_{id} and preserves tolerated keys', () => {
    expect(keyForResource({ kind: 'person', id: 42, target: '/scribes/42', label: 'x' })).toBe(
      'person_42'
    );
    expect(
      keyForResource({ kind: 'person', key: 'person_9', target: '/scribes/9', label: 'x' })
    ).toBe('person_9');
    expect(keyForResource({ kind: 'place', target: '/search/?q=a', label: 'x' })).toBeUndefined();
    expect(
      keyForResource({ kind: 'external', key: 'work_790', target: '/publications/790', label: 'x' })
    ).toBe('work_790');
  });
});

// ── ODD-native @key stamp / unstamp on phrase leaves (3.2 pure core) ──────

describe('stampKeyOnElement / unstampKey', () => {
  const leaves = [
    '<author>Augustine of Hippo</author>',
    '<title>De Civitate Dei</title>',
    '<country>Scotland</country>',
    '<settlement>Kelso</settlement>',
  ];

  for (const leaf of leaves) {
    it(`stamps and unstamps ${leaf.slice(1, leaf.indexOf('>'))} without introducing a <p>`, () => {
      const stamped = stampKeyOnElement(leaf, { key: 'person_42', target: '/scribes/42' });
      expect(stamped).not.toBeNull();
      expect(stamped).not.toMatch(/<p\b/);
      expect(stamped).toContain('key="person_42"');
      expect(stamped).toContain('target="/scribes/42"');
      // Inner text is preserved byte-exact.
      const inner = leaf.slice(leaf.indexOf('>') + 1, leaf.lastIndexOf('<'));
      expect(stamped).toContain(`>${inner}</`);
      // unstamp is the exact inverse.
      expect(unstampKey(stamped!)).toBe(leaf);
    });
  }

  it('preserves inner markup and entities byte-exact', () => {
    const leaf = '<title>1&#8211;10 &amp; on <hi rend="italic">De</hi></title>';
    const stamped = stampKeyOnElement(leaf, { key: 'work_790' });
    expect(stamped).toBe(
      '<title key="work_790">1&#8211;10 &amp; on <hi rend="italic">De</hi></title>'
    );
    expect(unstampKey(stamped!)).toBe(leaf);
  });

  it('preserves other attributes and their order, stamping key/target at the end', () => {
    const leaf = '<author xml:id="a1">Bede</author>';
    const stamped = stampKeyOnElement(leaf, { key: 'person_7', target: '/scribes/7' });
    expect(stamped).toBe('<author xml:id="a1" key="person_7" target="/scribes/7">Bede</author>');
    expect(unstampKey(stamped!)).toBe(leaf);
  });

  it('replaces an existing key rather than duplicating it', () => {
    const leaf = '<author key="person_1">Bede</author>';
    const stamped = stampKeyOnElement(leaf, { key: 'person_2', target: '/scribes/2' });
    expect(stamped).toBe('<author key="person_2" target="/scribes/2">Bede</author>');
    expect((stamped!.match(/key=/g) ?? []).length).toBe(1);
  });

  it('stamps @key only when no target is supplied (form MsKeyedText path)', () => {
    const stamped = stampKeyOnElement('<author>Augustine</author>', { key: 'person_42' });
    expect(stamped).toBe('<author key="person_42">Augustine</author>');
  });

  it('escapes special characters in stamped attribute values', () => {
    const stamped = stampKeyOnElement('<settlement>Perth</settlement>', {
      target: '/search/?q="a"&b',
    });
    expect(stamped).toBe('<settlement target="/search/?q=&quot;a&quot;&amp;b">Perth</settlement>');
  });

  it('refuses to stamp an unsafe target', () => {
    expect(
      stampKeyOnElement('<author>x</author>', { key: 'person_1', target: 'javascript:alert(1)' })
    ).toBeNull();
  });

  it('returns null on a malformed leaf', () => {
    expect(stampKeyOnElement('not xml', { key: 'person_1' })).toBeNull();
    expect(unstampKey('<author>oops')).toBeNull();
  });

  it('leaves an unrelated @target alone when only a @key is stamped', () => {
    // `undefined` means "leave it as it is" — a caller stamping a key must not
    // silently destroy a target it never asked about.
    // The existing @target keeps its source position; the new @key is appended.
    expect(stampKeyOnElement('<author target="/keepme">A</author>', { key: 'person_8' })).toBe(
      '<author target="/keepme" key="person_8">A</author>'
    );
  });

  it('removes an attribute only when explicitly passed null', () => {
    const leaf = '<author key="person_1" target="/scribes/1">A</author>';
    expect(stampKeyOnElement(leaf, { target: null })).toBe('<author key="person_1">A</author>');
    expect(stampKeyOnElement(leaf, { key: null })).toBe('<author target="/scribes/1">A</author>');
    expect(unstampKey(leaf)).toBe('<author>A</author>');
  });

  it('rewrites key/target in their source position rather than reordering', () => {
    const leaf = '<settlement key="person_1" xml:id="s1" target="/scribes/1">Kelso</settlement>';
    expect(stampKeyOnElement(leaf, { key: 'person_2', target: '/scribes/2' })).toBe(
      '<settlement key="person_2" xml:id="s1" target="/scribes/2">Kelso</settlement>'
    );
  });

  it('normalizes attribute VALUE spelling, not just the stamped ones', () => {
    // Documented, deliberate: values are re-emitted through the canonical
    // escaper, so entity spelling and quote style are normalized. Semantics are
    // preserved; the bytes are not.
    expect(stampKeyOnElement(`<author role="O&apos;Brien">A</author>`, { key: 'person_1' })).toBe(
      '<author role="O&#x27;Brien" key="person_1">A</author>'
    );
    expect(stampKeyOnElement(`<author role='single'>A</author>`, { key: 'person_1' })).toBe(
      '<author role="single" key="person_1">A</author>'
    );
  });

  it('keeps a self-closing leaf self-closing', () => {
    expect(stampKeyOnElement('<origPlace/>', { key: 'person_3' })).toBe(
      '<origPlace key="person_3"/>'
    );
  });
});

describe('image refs (docs/tei.md §4.5)', () => {
  const IMAGE = '<ref type="image" target="/manuscripts/228/images/1581">Cotton, f. 1r</ref>';

  it('round-trips the type rather than dropping it into the external bucket', () => {
    const parsed = parseRefMarkup(IMAGE);
    expect(parsed?.kind).toBe('image');
    expect(buildRefMarkup(parsed!, 'Cotton, f. 1r')).toBe(IMAGE);
  });

  it('derives the IMAGE id, not the part id', () => {
    // The manuscript regex ends in \b, so /manuscripts/228/images/1581 matches
    // it too — an image ref must not report 228.
    expect(parseRefMarkup(IMAGE)?.id).toBe('1581');
  });

  it('still derives the part id for a plain manuscript ref', () => {
    const ms = '<ref type="manuscript" target="/manuscripts/228">Cotton</ref>';
    expect(parseRefMarkup(ms)?.id).toBe('228');
  });

  it('carries no @key — two ids cannot fit in one', () => {
    expect(
      buildRefMarkup({ kind: 'image', target: '/manuscripts/1/images/2', label: 'x' }, 'x')
    ).not.toContain('key=');
  });
});
