import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { sanitizeHtml } from '@/lib/sanitize-html';
import { renderMsDescArea, resolveRefKeyHref, sanitizeRefHref } from '@/lib/tei-msdesc-render';

// English catalogue lookup — doubles as a guard that every label key the
// renderer resolves actually exists in messages/en.json (missing keys fall
// back to the raw dotted key, which the assertions below would surface).
const messagesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'messages');
const enBackoffice = (
  JSON.parse(readFileSync(join(messagesDir, 'en.json'), 'utf8')) as {
    backoffice: Record<string, unknown>;
  }
).backoffice;

const tEn = (key: string): string => {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      enBackoffice
    );
  return typeof value === 'string' ? value : key;
};

function render(area: Parameters<typeof renderMsDescArea>[0], fragment: string, t = tEn) {
  const host = document.createElement('div');
  host.innerHTML = renderMsDescArea(area, fragment, { t });
  return host;
}

/** All `.msdesc-field` rows as `[label, value]` pairs (labels keep the trailing colon stripped). */
function fieldRows(root: HTMLElement): Array<[string, string]> {
  return Array.from(root.querySelectorAll('.msdesc-field')).map((row) => {
    const label = row.querySelector('.msdesc-field-label')?.textContent?.replace(/:$/, '') ?? '';
    const value = row.querySelector('.msdesc-field-value')?.textContent?.trim() ?? '';
    return [label, value];
  });
}

function fieldValue(root: HTMLElement, label: string): string | undefined {
  return fieldRows(root).find(([rowLabel]) => rowLabel === label)?.[1];
}

// The PO's structured-display example (findings §3): the template physDesc
// skeleton filled with real values.
const PHYS_DESC = `<physDesc>
  <objectDesc form="codex">
    <supportDesc material="perg">
      <support><material>Parchment</material></support>
      <extent>
        <measure type="laterEndleaf">i</measure>
        <measure type="endleaf">1</measure>
        <measure type="leaf" quantity="228">228 (231)</measure>
        <measure type="endleaf">2</measure>
        <measure type="laterEndleaf">i fol.</measure>
        <dimensions type="leaf" unit="mm"><height>103</height><width>75</width></dimensions>
        <dimensions type="written" unit="mm"><height>80</height><width>55</width></dimensions>
      </extent>
      <foliation>Modern pencil foliation.</foliation>
      <collation><p>1&#8211;10<hi rend="superscript">8</hi> (fols. 1&#8211;80)</p></collation>
      <condition>Wear &amp; tear on the first quire.</condition>
    </supportDesc>
    <layoutDesc>
      <layout columns="1" writtenLines="15" rulingMedium="leadpoint" topLine="above">
        <p>Ruled in leadpoint.</p>
      </layout>
    </layoutDesc>
  </objectDesc>
  <handDesc hands="1">
    <handNote script="textualisNorthern" execution="formata" scope="sole">
      <p>Written in a fine gothic hand.</p>
    </handNote>
  </handDesc>
  <decoDesc>
    <decoNote type="flourInit"><p>Flourished initials in red and blue.</p></decoNote>
  </decoDesc>
</physDesc>`;

