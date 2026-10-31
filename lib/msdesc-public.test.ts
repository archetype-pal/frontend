import { describe, expect, it, vi } from 'vitest';

import { renderPublicMsDescAreas } from '@/lib/msdesc-public';
import type { PublicMsDescArea } from '@/types/manuscript';
import { tBackoffice } from '@/test/messages';

const area = (
  id: PublicMsDescArea['area'],
  body: string,
  extra: Partial<PublicMsDescArea> = {}
): PublicMsDescArea => ({ area: id, content: `<${id}>${body}</${id}>`, ...extra });

const AREAS: PublicMsDescArea[] = [
  area('history', '<provenance><p>Kelso Abbey.</p></provenance>'),
  area('msIdentifier', '<idno type="shelfmark">GD 55/1</idno>'),
  area('physDesc', '<objectDesc form="codex"/>'),
  area('msContents', '<summary><p>A royal charter.</p></summary>'),
];

describe('renderPublicMsDescAreas — selection and order', () => {
  it('renders in msDesc canonical order regardless of API order', () => {
    const rendered = renderPublicMsDescAreas(AREAS, tBackoffice);
    expect(rendered.map((entry) => entry.area)).toEqual([
      'msIdentifier',
      'msContents',
      'physDesc',
      'history',
    ]);
  });

  it('returns nothing for an absent, null or empty area list', () => {
    expect(renderPublicMsDescAreas(undefined, tBackoffice)).toEqual([]);
    expect(renderPublicMsDescAreas(null, tBackoffice)).toEqual([]);
    expect(renderPublicMsDescAreas([], tBackoffice)).toEqual([]);
  });

  it('drops an explicitly unpublished area (defence in depth over the API gate)', () => {
    const rendered = renderPublicMsDescAreas(
      [
        area('msIdentifier', '<idno type="shelfmark">Published</idno>'),
        area('history', '<provenance><p>Secret draft.</p></provenance>', { is_published: false }),
      ],
      tBackoffice
    );
    expect(rendered.map((entry) => entry.area)).toEqual(['msIdentifier']);
    expect(rendered.map((entry) => entry.html).join('')).not.toContain('Secret draft');
  });

  it('keeps areas whose is_published is absent — the public API omits the field', () => {
    const rendered = renderPublicMsDescAreas(
      [area('physDesc', '<objectDesc form="codex"/>')],
      tBackoffice
    );
    expect(rendered).toHaveLength(1);
  });

  it('drops an unknown area id rather than rendering an unlabelled block', () => {
    const rendered = renderPublicMsDescAreas(
      [
        { area: 'sealDesc' as PublicMsDescArea['area'], content: '<sealDesc>wax</sealDesc>' },
        area('history', '<provenance><p>Kelso Abbey.</p></provenance>'),
      ],
      tBackoffice
    );
    expect(rendered.map((entry) => entry.area)).toEqual(['history']);
  });

  it('drops areas that render to nothing but their heading', () => {
    const rendered = renderPublicMsDescAreas(
      [
        // Blank fragment, whitespace-only fragment, and an unfilled skeleton —
        // each would otherwise show as a lone title under the section rule.
        { area: 'history', content: '' },
        area('msContents', '   '),
        area('msIdentifier', '<idno type="shelfmark"></idno>'),
        area('physDesc', '<objectDesc form="codex"/>'),
      ],
      tBackoffice
    );
    expect(rendered.map((entry) => entry.area)).toEqual(['physDesc']);
  });

  it('renders real content with translated labels, not raw i18n keys', () => {
    const [rendered] = renderPublicMsDescAreas([AREAS[1]], tBackoffice);
    expect(rendered.html).toContain('Identification');
    expect(rendered.html).toContain('Shelfmark');
    expect(rendered.html).toContain('GD 55/1');
    expect(rendered.html).not.toContain('msdesc.render.');
  });
});

