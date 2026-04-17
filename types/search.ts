export interface ManuscriptListItem {
  id: number;
  display_label?: string;
  repository_name: string;
  repository_city: string;
  shelfmark: string;
  catalogue_numbers: string[];
  date: string;
  type: string;
  format?: string;
  number_of_images: number;
  issuer_name: string;
  named_beneficiary: string;
  first_image_iiif?: string;
}

export interface ImageListItem {
  id: number;
  item_part?: number | null;
  item_image?: number | null;
  repository_name: string;
  repository_city: string;
  shelfmark: string;
  date: string;
  type: string;
  text: string;
  image_iiif: string;
  locus: string;
  number_of_annotations: number;
  components: string[];
  tags?: string[];
}

export interface GraphListItem {
  id: number;
  item_image?: number | null;
  item_part?: number | null;
  repository_name: string;
  repository_city: string;
  shelfmark: string;
  date: string;
  image_iiif: string;
  coordinates: string;
  is_annotated: boolean;
  allograph?: string;
  character?: string;
  character_type?: string;
  hand_name?: string;
}

export interface ScribeListItem {
  id: number;
  name: string;
  period: string;
  scriptorium: string;
}

export interface HandListItem {
  id: number;
  name: string;
  repository_name: string;
  repository_city: string;
  shelfmark: string;
  catalogue_numbers: string;
  place: string;
  date: string | null;
  description?: string;
}

interface AnnotatedSearchItem {
  id: string | number;
  item_image: number | null;
  item_part: number | null;
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
  annotation_id: number | null;
  annotation_coordinates: string | null;
}

export interface TextListItem extends AnnotatedSearchItem {
  id: number;
  content: string;
  language: string;
}

export interface ClauseListItem extends AnnotatedSearchItem {
  id: string;
  clause_type: string;
  content: string;
}

export interface PersonListItem extends AnnotatedSearchItem {
  id: string;
  name: string;
  person_type: string;
  ref: string;
}

export interface PlaceListItem extends AnnotatedSearchItem {
  id: string;
  name: string;
  place_type: string;
  ref: string;
}

export type ResultMap = {
  manuscripts: ManuscriptListItem;
  images: ImageListItem;
  scribes: ScribeListItem;
  hands: HandListItem;
  graphs: GraphListItem;
  texts: TextListItem;
  clauses: ClauseListItem;
  people: PersonListItem;
  places: PlaceListItem;
};