describe('renderMsDescArea — the PO physDesc example', () => {
  it('renders the structured field rows with glossed vocabulary values', () => {
    const root = render('physDesc', PHYS_DESC);
    expect(root.querySelector('h4.msdesc-heading')?.textContent).toBe('Physical description');
    expect(fieldValue(root, 'Form')).toBe('Codex (bound book)');
    expect(fieldValue(root, 'Support')).toBe('Parchment (vellum)');
    expect(fieldValue(root, 'Material')).toBe('Parchment');
    expect(fieldValue(root, 'Script')).toBe('Gothic textualis (Northern)');
    expect(fieldValue(root, 'Execution')).toBe('Formata (formal book hand)');
    expect(fieldValue(root, 'Scope')).toBe('sole');
    expect(fieldValue(root, 'Type')).toBe('Flourished (penwork) initial');
    expect(fieldValue(root, 'Columns')).toBe('1');
    expect(fieldValue(root, 'Written lines')).toBe('15');
    expect(fieldValue(root, 'Ruling medium')).toBe('Leadpoint');
    expect(fieldValue(root, 'Foliation')).toBe('Modern pencil foliation.');
    expect(fieldValue(root, 'Condition')).toBe('Wear & tear on the first quire.');
  });

  it('renders section headings per container', () => {
    const root = render('physDesc', PHYS_DESC);
    const headings = Array.from(root.querySelectorAll('h5.msdesc-heading')).map(
      (el) => el.textContent
    );
    expect(headings).toEqual(['Layout', 'Hands', 'Decoration']);
  });

  it('renders prose leaves as paragraphs (with hi/@rend mapped to semantic tags)', () => {
    const root = render('physDesc', PHYS_DESC);
    const paragraphs = Array.from(root.querySelectorAll('p')).map((p) => p.textContent?.trim());
    expect(paragraphs).toContain('Ruled in leadpoint.');
    expect(paragraphs).toContain('Written in a fine gothic hand.');
    expect(paragraphs).toContain('Flourished initials in red and blue.');
    // Collation formula keeps its superscript quire number.
    const sup = root.querySelector('.msdesc-field-block sup');
    expect(sup?.textContent).toBe('8');
    expect(root.textContent).toContain('1–108 (fols. 1–80)');
  });

  it('falls back to the label key last segment and canonical values without t', () => {
    const host = document.createElement('div');
    host.innerHTML = renderMsDescArea('physDesc', PHYS_DESC);
    expect(fieldValue(host, 'form')).toBe('codex');
    expect(fieldValue(host, 'support')).toBe('perg');
    expect(host.querySelector('h4.msdesc-heading')?.textContent).toBe('physDesc');
  });
});

describe('renderMsDescArea — seals', () => {
  it('renders a sealDesc as a section with one heading per seal', () => {
    const root = render(
      'physDesc',
      '<physDesc><sealDesc>' +
        '<seal n="1" type="greatSeal" contemporary="true">' +
        '<material>green wax</material><condition>fragment</condition>' +
        '<p>Appended on a parchment tag.</p></seal>' +
        '<seal n="2" type="counterseal"><material>green wax</material></seal>' +
        '</sealDesc></physDesc>'
    );
    const headings = Array.from(root.querySelectorAll('.msdesc-heading')).map((h) => h.textContent);
    expect(headings).toEqual(['Physical description', 'Seals', 'Seal 1', 'Seal 2']);
    const rows = fieldRows(root);
    expect(rows).toContainEqual(['Type', 'Great seal']);
    expect(rows).toContainEqual(['Contemporary', 'true']);
    expect(rows).toContainEqual(['Material', 'green wax']);
    expect(rows).toContainEqual(['Condition', 'fragment']);
    expect(root.textContent).toContain('Appended on a parchment tag.');
  });

  it('suppresses an empty seeded sealDesc', () => {
    const root = render('physDesc', '<physDesc><sealDesc><seal/></sealDesc></physDesc>');
    expect(root.textContent?.trim()).toBe('');
  });
});

describe('renderMsDescArea — dimensions and measure formatting', () => {
  it('formats dimensions as "height × width unit" with the type in the label', () => {
    const root = render('physDesc', PHYS_DESC);
    expect(fieldValue(root, 'Dimensions (leaf)')).toBe('103 × 75 mm');
    expect(fieldValue(root, 'Dimensions (written)')).toBe('80 × 55 mm');
  });

  it('joins measure sequences with " + "', () => {
    const root = render('physDesc', PHYS_DESC);
    expect(fieldValue(root, 'Extent')).toBe('i + 1 + 228 (231) + 2 + i fol.');
  });

  it('includes depth and tolerates missing unit/type', () => {
    const root = render(
      'physDesc',
      '<physDesc><objectDesc><supportDesc><extent><dimensions><height>10</height><width>20</width><depth>3</depth></dimensions></extent></supportDesc></objectDesc></physDesc>'
    );
    expect(fieldValue(root, 'Dimensions')).toBe('10 × 20 × 3');
  });

  it('uses @quantity when a measure has no text', () => {
    const root = render(
      'physDesc',
      '<physDesc><objectDesc><supportDesc><extent><measure type="leaf" quantity="231"/></extent></supportDesc></objectDesc></physDesc>'
    );
    expect(fieldValue(root, 'Extent')).toBe('231');
  });
});

