export interface ScribeDetail {
  id: number;
  name: string;
  date?: string | null;
  period?: string | null;
  scriptorium?: string | null;
  description?: string | null;
  idiographs?: ScribeIdiograph[];
}

export interface ScribeHand {
  id: number;
  name: string;
  item_part: number;
  date?: string | null;
  place?: string | null;
  // Denormalized fields
  item_part_display_label?: string;
  shelfmark?: string;
}

export interface ScribeIdiograph {
  id: number;
  name: string;
  character: string;
}
