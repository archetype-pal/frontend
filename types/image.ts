export interface ImageListItem {
  id: number;
  repository_name: string;
  repository_city: string;
  shelfmark: string;
  date: string;
  type: string;
  text: string;
  image_iiif: string; // IIIF Image Information URL
  locus: string;
  number_of_annotations: number;
  components: string[];
}