describe('renderMsDescArea — msIdentifier / msContents / history', () => {
  it('renders msIdentifier as field rows with idno/@type-specific labels', () => {
    const root = render(
      'msIdentifier',
      `<msIdentifier>
        <country>United Kingdom</country>
        <settlement>Oxford</settlement>
        <repository>Bodleian Library</repository>
        <idno type="shelfmark">MS. Bodl. 264</idno>
        <idno type="prizePapers">XYZ-1</idno>
      </msIdentifier>`
    );
    expect(fieldValue(root, 'Country')).toBe('United Kingdom');
    expect(fieldValue(root, 'Settlement')).toBe('Oxford');
    expect(fieldValue(root, 'Repository')).toBe('Bodleian Library');
    expect(fieldValue(root, 'Shelfmark')).toBe('MS. Bodl. 264');
    // Unknown idno types keep the generic Identifier label.
    expect(fieldValue(root, 'Identifier')).toBe('XYZ-1');
  });

  it('renders msContents items with headings, entity anchors and prose notes', () => {
    const root = render(
      'msContents',
      `<msContents>
        <summary>A book of hours.</summary>
        <msItem n="1">
          <locus from="1r" to="12v">Fols. 1r&#8211;12v</locus>
          <author key="person_12">GERALD OF WALES</author>
          <title key="work_790">Topographia Hibernica</title>
          <note><p>Imperfect at the end.</p></note>
        </msItem>
      </msContents>`
    );
    expect(root.querySelector('h5.msdesc-heading')?.textContent).toBe('Item 1');
    expect(fieldValue(root, 'Summary')).toBe('A book of hours.');
    expect(fieldValue(root, 'Locus')).toBe('Fols. 1r–12v');
    const author = root.querySelector('a.tei-el-author');
    expect(author?.getAttribute('href')).toBe('/scribes/12');
    expect(author?.textContent).toBe('GERALD OF WALES');
    // work_ keys are not client-resolvable — plain span + tooltip, no anchor.
    const title = root.querySelector('.tei-el-title');
    expect(title?.tagName).toBe('SPAN');
    expect(title?.getAttribute('title')).toBe('Unresolved reference');
    const note = Array.from(root.querySelectorAll('p')).map((p) => p.textContent?.trim());
    expect(note).toContain('Imperfect at the end.');
  });

  it('renders history origin fields and provenance prose with inline entities', () => {
    const root = render(
      'history',
      `<history>
        <origin>
          <origDate calendar="#Gregorian" notBefore="1400" notAfter="1500">
            15th century
          </origDate>
          <origPlace><country key="place_7">England</country></origPlace>
        </origin>
        <provenance notAfter="1500">
          <p>Owned by <persName key="person_42" role="fmo">William Scott</persName>.</p>
        </provenance>
      </history>`
    );
    expect(root.querySelector('h5.msdesc-heading')?.textContent).toBe('Origin');
    expect(fieldValue(root, 'Date')).toBe('15th century');
    expect(fieldValue(root, 'Place')).toBe('England');
    // place_ keys have no route — unresolved span inside the Place row.
    const place = root.querySelector('.tei-el-country');
    expect(place?.tagName).toBe('SPAN');
    expect(place?.getAttribute('title')).toBe('Unresolved reference');
    // Provenance renders as a labelled prose block with a person anchor.
    const person = root.querySelector('a.tei-el-persName');
    expect(person?.getAttribute('href')).toBe('/scribes/42');
    expect(person?.classList.contains('tei-el')).toBe(true);
    expect(person?.getAttribute('data-tei-label')).toBe('persName');
  });

  it('renders provenance and acquisition dating attributes as Date rows', () => {
    const root = render(
      'history',
      '<history>' +
        '<provenance notAfter="1250"><p>In the abbey treasury.</p></provenance>' +
        '<acquisition when="1900"><p>Purchased at auction.</p></acquisition>' +
        '</history>'
    );
    const dates = fieldRows(root)
      .filter(([label]) => label === 'Date')
      .map(([, value]) => value);
    expect(dates).toEqual(['–1250', '1900']);
    // The prose still renders alongside the date, not instead of it.
    expect(root.textContent).toContain('In the abbey treasury.');
    expect(root.textContent).toContain('Purchased at auction.');
  });

  it('uses the date as the value for an attribute-only acquisition', () => {
    const root = render('history', '<history><acquisition when="1900"/></history>');
    expect(fieldValue(root, 'Acquisition')).toBe('1900');
  });

  it('still suppresses a seeded provenance carrying neither prose nor a date', () => {
    const root = render('history', '<history><provenance><p/></provenance></history>');
    expect(root.textContent?.trim()).toBe('');
  });

  it('derives an origDate value from dating attributes when it has no text', () => {
    const root = render(
      'history',
      '<history><origin><origDate notBefore="1400" notAfter="1500"/></origin></history>'
    );
    expect(fieldValue(root, 'Date')).toBe('1400–1500');
  });
});

