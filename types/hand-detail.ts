export interface HandDetail {
  id: number;
  name: string;
  scribe: number | null;
  item_part: number | null;
  date: string | null;
  place: string | null;
  description: string | null;
  // Additional fields that may come from the API
  script?: string | null;
  repository_name?: string;
  repository_city?: string;
  shelfmark?: string;
  catalogue_numbers?: string;
}

export interface HandImage {
  id: number;
  iiif_image: string;
  locus: string;
  number_of_annotations: number;
  item_part: number;
}

export interface HandScribe {
  id: number;
  name: string;
  period?: string;
  scriptorium?: string;
}

export interface HandManuscript {
  id: number;
  display_label: string;
  current_item?: {
    shelfmark: string;
    repository: {
      name: string;
      place: string;
    };
  };
}

export interface HandGraph {
  id: number;
  allograph_name: string; // e.g. "a, Caroline"
  allograph_id: number;
  image_iiif: string; // IIIF info URL from item_image
  coordinates: string; // GeoJSON string (from annotation.geometry)
}
