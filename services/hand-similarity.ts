import { apiFetch } from '@/lib/api-fetch';

/**
 * A hand's nearest hands (backend: `GET /api/v1/hands/<id>/similar/`, AI
 * programme W1.3). Two hands are compared letter by letter on the letters both
 * wrote; `similarity` is the weighted mean cosine over those letters, from -1
 * to 1, and `letters` says what it rests on.
 */

export type SimilarHandLetter = {
  allograph: number;
  name: string | null;
  character: string | null;
  similarity: number;
  /** How many forms of the letter each hand had: this hand's, then the other's. */
  glyphs: [number, number];
};

export type SimilarHand = {
  rank: number;
  similarity: number;
  hand: {
    id: number;
    name: string;
    item_part: number;
    item_part_display_label: string;
    scribe: { id: number; name: string } | null;
    date: string | null;
    place: string | null;
  };
  letters: SimilarHandLetter[];
};

export type SimilarHands = {
  hand: number;
  glyphs: number;
  minimum_glyphs: number;
  vectors: string | null;
  computed: string | null;
  results: SimilarHand[];
};

/** The hand's nearest hands, or null when they cannot be read (an older backend, an outage). */
export async function getSimilarHands(handId: number): Promise<SimilarHands | null> {
  try {
    const response = await apiFetch(`/api/v1/hands/${handId}/similar/`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/** The forms the two hands were compared on: for each shared letter, the fewer of their forms. */
export function formsCompared(letters: SimilarHandLetter[]): number {
  return letters.reduce((total, letter) => total + Math.min(...letter.glyphs), 0);
}

/** One of a scribe's hands, and where its nearest hands rank. */
export type NearRow = { hand: number; rank: number; similarity: number };

export type ScribeHandCompared = {
  id: number;
  name: string;
  item_part: number;
  item_part_display_label: string;
  /** Whether the hand has stored nearest hands. */
  compared: boolean;
  /** The scribe's other hands among this one's nearest. */
  siblings: NearRow[];
};

/**
 * The hands near a scribe's hands (backend: `GET /api/v1/scribes/<id>/similar/`):
 * each match with which of the scribe's hands it is near and at what rank, and
 * the scribe's own hands with where they find each other.
 */
export type ScribeSimilarHands = {
  scribe: number;
  minimum_glyphs: number;
  vectors: string | null;
  computed: string | null;
  hands: ScribeHandCompared[];
  results: { hand: SimilarHand['hand']; similarity: number; near: NearRow[] }[];
};

/** The hands near the scribe's, or null when they cannot be read (an older backend, an outage). */
export async function getScribeSimilarHands(
  scribeId: number | string
): Promise<ScribeSimilarHands | null> {
  try {
    const response = await apiFetch(`/api/v1/scribes/${scribeId}/similar/`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
