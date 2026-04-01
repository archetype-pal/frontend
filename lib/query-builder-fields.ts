/**
 * Filterable + searchable field lists per result type (aligned with api/apps/search/index_metadata.py).
 */
import type { ResultType } from '@/lib/search-types';

/** Full-text searchable fields (Meilisearch searchableAttributes). */
export const SEARCHABLE_FIELDS_BY_TYPE: Record<ResultType, string[]> = {
  manuscripts: [
    'display_label',
    'repository_name',
    'repository_city',
    'shelfmark',
    'catalogue_numbers',
    'type',
  ],
  images: ['locus', 'repository_name', 'shelfmark', 'components', 'features'],
  scribes: ['name', 'scriptorium'],
  hands: ['name', 'place', 'description', 'repository_name', 'shelfmark'],
  graphs: [
    'display_label',
    'repository_name',
    'shelfmark',
    'allograph',
    'character',
    'hand_name',
    'components',
  ],
  texts: [
    'content',
    'repository_name',
    'shelfmark',
    'catalogue_numbers',
    'text_type',
    'places',
    'people',
  ],
  clauses: ['content', 'clause_type', 'repository_name', 'shelfmark'],
  people: ['name', 'person_type', 'ref', 'repository_name', 'shelfmark'],
  places: ['name', 'place_type', 'ref', 'repository_name', 'shelfmark'],
};

/** Filterable fields (Meilisearch filterableAttributes). */
const FILTERABLE_FIELDS_BY_TYPE: Record<ResultType, string[]> = {
  manuscripts: [
    'id',
    'repository_name',
    'repository_city',
    'shelfmark',
    'catalogue_numbers',
    'date',
    'date_min',
    'date_max',
    'type',
    'format',
    'number_of_images',
    'image_availability',
  ],
  images: [
    'id',
    'locus',
    'repository_name',
    'repository_city',
    'shelfmark',
    'date',
    'type',
    'number_of_annotations',
    'components',
    'features',
    'component_features',
    'positions',
  ],
  scribes: ['id', 'name', 'period', 'scriptorium'],
  hands: [
    'id',
    'name',
    'place',
    'repository_name',
    'repository_city',
    'shelfmark',
    'catalogue_numbers',
    'date',
  ],
  graphs: [
    'id',
    'image_iiif',
    'repository_name',
    'repository_city',
    'shelfmark',
    'date',
    'place',
    'hand_name',
    'components',
    'features',
    'component_features',
    'positions',
    'allograph',
    'character',
    'character_type',
    'is_annotated',
  ],
  texts: [
    'id',
    'repository_name',
    'repository_city',
    'shelfmark',
    'text_type',
    'date',
    'date_min',
    'date_max',
    'type',
    'status',
    'language',
    'places',
    'people',
  ],
  clauses: [
    'id',
    'clause_type',
    'text_type',
    'repository_name',
    'repository_city',
    'shelfmark',
    'date_min',
    'date_max',
    'type',
    'status',
  ],
  people: [
    'id',
    'name',
    'person_type',
    'ref',
    'text_type',
    'repository_name',
    'repository_city',
    'shelfmark',
    'date_min',
    'date_max',
    'type',
    'status',
  ],
  places: [
    'id',
    'name',
    'place_type',
    'ref',
    'text_type',
    'repository_name',
    'repository_city',
    'shelfmark',
    'date_min',
    'date_max',
    'type',
    'status',
  ],
};

/** Fields that support numeric comparisons in the query builder. */
const NUMERIC_FIELDS_BY_TYPE: Partial<Record<ResultType, string[]>> = {
  manuscripts: ['number_of_images', 'id', 'date_min', 'date_max', 'date'],
  images: ['number_of_annotations', 'id', 'date'],
  scribes: ['id'],
  hands: ['id', 'date'],
  graphs: ['id', 'date'],
  texts: ['id', 'date_min', 'date_max', 'date'],
  clauses: ['id', 'date_min', 'date_max'],
  people: ['id', 'date_min', 'date_max'],
  places: ['id', 'date_min', 'date_max'],
};

export function mergedFieldOptions(resultType: ResultType): string[] {
  const a = new Set<string>([
    ...(FILTERABLE_FIELDS_BY_TYPE[resultType] ?? []),
    ...(SEARCHABLE_FIELDS_BY_TYPE[resultType] ?? []),
  ]);
  return [...a].sort((x, y) => x.localeCompare(y));
}

export function isNumericField(resultType: ResultType, field: string): boolean {
  return (NUMERIC_FIELDS_BY_TYPE[resultType] ?? []).includes(field);
}