describe('renderPublicMsDescAreas — sanitization', () => {
  // A fragment authored in Source mode can hold arbitrary markup: the stored
  // string is never HTML-escaped on the way in, and the renderer is explicitly
  // not a sanitizer. Nothing executable may reach the public page.
  const HOSTILE = [
    '<physDesc>',
    '<script>alert(1)</script>',
    '<p onclick="alert(2)">clickable</p>',
    '<img src=x onerror="alert(3)">',
    '<ref target="javascript:alert(4)">bad link</ref>',
    '<ref target="/scribes/7">good link</ref>',
    '<a href="javascript:alert(5)">bare anchor</a>',
    '<iframe src="https://evil.example"></iframe>',
    '</physDesc>',
  ].join('');

  it('cannot inject a script, an event handler or a javascript: url', () => {
    const [rendered] = renderPublicMsDescAreas(
      [{ area: 'physDesc', content: HOSTILE }],
      tBackoffice
    );
    const html = rendered.html;
    expect(html.toLowerCase()).not.toContain('<script');
    expect(html.toLowerCase()).not.toContain('onclick');
    expect(html.toLowerCase()).not.toContain('onerror');
    expect(html.toLowerCase()).not.toContain('javascript:');
    expect(html.toLowerCase()).not.toContain('<iframe');
    // Text content is preserved — sanitizing is not censoring.
    expect(html).toContain('clickable');
    // A legitimate site-relative ref still becomes a real link.
    expect(html).toContain('href="/scribes/7"');
  });

  it('keeps the data-tei-label hover pills (allowDataAttr must stay on)', () => {
    const [rendered] = renderPublicMsDescAreas(
      [area('history', '<provenance><p>Held by <persName>Malcolm IV</persName>.</p></provenance>')],
      tBackoffice
    );
    expect(rendered.html).toContain('data-tei-label="persName"');
  });

  it('pipes the rendered fragment through sanitizeHtml with allowDataAttr', async () => {
    vi.resetModules();
    const sanitizeHtml = vi.fn((dirty: string) => `[sanitized]${dirty}`);
    vi.doMock('@/lib/sanitize-html', () => ({ sanitizeHtml }));
    try {
      const mod = await import('@/lib/msdesc-public');
      const rendered = mod.renderPublicMsDescAreas(
        [area('history', '<provenance><p>Kelso Abbey.</p></provenance>')],
        tBackoffice
      );
      expect(sanitizeHtml).toHaveBeenCalledTimes(1);
      expect(sanitizeHtml).toHaveBeenCalledWith(expect.stringContaining('Kelso Abbey.'), {
        allowDataAttr: true,
      });
      expect(rendered[0].html.startsWith('[sanitized]')).toBe(true);
    } finally {
      vi.doUnmock('@/lib/sanitize-html');
      vi.resetModules();
    }
  });
});

describe('renderPublicMsDescAreas — heading levels', () => {
  it('emits h3 area titles and h4 groups, one level under the page section h2', () => {
    // The section heads itself with an <h2> (`SectionHeading`), so the public
    // outline must run h2 → h3 → h4 with no gap. The backoffice preview keeps
    // the renderer's h4/h5 default; only this consumer shifts.
    const [rendered] = renderPublicMsDescAreas(
      [
        area(
          'physDesc',
          '<objectDesc form="codex"/><handDesc><handNote><p>One hand.</p></handNote></handDesc>'
        ),
      ],
      tBackoffice
    );
    expect(rendered.html).toContain('<h3 class="msdesc-heading">Physical description</h3>');
    expect(rendered.html).toContain('<h4 class="msdesc-heading">Hands</h4>');
    expect(rendered.html).not.toContain('<h5');
  });

  it('still recognises a heading-only area at the shifted level', () => {
    // `hasRenderedBody` matches the renderer's envelope, so its heading pattern
    // has to track `headingLevel` — otherwise an unfilled skeleton would slip
    // through as a lone title under the section rule.
    expect(renderPublicMsDescAreas([area('msIdentifier', '')], tBackoffice)).toEqual([]);
  });
});
