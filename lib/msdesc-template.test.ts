import { describe, expect, it } from 'vitest';

import { msdescFromFragment, msdescToFragment } from '@/lib/msdesc-form';
import { MSDESC_TEMPLATE_FRAGMENTS, msdescTemplateFragment } from '@/lib/msdesc-template';
import { MSDESC_AREAS } from '@/lib/msdesc-vocab';

describe('msdesc template skeletons', () => {
  it('covers exactly the four areas', () => {
    expect(Object.keys(MSDESC_TEMPLATE_FRAGMENTS).sort()).toEqual([...MSDESC_AREAS].sort());
  });

  it.each(MSDESC_AREAS)('%s skeleton is representable and round-trips byte-identically', (area) => {
    const skeleton = msdescTemplateFragment(area);
    const parsed = msdescFromFragment(area, skeleton);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(msdescToFragment(area, parsed.state)).toBe(skeleton);
  });

  it.each(MSDESC_AREAS)('%s skeleton carries no comments, PIs or CAPS placeholders', (area) => {
    const skeleton = msdescTemplateFragment(area);
    expect(skeleton).not.toContain('<!--');
    expect(skeleton).not.toContain('<?');
    // The raw template marks placeholders in ALL CAPS ("SHELFMARK", "COUNTRY", …).
    expect(skeleton).not.toMatch(/[A-Z]{2,}/);
  });

  it('keeps the template attribute defaults as initial form values', () => {
    expect(msdescTemplateFragment('physDesc')).toContain('<objectDesc form="codex">');
    expect(msdescTemplateFragment('physDesc')).toContain('<supportDesc material="perg">');
    expect(msdescTemplateFragment('msContents')).toContain(
      '<textLang mainLang="la">Latin</textLang>'
    );
    expect(msdescTemplateFragment('history')).toContain('<origDate calendar="#Gregorian"/>');
  });

  it('strips placeholder values while keeping structure for the rich editor', () => {
    const physDesc = msdescFromFragment('physDesc', msdescTemplateFragment('physDesc'));
    if (!physDesc.ok) throw new Error(physDesc.reason);
    // Placeholder ids/dates/zero-counts are gone…
    expect(physDesc.state.handDesc?.handNotes[0].xmlId).toBeUndefined();
    expect(physDesc.state.objectDesc.layout?.writtenLines).toBeUndefined();
    expect(physDesc.state.binding?.notBefore).toBeUndefined();
    // …but each prose leaf keeps an empty <p/> to mount the Phase-3 editor on.
    expect(physDesc.state.objectDesc.layout?.innerXml).toBe('<p/>');
    expect(physDesc.state.handDesc?.handNotes[0].innerXml).toBe('<p/>');
    expect(physDesc.state.additionsInnerXml).toBe('<p/>');
  });
});
