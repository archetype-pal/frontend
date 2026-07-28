/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';

import { msdescFromFragment } from '@/lib/msdesc-form';
import { personRefFromScribe, sourceInsertMarkup } from '@/lib/tei-ref-picker';

// The module imports CodeMirror through next/dynamic; keep it out of the test.
vi.mock('next/dynamic', () => ({ default: () => () => null }));

import { insertBreaksForm } from './msdesc-source-editor';

/**
 * The two Source-tab insert guards (roadmap 4.3). Both are silent-corruption
 * classes the type-checker and the area validator cannot see: the wrapped XML
 * still parses, and a form-representability loss produces no error at all.
 */

const REF = personRefFromScribe({ id: 7, name: 'John of Perth' });
const wrap = (selection: string) => sourceInsertMarkup(REF, selection);

describe('Source-tab wrap preserves the selected encoding', () => {
  it('keeps an inline element inside the selection as markup, not text', () => {
    const source =
      '<history><provenance><p>Granted by <persName>John of Perth</persName> in 1180.</p>' +
      '</provenance></history>';
    const from = source.indexOf('<persName>');
    const to = source.indexOf('</persName>') + '</persName>'.length;
    const markup = wrap(source.slice(from, to))!;
    const next = source.slice(0, from) + markup + source.slice(to);

    expect(next).toContain('<persName>John of Perth</persName>');
    expect(next).not.toContain('&lt;persName&gt;');
    // And the result is still a well-formed history fragment.
    expect(msdescFromFragment('history', next).ok).toBe(true);
  });

  it('refuses a selection that straddles a tag boundary', () => {
    const source =
      '<history><provenance><p>Granted by <persName>John of Perth</persName>.</p>' +
      '</provenance></history>';
    const from = source.indexOf('<persName>');
    const to = source.indexOf('Perth') + 'Perth'.length;
    expect(wrap(source.slice(from, to))).toBeNull();
  });
});

describe('insertBreaksForm — the phrase-leaf guard', () => {
  const CONTENTS = '<msContents><msItem><author>Augustine</author></msItem></msContents>';
  const HISTORY =
    '<history><origin><origPlace><settlement>Kelso</settlement></origPlace></origin></history>';
  const PROSE = '<history><provenance><p>Held at Kelso.</p></provenance></history>';

  it('flags a <ref> inserted inside <author> (phrase content, no <ref> allowed)', () => {
    const next = CONTENTS.replace(
      '<author>Augustine</author>',
      `<author>${wrap('Augustine')}</author>`
    );
    // Baseline: the un-inserted fragment IS representable…
    expect(msdescFromFragment('msContents', CONTENTS).ok).toBe(true);
    // …and the insert would drop the whole area off the structured form.
    expect(msdescFromFragment('msContents', next).ok).toBe(false);
    expect(insertBreaksForm('msContents', CONTENTS, next)).toBe(true);
  });

  it('flags a <ref> inserted inside <settlement>', () => {
    const next = HISTORY.replace(
      '<settlement>Kelso</settlement>',
      `<settlement>${wrap('Kelso')}</settlement>`
    );
    expect(insertBreaksForm('history', HISTORY, next)).toBe(true);
  });

  it('allows a <ref> in a prose <p> leaf', () => {
    const next = PROSE.replace('Kelso', wrap('Kelso')!);
    expect(msdescFromFragment('history', next).ok).toBe(true);
    expect(insertBreaksForm('history', PROSE, next)).toBe(false);
  });

  it('does not flag an area that was already non-representable', () => {
    // The guard only protects a form the user currently HAS; it never blocks
    // edits to an area that is source-only anyway.
    const broken = '<history><sealDesc>wax</sealDesc></history>';
    expect(msdescFromFragment('history', broken).ok).toBe(false);
    expect(insertBreaksForm('history', broken, `${broken} `)).toBe(false);
  });
});
