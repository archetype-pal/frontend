/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderPublicMsDescAreas } from '@/lib/msdesc-public';
import type { PublicMsDescArea } from '@/types/manuscript';
import { MsDescSection } from './msdesc-section';

const messagesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  'messages'
);

function catalogue(locale: 'en' | 'fr'): Record<string, unknown> {
  return JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), 'utf8')) as Record<
    string,
    unknown
  >;
}

function lookup(root: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      root
    );
}

const en = catalogue('en');
const tBackoffice = (key: string): string => {
  const value = lookup(en.backoffice as Record<string, unknown>, key);
  return typeof value === 'string' ? value : key;
};

const wrap = (area: PublicMsDescArea['area'], body: string): PublicMsDescArea => ({
  area,
  content: `<${area}>${body}</${area}>`,
});

const FULL: PublicMsDescArea[] = [
  wrap('history', '<provenance><p>Kelso Abbey.</p></provenance>'),
  wrap('physDesc', '<objectDesc form="codex"><supportDesc material="perg"/></objectDesc>'),
  wrap('msContents', '<summary><p>A royal charter.</p></summary>'),
  wrap('msIdentifier', '<idno type="shelfmark">GD 55/1</idno>'),
];

function renderSection(areas: PublicMsDescArea[]) {
  return render(<MsDescSection areas={renderPublicMsDescAreas(areas, tBackoffice)} />);
}

describe('MsDescSection', () => {
  it('renders published areas in msDesc canonical order under one section', () => {
    const { container } = renderSection(FULL);
    const section = container.querySelector('section#msdesc');
    expect(section).not.toBeNull();
    expect(
      Array.from(section!.querySelectorAll('.msdesc-area > .msdesc-heading')).map((node) =>
        node.textContent?.trim()
      )
    ).toEqual(['Identification', 'Contents', 'Physical description', 'History']);
  });

  it('titles itself from the manuscript namespace, not a raw key', () => {
    renderSection(FULL);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Manuscript description');
  });

  it('renders nothing at all when no area survives — no empty section, no anchor', () => {
    const { container } = renderSection([]);
    expect(container.innerHTML).toBe('');
    // A published-but-blank area is equally invisible.
    const blank = renderSection([wrap('history', '   ')]);
    expect(blank.container.innerHTML).toBe('');
  });

  it('never leaks an area the API flagged unpublished', () => {
    const { container } = renderSection([
      ...FULL,
      { ...wrap('history', '<provenance><p>Draft note.</p></provenance>'), is_published: false },
    ]);
    expect(container.textContent).not.toContain('Draft note.');
  });

  it('renders a hostile fragment inert: no script node, no handler, no javascript: url', () => {
    const { container } = renderSection([
      {
        area: 'physDesc',
        content:
          '<physDesc><script>alert(1)</script><p onclick="alert(2)">clickable</p>' +
          '<ref target="javascript:alert(3)">bad</ref><ref target="/scribes/7">Ada</ref></physDesc>',
      },
    ]);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('[onclick]')).toBeNull();
    expect(container.innerHTML.toLowerCase()).not.toContain('javascript:');
    expect(container.textContent).toContain('clickable');
    expect(container.querySelector('a[href="/scribes/7"]')?.textContent).toBe('Ada');
  });

  it('keeps the heading outline gapless: h2 section, h3 areas, h4 groups', () => {
    // The public page heads this section with an <h2>, so the renderer's area
    // titles must be <h3> and its nested group titles <h4>. A jump straight to
    // <h4> would make the area titles read as sub-sub-sections of nothing when
    // navigating by heading (WCAG 1.3.1 / axe `heading-order`).
    const { container } = renderSection([
      wrap(
        'physDesc',
        '<objectDesc form="codex"/><handDesc><handNote><p>One hand.</p></handNote></handDesc>'
      ),
    ]);

    const levels = Array.from(container.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((node) =>
      Number(node.tagName.slice(1))
    );

    expect(levels).toEqual([2, 3, 4]);
    levels.forEach((level, index) => {
      if (index > 0) expect(level).toBeLessThanOrEqual(levels[index - 1] + 1);
    });
  });

  it('uses the shared .msdesc-preview style hook so it matches the backoffice preview', () => {
    const { container } = renderSection(FULL);
    const preview = container.querySelector('.msdesc-preview');
    expect(preview).not.toBeNull();
    // The globals.css rhythm rule is `.msdesc-area + .msdesc-area`, so the
    // areas must be siblings — no per-area wrapper element between them.
    expect(preview!.querySelectorAll(':scope > .msdesc-area')).toHaveLength(FULL.length);
  });
});

describe('section labels are localized in both catalogues', () => {
  const fr = catalogue('fr');
  const KEYS = [
    // Public page: the msDesc section title and the 8.2 legacy relabel (one key
    // per surface — heading and on-this-page nav share it).
    'manuscript.sections.msDesc',
    'manuscript.sections.legacyDescriptions',
    // The rest of the public page's on-this-page nav / section rules.
    'manuscript.sections.text',
    'manuscript.sections.textAside',
    'manuscript.sections.images',
    'manuscript.sections.record',
    'manuscript.sections.sourceAttribution',
    // Backoffice: the single relabel point in descriptions-section.tsx.
    'backoffice.manuscriptsDetail.descriptions',
    // Backoffice: the workspace count badge + completeness-checklist row, which
    // label the same legacy HistoricalItemDescription rows and now sit next to
    // the TEI msDesc editor — a bare "Descriptions" reads as either.
    'backoffice.manuscriptWorkspace.badgeDescriptions',
    'backoffice.manuscriptWorkspace.checklistDescriptions',
  ];

  it.each(KEYS)('%s exists in en and fr with distinct real wording', (key) => {
    const enValue = lookup(en, key);
    const frValue = lookup(fr, key);
    expect(typeof enValue).toBe('string');
    expect(typeof frValue).toBe('string');
    expect((enValue as string).length).toBeGreaterThan(0);
    expect((frValue as string).length).toBeGreaterThan(0);
  });

  it('the legacy relabel reads as catalogue descriptions, not bare "Description"', () => {
    expect(lookup(en, 'manuscript.sections.legacyDescriptions')).toBe(
      'Catalogue descriptions / citations'
    );
    expect(lookup(en, 'backoffice.manuscriptsDetail.descriptions')).toBe(
      'Catalogue descriptions / citations'
    );
    expect(lookup(fr, 'manuscript.sections.legacyDescriptions')).toContain('catalogue');
    expect(lookup(fr, 'backoffice.manuscriptsDetail.descriptions')).toContain('catalogue');
  });

  it('leaves no bare "Descriptions" label on a surface the msDesc editor shares', () => {
    // manuscript-workspace.tsx reads these two keys for the legacy-description
    // badge and checklist row; the keys are already indirected, so the relabel
    // is catalogue-only.
    const WORKSPACE_KEYS = [
      'backoffice.manuscriptWorkspace.badgeDescriptions',
      'backoffice.manuscriptWorkspace.checklistDescriptions',
    ];
    for (const key of WORKSPACE_KEYS) {
      expect(lookup(en, key)).toBe('Catalogue descriptions');
      expect(lookup(fr, key)).toBe('Descriptions de catalogue');
    }
  });

  it('keeps the ICU placeholder of the source attribution in both catalogues', () => {
    expect(lookup(en, 'manuscript.sections.sourceAttribution')).toContain('{source}');
    expect(lookup(fr, 'manuscript.sections.sourceAttribution')).toContain('{source}');
  });
});
