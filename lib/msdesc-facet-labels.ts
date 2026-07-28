/**
 * Human labels for the msDesc-derived search facet *values* (TEI-descriptions 7.1).
 *
 * The `material` / `script` / `deco_type` facets are indexed as ODD attribute
 * codes — `perg`, `textualisNorthern`, `flourInit` — because the code is the
 * filter identity (`<facetKey>_exact:<value>`) and display labels are a
 * frontend concern. The labels already exist in both locales under
 * `backoffice.msdesc.vocab.*` (the authoring dropdowns use them), so the public
 * facet rail glosses the same keys rather than inventing a second wording.
 *
 * `origin_place` is deliberately absent: those values are authored place names,
 * already human-readable.
 *
 * Values outside the ODD list pass through as authored — three of these
 * vocabularies are `type="semi"` (open by design), and glossing an unlisted
 * value would print a message key.
 */

import type { FacetListItem } from '@/types/facets';
import {
  MSDESC_VOCABS,
  msdescVocabLabelKey,
  type MsDescVocabId,
  type MsDescVocabValue,
} from '@/lib/msdesc-vocab';

/** Translate a `backoffice`-namespace key (i.e. `useTranslations('backoffice')`). */
export type MsDescFacetTranslate = (key: string) => string;

/** Search facet key → the ODD vocabulary its values are drawn from. */
const FACET_VOCABULARIES: Record<string, MsDescVocabId> = {
  material: 'material',
  script: 'script',
  deco_type: 'decoType',
};

/** Gloss one facet value; non-vocabulary facets and unlisted values pass through. */
export function formatMsDescFacetValue(
  facetKey: string,
  value: string,
  t: MsDescFacetTranslate
): string {
  const vocab = FACET_VOCABULARIES[facetKey];
  if (!vocab) return value;
  const values = MSDESC_VOCABS[vocab] as readonly string[];
  if (!values.includes(value)) return value;
  return t(msdescVocabLabelKey(vocab, value as MsDescVocabValue<typeof vocab>));
}

/**
 * Relabel a facet's items for display. `value` (the Meilisearch filter literal)
 * is never touched — only the label the rail renders, sorts and searches on.
 */
export function localizeMsDescFacetItems(
  facetKey: string,
  items: FacetListItem[],
  t: MsDescFacetTranslate
): FacetListItem[] {
  if (!FACET_VOCABULARIES[facetKey]) return items;
  return items.map((item) => {
    const label = formatMsDescFacetValue(facetKey, item.value, t);
    return label === item.label ? item : { ...item, label };
  });
}
