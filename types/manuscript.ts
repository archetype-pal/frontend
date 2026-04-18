export interface Catalogue {
  name: string;
  label: string;
  location: string;
  url: string;
}

export interface CatalogueNumber {
  number: string;
  url: string;
  catalogue: Catalogue;
}

export interface Description {
  source: {
    name: string;
    label: string;
    location: string;
    url: string;
  };
  content: string;
}

export interface HistoricalItem {
  type: string;
  format: string;
  date: string;
  date_display: string | null;
  catalogue_numbers: CatalogueNumber[];
  descriptions: Description[];
}

export interface CurrentItem {
  shelfmark: string;
  repository: {
    name: string;
    label: string;
    place: string;
    url: string;
  };
}

export interface Manuscript {
  id: number;
  display_label: string;
  historical_item: HistoricalItem;
  current_item: CurrentItem;
}

export interface ManuscriptImage {
  id: number;
  text: string;
  iiif_image: string;
  thumbnail: string;
  locus: string;
  number_of_annotations: number;
  texts: {
    type: string;
    content: string;
  }[];
}
