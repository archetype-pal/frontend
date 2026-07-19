import { describe, expect, it } from 'vitest';

import {
  buildMsDescSeedPayload,
  buildMsDescSeedPayloads,
  msdescAreaRow,
} from '@/lib/backoffice/msdesc-seed';
import { msdescFromFragment } from '@/lib/msdesc-form';
import { msdescTemplateFragment } from '@/lib/msdesc-template';
import { MSDESC_AREAS } from '@/lib/msdesc-vocab';

describe('buildMsDescSeedPayloads', () => {
  it('composes exactly four payloads, one per area in canonical order', () => {
    const payloads = buildMsDescSeedPayloads(42);
    expect(payloads).toHaveLength(4);
    expect(payloads.map((p) => p.area)).toEqual([...MSDESC_AREAS]);
    for (const payload of payloads) {
      expect(payload.item_part).toBe(42);
    }
  });

  it('seeds every payload unpublished (0.1 publication-gating decision)', () => {
    for (const payload of buildMsDescSeedPayloads(7)) {
      expect(payload.is_published).toBe(false);
    }
  });

  it('seeds each area with its canonical template fragment', () => {
    for (const payload of buildMsDescSeedPayloads(7)) {
      expect(payload.content).toBe(msdescTemplateFragment(payload.area));
    }
  });

  it('every seeded fragment is representable by the typed form model', () => {
    // The whole point of template seeding: the form (not the Source tab) is
    // the first editing surface a cataloguer sees.
    for (const payload of buildMsDescSeedPayloads(7)) {
      const parsed = msdescFromFragment(payload.area, payload.content);
      expect(parsed.ok, `area ${payload.area}`).toBe(true);
    }
  });

  it('buildMsDescSeedPayload targets one area', () => {
    const payload = buildMsDescSeedPayload(3, 'physDesc');
    expect(payload).toEqual({
      item_part: 3,
      area: 'physDesc',
      content: msdescTemplateFragment('physDesc'),
      is_published: false,
    });
  });
});

describe('msdescAreaRow', () => {
  it('finds the stored row for an area', () => {
    const rows = [
      { area: 'msIdentifier' as const, id: 1 },
      { area: 'history' as const, id: 2 },
    ];
    expect(msdescAreaRow(rows, 'history')?.id).toBe(2);
    expect(msdescAreaRow(rows, 'physDesc')).toBeUndefined();
  });
});
