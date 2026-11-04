/**
 * The public diplomatic collections (AI programme W2.2, W2.1, W3.3):
 * `/api/v1/diplomatic/*`. Everything here was proposed by a model and
 * approved by a named scholar, and comes from a text the reader may see.
 */

/** The text a record came from: its name, its date, and the viewer's route to it. */
export interface Charter {
  image_text: number;
  /** The text's type as stored: "Transcription" or "Translation". */
  type: string;
  item_image: number;
  item_part: number;
  locus: string;
  shelfmark: string;
  repository: string;
  /** The catalogue date. Empty when undated. */
  date: string;
}

export const FORMULA_KINDS = [
  'salutation',
  'notification',
  'dispositive',
  'sanctio',
  'corroboratio',
  'other',
] as const;
export type FormulaKind = (typeof FORMULA_KINDS)[number];

export interface FormulaOccurrence {
  id: number;
  image_text: number;
  charter: Charter;
  excerpt: string;
}

export interface Formula {
  id: number;
  kind: string;
  label: string;
  exemplar: string;
  /** The type in MoA's published typology. Empty when it matches none. */
  published_type: string;
  /** The occurrences this reader may see. */
  occurrence_count: number;
  occurrences: FormulaOccurrence[];
  created: string;
}

export interface DiplomaticSummary {
  formulae: number;
  entities: number;
  relations: number;
}
