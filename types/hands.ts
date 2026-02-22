export interface HandType {
  id: number;
  name: string;
  scribe: number;
  item_part: number;
  date: string;
  place: string;
  description: string;
}

export interface HandsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: HandType[];
}
