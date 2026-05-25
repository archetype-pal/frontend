import { authFetch } from '@/lib/api-fetch';

export type Kind = 'Transcription' | 'Translation';
export type Status = 'Draft' | 'Review' | 'Live' | 'Reviewed';

export type MatrixPayload = {
  kinds: Kind[];
  statuses: Status[];
  by_kind: Record<Kind, Record<Status, number>>;
  empty_by_kind: Record<Kind, number>;
  totals: Record<Kind, number>;
};

export type CoveragePayload = {
  images_total: number;
  with_transcription: number;
  with_translation: number;
  with_both: number;
  with_either: number;
  with_neither: number;
};

export type LanguageRow = {
  language: string;
  transcription: number;
  translation: number;
  total: number;
};

export type RecentRow = {
  id: number;
  type: Kind;
  status: Status;
  language: string;
  modified: string;
  created: string;
  is_empty: boolean;
  char_count: number;
  annotation_count: number;
  item_image_id: number;
  item_part_id: number | null;
  locus: string;
  label: string;
};

export type ActivityBucket = {
  date: string;
  transcription: number;
  translation: number;
};

export type AnnotationActivityBucket = {
  date: string;
  count: number;
};

export type AnnotationHealth = {
  image_texts_total: number;
  image_texts_with_content: number;
  annotations_total: number;
  average_annotations_per_text: number;
};

export type TextsOverview = {
  generated_at: string;
  matrix: MatrixPayload;
  coverage: CoveragePayload;
  languages: LanguageRow[];
  recent: RecentRow[];
  activity: ActivityBucket[];
  annotation_activity: AnnotationActivityBucket[];
  annotation_health: AnnotationHealth;
};

export async function fetchTextsOverview(token: string): Promise<TextsOverview> {
  const response = await authFetch('/api/v1/search/management/image-texts/overview/', token, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }
  return (await response.json()) as TextsOverview;
}
