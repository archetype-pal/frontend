import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { renderPublicDescription } from '@/lib/description-public';
import { TEI_NS, wrapTeiDescription } from '@/lib/tei-description';

// Real English catalogue, so a missing label key surfaces as a failed assertion
// rather than a silently rendered dotted key.
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

const render = (content: string) => renderPublicDescription(content, tEn);

describe('legacy HTML descriptions', () => {
  it('render exactly as before — sanitized, not routed through the TEI renderer', () => {
    const out = render('<p><b>Melrose, Liber Sancte Marie</b>, no. 175.</p>');
    expect(out.isTei).toBe(false);
    expect(out.html).toContain('<b>Melrose, Liber Sancte Marie</b>');
  });

  it('still have scripts stripped', () => {
    expect(render('<p>ok</p><script>alert(1)</script>').html).not.toContain('alert(1)');
  });

  it('keep data attributes OFF — the tighter policy stays on third-party markup', () => {
    const out = render('<p data-evil="1">text</p>');
    expect(out.isTei).toBe(false);
    expect(out.html).not.toContain('data-evil');
  });

  it('are not reinterpreted when they quote TEI element names', () => {
    const out = render('<p>Witnesses are tagged <code>&lt;persName&gt;</code>.</p>');
    expect(out.isTei).toBe(false);
    expect(out.html).toContain('&lt;persName&gt;');
  });
});

describe('TEI descriptions', () => {
  it('render a ref as an anchor carrying its identity', () => {
    const out = render(
      wrapTeiDescription(
        '<p>Granted by <ref type="person" key="person_42" target="/scribes/42">William I</ref>.</p>'
      )
    );
    expect(out.isTei).toBe(true);
    expect(out.html).toContain('href="/scribes/42"');
    expect(out.html).toContain('data-ref-kind="person"');
    expect(out.html).toContain('data-ref-key="person_42"');
  });

  it('keep the data attributes a hover card will need', () => {
    const out = render(
      wrapTeiDescription('<p><ref type="manuscript" target="/manuscripts/228">Cotton</ref></p>')
    );
    expect(out.html).toContain('data-ref-kind="manuscript"');
  });

  it('render inline entities without field chrome', () => {
    const out = render(wrapTeiDescription('<p>At <placeName>Roxburgh</placeName>.</p>'));
    expect(out.html).toContain('tei-el-placeName');
    // A field row would read "Place: Roxburgh" — prose has no fields.
    expect(out.html).not.toContain('msdesc-field');
  });

  it('do not give a root-level non-paragraph element field chrome either', () => {
    // renderElementNode would end at renderField for <note>; the prose entry
    // point must render it inline instead.
    const out = render(wrapTeiDescription('<note>A stray note.</note>'));
    expect(out.html).not.toContain('msdesc-field');
    expect(out.html).toContain('A stray note.');
  });

  it('give an external ref the safe rel attributes', () => {
    const out = render(
      wrapTeiDescription('<p><ref target="https://example.org/x">CPL 313</ref></p>')
    );
    expect(out.html).toContain('rel="noopener noreferrer"');
    expect(out.html).toContain('target="_blank"');
  });

  it('refuse an authority-bearing target that would escape the site', () => {
    const out = render(wrapTeiDescription('<p><ref target="//evil.example/x">click</ref></p>'));
    expect(out.html).not.toContain('evil.example');
  });

  it('neutralise a script smuggled into TEI prose', () => {
    const out = render(wrapTeiDescription('<p>ok</p><script>alert(1)</script>'));
    // The renderer has no concept of <script>: it emits the element as an inert
    // inline span, so the body survives as visible TEXT and never as code. What
    // matters is that no executable element reaches the page.
    expect(out.html).not.toContain('<script');
    expect(out.html).toContain('<span class="tei-el tei-el-script"');
  });

  it('neutralise an inline event handler', () => {
    const out = render(wrapTeiDescription('<p><hi onclick="alert(1)">x</hi></p>'));
    expect(out.html).not.toContain('onclick');
  });

  it('neutralise a javascript: ref target', () => {
    const out = render(wrapTeiDescription('<p><ref target="javascript:alert(1)">click</ref></p>'));
    expect(out.html).not.toContain('javascript:');
  });

  it('render a STAMPED entity as one anchor, not a nested pair', () => {
    // docs/tei.md §3.4's payoff: the link lives on the entity, so the renderer
    // emits a single <a> instead of having to degrade an inner anchor to a span.
    const out = render(
      wrapTeiDescription(
        '<p>Granted by <persName key="person_42" target="/scribes/42">William I</persName>.</p>'
      )
    );
    expect(out.html).toContain('<a href="/scribes/42"');
    expect(out.html).toContain('tei-el-persName');
    expect(out.html.match(/<a /g)?.length ?? 0).toBe(1);
    expect(out.html).not.toContain('<ref');
  });

  it('render a stamped placeName as an anchor to its search', () => {
    const out = render(
      wrapTeiDescription(
        '<p>at <placeName target="/search/places?keyword=Melrose">Melrose</placeName>.</p>'
      )
    );
    expect(out.html).toContain('href="/search/places?keyword=Melrose"');
  });

  it('render an unstamped entity as a plain span — meaning without a destination', () => {
    const out = render(wrapTeiDescription('<p>by <persName>an unknown scribe</persName>.</p>'));
    expect(out.html).toContain('tei-el-persName');
    expect(out.html).not.toContain('<a ');
  });

  it('render an unresolved key as text, not a link', () => {
    const out = render(wrapTeiDescription('<p><ref type="work" key="work_9">Liber</ref></p>'));
    expect(out.html).toContain('msdesc-unresolved');
    expect(out.html).not.toContain('<a ');
  });

  it('render an empty description as nothing', () => {
    expect(render(wrapTeiDescription('')).html.trim()).toBe('');
  });

  it('survive malformed markup without throwing', () => {
    expect(() => render(`<div xmlns="${TEI_NS}"><p>unclosed</div>`)).not.toThrow();
  });
});
