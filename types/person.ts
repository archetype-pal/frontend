export interface PersonListItem {
  id: string;
  item_image: number | null;
  item_part: number | null;
  name: string;
  person_type: string;
  ref: string;
  text_type: string;
  repository_city: string;
  repository_name: string;
  shelfmark: string;
  date: string | null;
  date_min: number | null;
  date_max: number | null;
  catalogue_numbers: string;
  locus: string;
  type: string;
  status: string;
  thumbnail_iiif: string | null;
}