describe('renderMsDescArea — ref/@key anchors (roadmap 4.4)', () => {
  const inProvenance = (inline: string) =>
    `<history><provenance><p>${inline}</p></provenance></history>`;

  it('uses @target verbatim (external links open in a new tab)', () => {
    const root = render(
      'history',
      inProvenance('<ref target="https://example.org/x?a=1&amp;b=2">CPL 313</ref>')
    );
    const a = root.querySelector('a.tei-el-ref');
    expect(a?.getAttribute('href')).toBe('https://example.org/x?a=1&b=2');
    expect(a?.getAttribute('target')).toBe('_blank');
    expect(a?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(a?.textContent).toBe('CPL 313');
  });

  it('keeps relative @target paths as same-tab links', () => {
    const root = render('history', inProvenance('<ref target="/manuscripts/5">the charter</ref>'));
    const a = root.querySelector('a.tei-el-ref');
    expect(a?.getAttribute('href')).toBe('/manuscripts/5');
    expect(a?.hasAttribute('target')).toBe(false);
    expect(a?.hasAttribute('rel')).toBe(false);
  });

  it('falls back from a person_ key to the scribe route when @target is absent', () => {
    const root = render(
      'history',
      inProvenance('<ref type="person" key="person_42">W. Scott</ref>')
    );
    expect(root.querySelector('a.tei-el-ref')?.getAttribute('href')).toBe('/scribes/42');
  });

  it('renders unresolvable refs as tooltip spans, not anchors', () => {
    const root = render('history', inProvenance('<ref key="work_790">Some work</ref>'));
    expect(root.querySelector('a')).toBeNull();
    const span = root.querySelector('.tei-el-ref');
    expect(span?.tagName).toBe('SPAN');
    expect(span?.getAttribute('title')).toBe('Unresolved reference');
    expect(span?.textContent).toBe('Some work');
  });

  it('uses the raw key as the default tooltip-key fallback without t', () => {
    const host = document.createElement('div');
    host.innerHTML = renderMsDescArea('history', inProvenance('<ref key="work_790">W</ref>'));
    expect(host.querySelector('.tei-el-ref')?.getAttribute('title')).toBe('unresolvedRef');
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox',
    '//evil.example.com/x',
  ])('refuses unsafe @target %s', (target) => {
    const root = render(
      'history',
      inProvenance(`<ref target="${target.replace(/</g, '&lt;')}">x</ref>`)
    );
    expect(root.querySelector('a')).toBeNull();
    const span = root.querySelector('.tei-el-ref');
    expect(span?.tagName).toBe('SPAN');
    expect(span?.textContent).toBe('x');
  });
});

describe('resolveRefKeyHref / sanitizeRefHref', () => {
  it('maps person_{id} to the scribe route and nothing else', () => {
    expect(resolveRefKeyHref('person_42')).toBe('/scribes/42');
    expect(resolveRefKeyHref(' person_7 ')).toBe('/scribes/7');
    expect(resolveRefKeyHref('work_790')).toBeNull();
    expect(resolveRefKeyHref('place_3')).toBeNull();
    expect(resolveRefKeyHref('person_abc')).toBeNull();
    expect(resolveRefKeyHref('person_')).toBeNull();
  });

  it('accepts only http(s) and site-relative hrefs', () => {
    expect(sanitizeRefHref('https://example.org/a')).toBe('https://example.org/a');
    expect(sanitizeRefHref('http://example.org')).toBe('http://example.org');
    expect(sanitizeRefHref('/scribes/1')).toBe('/scribes/1');
    expect(sanitizeRefHref('#fn1')).toBe('#fn1');
    expect(sanitizeRefHref('javascript:alert(1)')).toBeNull();
    expect(sanitizeRefHref('data:text/html,x')).toBeNull();
    expect(sanitizeRefHref('//evil.example.com')).toBeNull();
    expect(sanitizeRefHref('mailto:a@b.c')).toBeNull();
    expect(sanitizeRefHref('')).toBeNull();
  });

  it('refuses every backslash spelling of a cross-origin authority', () => {
    // The WHATWG URL parser folds `\` into `/` after a leading slash and strips
    // C0 whitespace, so these all resolve off-origin exactly like `//host`.
    // Because they do not match /^https?:/, renderLinkEl would also omit
    // rel="noopener" — a same-tab navigation from what reads as an internal link.
    for (const hostile of ['/\\evil.example', '/\\\\evil.example', '/\\/evil.example']) {
      expect(new URL(hostile, 'https://archetype.example/backoffice/x').origin).toBe(
        'https://evil.example'
      );
      expect(sanitizeRefHref(hostile)).toBeNull();
    }
    expect(sanitizeRefHref('\\\\evil.example')).toBeNull();
    expect(sanitizeRefHref('/\t/evil.example')).toBeNull();
    // Legitimate site-relative paths are unaffected, including ones that
    // contain a backslash further in.
    expect(sanitizeRefHref('/search/manuscripts?keyword=a\\b')).toBe(
      '/search/manuscripts?keyword=a\\b'
    );
    expect(sanitizeRefHref('/scribes/1?a=1&b=2#frag')).toBe('/scribes/1?a=1&b=2#frag');
  });
});

describe('renderMsDescArea — nested link-bearing elements (no nested <a>)', () => {
  it('degrades an inner ref to a span so the outer link keeps all its text', () => {
    // Reachable from hand-authored Source TEI. Nested <a> is invalid HTML: the
    // browser closes the outer anchor at the inner start tag, so the outer
    // link's tail escapes it entirely.
    const root = render(
      'history',
      '<history><provenance><p>' +
        '<ref type="person" key="person_1" target="/scribes/1">J' +
        '<ref type="person" key="person_2" target="/scribes/2">oh</ref>n</ref>' +
        '</p></provenance></history>'
    );
    const anchors = root.querySelectorAll('a');
    expect(anchors.length).toBe(1);
    expect(anchors[0].getAttribute('href')).toBe('/scribes/1');
    // Every character stays inside the one anchor.
    expect(anchors[0].textContent).toBe('John');
    // The inner ref keeps its entity styling but emits no anchor.
    const inner = anchors[0].querySelector('span.tei-el-ref');
    expect(inner?.textContent).toBe('oh');
    expect(inner?.classList.contains('msdesc-unresolved')).toBe(false);
  });

  it('degrades a link-bearing entity nested inside a linked field row', () => {
    const root = render(
      'history',
      '<history><origin><origPlace><settlement key="person_42">Kelso ' +
        '<ref target="/manuscripts/5">MS 5</ref></settlement></origPlace></origin></history>'
    );
    const anchors = root.querySelectorAll('a');
    expect(anchors.length).toBe(1);
    expect(anchors[0].getAttribute('href')).toBe('/scribes/42');
    expect(anchors[0].textContent).toContain('MS 5');
  });

  it('still renders sibling (non-nested) refs as separate anchors', () => {
    const root = render(
      'history',
      '<history><provenance><p><ref target="/scribes/1">A</ref> and ' +
        '<ref target="/scribes/2">B</ref></p></provenance></history>'
    );
    expect(root.querySelectorAll('a').length).toBe(2);
  });
});

describe('renderMsDescArea — robustness (never throws, never drops text)', () => {
  it('renders unknown elements as generic labelled rows keeping all text', () => {
    const root = render(
      'physDesc',
      '<physDesc><frobnicate zork="1"><weird>alpha</weird> beta</frobnicate></physDesc>'
    );
    const row = root.querySelector('.msdesc-field-unknown');
    expect(row?.querySelector('.msdesc-field-label')?.textContent).toBe('frobnicate:');
    expect(row?.querySelector('.msdesc-field-value')?.textContent?.trim()).toBe('alpha beta');
    // Nested unknown inline markup keeps the tei-el hook convention.
    expect(row?.querySelector('span.tei-el.tei-el-weird')?.textContent).toBe('alpha');
  });

  it('renders unknown containers holding prose as labelled blocks', () => {
    const root = render(
      'history',
      '<history><mystery><p>First.</p><p>Second.</p></mystery></history>'
    );
    const block = root.querySelector('.msdesc-field-block.msdesc-field-unknown');
    expect(block?.querySelector('.msdesc-field-label')?.textContent).toBe('mystery:');
    expect(Array.from(block?.querySelectorAll('p') ?? []).map((p) => p.textContent)).toEqual([
      'First.',
      'Second.',
    ]);
  });

  it('does not throw on malformed input and keeps its text', () => {
    let html = '';
    expect(() => {
      html = renderMsDescArea('physDesc', '<physDesc><condition>text <unclosed'); // truncated tag
    }).not.toThrow();
    expect(html).toContain('text');
    expect(() => renderMsDescArea('physDesc', 'garbage < not xml > &weird;')).not.toThrow();
  });

  it('returns the empty string for empty or whitespace-only fragments', () => {
    expect(renderMsDescArea('physDesc', '')).toBe('');
    expect(renderMsDescArea('physDesc', '  \n  ')).toBe('');
  });

  it('strips comments and processing instructions without leaking their text', () => {
    const root = render(
      'physDesc',
      '<physDesc><!-- secret comment --><?pi target?><condition>Good.</condition></physDesc>'
    );
    expect(root.textContent).not.toContain('secret comment');
    expect(fieldValue(root, 'Condition')).toBe('Good.');
  });

  it('renders headless fragments under the area wrapper', () => {
    const root = render('physDesc', '<condition>Good.</condition>');
    expect(root.querySelector('h4.msdesc-heading')?.textContent).toBe('Physical description');
    expect(fieldValue(root, 'Condition')).toBe('Good.');
  });
});

describe('renderMsDescArea — sanitize-allowlist safety', () => {
  // Mirrors DEFAULT_TAGS / DEFAULT_ATTR in lib/sanitize-html.ts (the consumer
  // pipeline is sanitizeHtml(rendered, { allowDataAttr: true })).
  const ALLOWED_TAGS = new Set(
    'h1 h2 h3 h4 h5 h6 p br hr ul ol li blockquote pre code strong b em i u s del mark sub sup a img table thead tbody tr th td div span'.split(
      ' '
    )
  );
  const ALLOWED_ATTR = new Set(
    'href target rel title src alt width height class id colspan rowspan'.split(' ')
  );

  const AREA_FRAGMENTS: Array<[Parameters<typeof renderMsDescArea>[0], string]> = [
    ['physDesc', PHYS_DESC],
    [
      'msIdentifier',
      '<msIdentifier><country>UK</country><idno type="shelfmark">MS 1</idno><altIdentifier type="former"><idno>OLD 2</idno></altIdentifier></msIdentifier>',
    ],
    [
      'msContents',
      '<msContents><summary>S.</summary><msItem n="1"><author key="person_1">A</author><title key="work_2">T</title><note><p>N <ref target="https://example.org">R</ref></p></note></msItem></msContents>',
    ],
    [
      'history',
      '<history><origin><origDate when="1450">1450</origDate><origPlace><settlement key="place_9">York</settlement></origPlace></origin><provenance><p>P <persName key="person_3">X</persName></p></provenance><acquisition when="1600"><p>A.</p></acquisition></history>',
    ],
  ];

  it.each(AREA_FRAGMENTS)('emits only allowlisted tags/attributes for %s', (area, fragment) => {
    const root = render(area, fragment);
    for (const el of Array.from(root.querySelectorAll('*'))) {
      expect(ALLOWED_TAGS.has(el.tagName.toLowerCase())).toBe(true);
      for (const attr of Array.from(el.attributes)) {
        const allowed = ALLOWED_ATTR.has(attr.name) || attr.name.startsWith('data-');
        expect(allowed, `attribute ${attr.name} on <${el.tagName.toLowerCase()}>`).toBe(true);
      }
    }
  });

  it.each(AREA_FRAGMENTS)('survives sanitizeHtml with no text loss for %s', (area, fragment) => {
    const rendered = renderMsDescArea(area, fragment, { t: tEn });
    const sanitized = sanitizeHtml(rendered, { allowDataAttr: true });
    const before = document.createElement('div');
    before.innerHTML = rendered;
    const after = document.createElement('div');
    after.innerHTML = sanitized;
    expect(after.textContent).toBe(before.textContent);
    expect(after.querySelectorAll('*').length).toBe(before.querySelectorAll('*').length);
  });
});

describe('pathological nesting (depth cap)', () => {
  it('renders 10,000-deep nesting without throwing and keeps the text', () => {
    const deep = '<seg>'.repeat(10_000) + 'deep text' + '</seg>'.repeat(10_000);
    const html = renderMsDescArea('physDesc', `<physDesc>${deep}</physDesc>`);
    expect(html).toContain('deep text');
  });

  it('caps inline nesting inside a paragraph without throwing', () => {
    const deep = '<hi rend="italic">'.repeat(10_000) + 'x' + '</hi>'.repeat(10_000);
    const html = renderMsDescArea(
      'history',
      `<history><provenance><p>${deep}</p></provenance></history>`
    );
    expect(html).toContain('x');
  });
});

describe('renderMsDescArea — heading levels', () => {
  const FRAGMENT =
    '<physDesc><objectDesc form="codex"/><handDesc><handNote><p>One hand.</p></handNote></handDesc></physDesc>';

  const levels = (html: string): number[] => {
    const host = document.createElement('div');
    host.innerHTML = html;
    return Array.from(host.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((el) =>
      Number(el.tagName.slice(1))
    );
  };

  it('defaults to h4 area titles and h5 groups (the backoffice preview)', () => {
    expect(levels(renderMsDescArea('physDesc', FRAGMENT, { t: tEn }))).toEqual([4, 5]);
  });

  it('shifts groups with the area when a consumer sets headingLevel', () => {
    // The public page heads its section with an <h2>, so it asks for h3/h4.
    expect(levels(renderMsDescArea('physDesc', FRAGMENT, { t: tEn, headingLevel: 3 }))).toEqual([
      3, 4,
    ]);
    expect(levels(renderMsDescArea('physDesc', FRAGMENT, { t: tEn, headingLevel: 2 }))).toEqual([
      2, 3,
    ]);
  });

  it('restores the default level after a render, so calls cannot bleed into each other', () => {
    renderMsDescArea('physDesc', FRAGMENT, { t: tEn, headingLevel: 2 });
    expect(levels(renderMsDescArea('physDesc', FRAGMENT, { t: tEn }))).toEqual([4, 5]);
  });

  it('never emits past h6', () => {
    expect(levels(renderMsDescArea('physDesc', FRAGMENT, { t: tEn, headingLevel: 5 }))).toEqual([
      5, 6,
    ]);
  });
});

describe('multi-element field values', () => {
  const origin = (inner: string) =>
    `<history><origin><origPlace>${inner}</origPlace></origin></history>`;

  it('comma-joins sibling elements that have no whitespace between them', () => {
    const host = render(
      'history',
      origin('<country>Scotland</country><settlement>Kelso</settlement>')
    );
    expect(host.textContent).toContain('Scotland, Kelso');
    expect(host.textContent).not.toContain('ScotlandKelso');
  });

  it('leaves a single-element field untouched', () => {
    const host = render('history', origin('<country>Scotland</country>'));
    expect(host.textContent).toContain('Scotland');
    expect(host.textContent).not.toContain('Scotland,');
  });

  it('keeps authored spacing when the source is pretty-printed', () => {
    const host = render(
      'history',
      origin('<country>Scotland</country>\n  <settlement>Kelso</settlement>')
    );
    expect(host.textContent).toContain('Scotland');
    expect(host.textContent).toContain('Kelso');
    expect(host.textContent).not.toContain('ScotlandKelso');
  });
});

// The create-new flow seeds each area with an empty skeleton (roadmap 2.5), so
// an unfilled manuscript is full of `<collation><p/></collation>`-shaped nodes.
// Rendering those as bare labels leaks authoring scaffolding onto the public page.
describe('renderMsDescArea — empty skeleton nodes are not rendered', () => {
  const EMPTY_HISTORY = `<history>
  <origin>
    <origDate calendar="#Gregorian"/>
    <origPlace><country/></origPlace>
  </origin>
  <provenance><p/></provenance>
  <acquisition><p/></acquisition>
</history>`;

  it('drops block-shaped fields whose content is empty', () => {
    const root = render('history', EMPTY_HISTORY);
    const labels = fieldRows(root).map(([label]) => label);
    expect(labels).not.toContain('Provenance');
    expect(labels).not.toContain('Acquisition');
  });

  it('drops a link-bearing field with no text and nothing to click', () => {
    const root = render('history', EMPTY_HISTORY);
    expect(fieldRows(root).map(([label]) => label)).not.toContain('Place');
  });

  it('drops section headings with no content beneath them', () => {
    const root = render('physDesc', '<physDesc><additions/><bindingDesc/></physDesc>');
    expect(root.querySelector('.msdesc-section-additions')).toBeNull();
    expect(root.querySelector('.msdesc-section-bindingDesc')).toBeNull();
  });

  it('still renders a field once it has real content', () => {
    const root = render(
      'history',
      '<history><provenance><p>Given to the abbey.</p></provenance></history>'
    );
    expect(fieldValue(root, 'Provenance')).toBe('Given to the abbey.');
  });

  it('keeps an empty-text link that still has a resolvable target', () => {
    const root = render(
      'history',
      '<history><origin><origPlace target="https://example.org/kelso"/></origin></history>'
    );
    expect(root.querySelector('a[href="https://example.org/kelso"]')).not.toBeNull();
  });
});

describe('renderMsDescArea — an all-skeleton area renders nothing', () => {
  it('returns empty rather than a lone heading', () => {
    const html = renderMsDescArea(
      'history',
      '<history><origin><origPlace><country/></origPlace></origin><provenance><p/></provenance></history>',
      { t: tEn }
    );
    expect(html).toBe('');
  });
});
