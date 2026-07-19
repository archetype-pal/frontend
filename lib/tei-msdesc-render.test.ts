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
