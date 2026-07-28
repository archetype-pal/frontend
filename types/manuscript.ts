import type { MsDescAreaId } from '@/lib/msdesc-vocab';

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
  date: number | null;
  date_display: string | null;
  probable_text_date?: string | null;
  dating_notes?: string | null;
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

/**
 * One published msDesc area as served by the public item-part detail endpoint
 * (`ItemPartDetailSerializer.get_msdesc_areas` — TEI-descriptions roadmap 1.4).
 * `content` is a TEI fragment rooted at the area element; render it through
 * `renderPublicMsDescAreas` (`lib/msdesc-public.ts`), never raw.
 *
 * The public serializer exposes `{area, content}` only — the publication gate
 * runs server-side. `is_published` is declared optional so the same shape can
 * carry a backoffice row (`types/backoffice.ts`), and so the renderer can drop
 * an explicitly-unpublished area as defence in depth; absent means published.
 */
export interface PublicMsDescArea {
  area: MsDescAreaId;
  content: string;
  is_published?: boolean;
}

export interface Manuscript {
  id: number;
  display_label: string;
  historical_item: HistoricalItem;
  current_item: CurrentItem;
  msdesc_areas?: PublicMsDescArea[];
}

export interface ManuscriptImage {
  id: number;
  text: string;
  iiif_image: string;
  thumbnail: string;
  locus: string;
  number_of_annotations: number;
  number_of_image_annotations?: number;
  texts: {
    type: string;
    content: string;
  }[];
}
