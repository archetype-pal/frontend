import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  MSDESC_AREAS,
  MSDESC_VOCABS,
  msdescAreaLabelKey,
  msdescVocabLabelKey,
  type MsDescVocabId,
} from '@/lib/msdesc-vocab';

const messagesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'messages');

type Messages = Record<string, unknown>;

function loadLocale(locale: string): Messages {
  return JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), 'utf8')) as Messages;
}

/** Resolve a dotted key path relative to the `backoffice` namespace. */
function resolveBackofficeKey(catalogue: Messages, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, segment) =>
        node !== null && typeof node === 'object' ? (node as Messages)[segment] : undefined,
      catalogue.backoffice
    );
}

const locales = ['en', 'fr', 'de'] as const;
const vocabIds = Object.keys(MSDESC_VOCABS) as MsDescVocabId[];

describe('msdesc vocab', () => {
  // Counts verified against the valItem lists in msdesc-minimal/msdesc-minimal.odd
  // (rulingMedium is the ODD's documented suggested-value list, not a valList;
  // sealType has no ODD counterpart at all — the ODD models no seals).
  const EXPECTED_LENGTHS: Record<MsDescVocabId, number> = {
    form: 7,
    material: 7,
    script: 19,
    execution: 3,
    decoType: 23,
    sealType: 6,
    availabilityStatus: 7,
    topLine: 3,
    rulingMedium: 7,
  };

  it.each(vocabIds)('vocab "%s" matches the ODD value count', (vocab) => {
    expect(MSDESC_VOCABS[vocab]).toHaveLength(EXPECTED_LENGTHS[vocab]);
  });

  it.each(vocabIds)('vocab "%s" has no duplicate values', (vocab) => {
    const values = MSDESC_VOCABS[vocab];
    expect(new Set(values).size).toBe(values.length);
  });

  it.each(locales)('locale "%s" defines a label for every vocab value', (locale) => {
    const catalogue = loadLocale(locale);
    for (const vocab of vocabIds) {
      for (const value of MSDESC_VOCABS[vocab]) {
        const key = msdescVocabLabelKey(vocab, value);
        expect(resolveBackofficeKey(catalogue, key), `${locale}: backoffice.${key}`).toBeTypeOf(
          'string'
        );
      }
    }
  });

  it.each(locales)('locale "%s" defines a label for every area', (locale) => {
    const catalogue = loadLocale(locale);
    for (const area of MSDESC_AREAS) {
      const key = msdescAreaLabelKey(area);
      expect(resolveBackofficeKey(catalogue, key), `${locale}: backoffice.${key}`).toBeTypeOf(
        'string'
      );
    }
  });

  it('area ids are the four msDesc areas', () => {
    expect(MSDESC_AREAS).toEqual(['msIdentifier', 'msContents', 'physDesc', 'history']);
  });
});
