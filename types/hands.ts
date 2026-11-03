import type { PaginatedResponse } from './backoffice';
import type { HandDescriptionPublic } from './hand-detail';

export interface HandType {
  id: number;
  name: string;
  scribe: number;
  item_part: number;
  date: string;
  place: string;
  descriptions: HandDescriptionPublic[];
  /** Where the hand comes among its part's hands; lists already arrive in this order. */
  display_order?: number;
  scriptorium?: string | null;
}

/** Paginated hands list (alias over the canonical PaginatedResponse). */
export type HandsResponse = PaginatedResponse<HandType>;
