export interface ManuscriptImage {
  id: number;
  iiif_image: string;
  locus: string;
  number_of_annotations: number;
  number_of_image_annotations?: number;
  item_part: number;
  texts: Array<{
    type: string;
    content: string;
  }>;
}
