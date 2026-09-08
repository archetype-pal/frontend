import { describe, expect, it } from 'vitest';

import { renderPublicationHtml } from './publication-html';

describe('publication HTML rendering', () => {
  it('links legacy bracket footnotes when a matching Notes entry exists', () => {
    const html =
      '<p>Body text.[1] Unrelated date [1215].</p>' +
      '<h2><strong>Notes</strong></h2>' +
      '<p>[1] First note.</p>';

    expect(renderPublicationHtml(html)).toBe(
      '<p>Body text.<a id="refnote1" href="#footnote1" class="publication-footnote-ref" title="See note 1">[1]</a> Unrelated date [1215].</p>' +
        '<h2><strong>Notes</strong></h2>' +
        '<p><a id="footnote1" href="#refnote1" class="publication-footnote-backref" title="Return to reference 1">[1]</a> First note.</p>'
    );
  });

  it('does not create nested anchors inside existing links', () => {
    const html =
      '<p><a href="/existing">Existing [1]</a> Plain [1].</p>' +
      '<h2>Notes</h2>' +
      '<p>[1] First note.</p>';

    expect(renderPublicationHtml(html)).toContain(
      '<a href="/existing">Existing [1]</a> Plain <a id="refnote1" href="#footnote1" class="publication-footnote-ref" title="See note 1">[1]</a>.'
    );
  });

  it('leaves bracket markers alone without a matching Notes section', () => {
    const html = '<p>Plain [1] marker with no note.</p>';

    expect(renderPublicationHtml(html)).toBe(html);
  });

  it('keeps safe YouTube embeds in rendered publication HTML', () => {
    const html =
      '<p><iframe height="315" src="https://www.youtube.com/embed/zRxcyaOfuBY" width="560"></iframe></p>';

    const rendered = renderPublicationHtml(html);

    expect(rendered).toContain('<iframe');
    expect(rendered).toContain('src="https://www.youtube.com/embed/zRxcyaOfuBY"');
  });

  it('sanitizes legacy publication HTML before adding generated note links', () => {
    const html =
      '<p onclick="alert(1)">Body [1].</p>' +
      '<script>alert(1)</script>' +
      '<h2>Notes</h2>' +
      '<p>[1] First note.</p>';

    const rendered = renderPublicationHtml(html);

    expect(rendered).not.toContain('onclick');
    expect(rendered).not.toContain('<script>');
    expect(rendered).toContain('href="#footnote1"');
    expect(rendered).toContain('href="#refnote1"');
  });
});
