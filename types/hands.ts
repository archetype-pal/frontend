export interface HandType {
  id: number;
  name: string;
  scribe: number;
  item_part: number;
  date: string;
  place: string;
  description: string;
  /** Legacy DigiPal hand display order. Lower values are shown first. */
  num?: number | null;
  /** Newer/API aliases used by some hand ordering implementations. */
  order?: number | null;
  ordering?: number | null;
  sort_order?: number | null;
  display_order?: number | null;
  /** Higher values win when an explicit priority is available. */
  priority?: number | null;
  is_default?: boolean | null;
  default?: boolean | null;
  default_hand?: boolean | null;
  scriptorium?: string | null;
}

export interface HandsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: HandType[];
}
