// ── Pagination ──────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// ── Common ──────────────────────────────────────────────────────────────

export interface BackofficeDate {
  id: number
  date: string
  min_weight: number
  max_weight: number
}

// ── Symbols ─────────────────────────────────────────────────────────────

export const CHARACTER_TYPES = [
  'Majuscule Letter',
  'Minuscule Letter',
  'Numeral',
  'Punctuation',
  'Symbol',
  'Accent',
] as const

export interface Feature {
  id: number
  name: string
}

export interface Component {
  id: number
  name: string
  features: number[]
}

export interface Position {
  id: number
  name: string
}

export interface CharacterListItem {
  id: number
  name: string
  type: string | null
  allograph_count: number
}

/** Nested feature within an allograph component (read shape). */
export interface AllographComponentFeatureNested {
  id: number
  name: string
  set_by_default: boolean
}

/** Nested component within an allograph (read shape). */
export interface AllographComponentNested {
  id: number
  component_id: number
  component_name: string
  features: AllographComponentFeatureNested[]
}

/** Nested allograph within a character detail (read shape). */
export interface AllographNested {
  id: number
  name: string
  components: AllographComponentNested[]
}

export interface CharacterDetail {
  id: number
  name: string
  type: string | null
  allographs: AllographNested[]
}

/** Payload for the update-structure endpoint. */
export interface CharacterStructurePayload {
  name?: string
  type?: string | null
  allographs: {
    id?: number
    name: string
    components?: {
      id?: number
      component_id: number
      features?: { id: number; set_by_default: boolean }[]
    }[]
  }[]
}

// ── Manuscripts ─────────────────────────────────────────────────────────

export interface Repository {
  id: number
  name: string
  label: string
  place: string
  url: string | null
  type: string | null
}

export interface BibliographicSource {
  id: number
  name: string
  label: string
}

export interface ItemFormat {
  id: number
  name: string
}

export interface CatalogueNumber {
  id: number
  historical_item: number
  number: string
  catalogue: number
  catalogue_label: string
  url: string | null
}

export interface HistoricalItemDescription {
  id: number
  historical_item: number
  source: number
  source_label: string
  content: string
}

export interface ItemPartImage {
  id: number
  image: string | null
  locus: string
  text_count: number
}

export interface ItemPartNested {
  id: number
  custom_label: string
  current_item: number | null
  current_item_display: string | null
  current_item_locus: string
  display_label: string
  images: ItemPartImage[]
}

export interface HistoricalItemListItem {
  id: number
  type: string
  format: number | null
  format_display: string | null
  language: string | null
  hair_type: string | null
  date: number | null
  date_display: string | null
  catalogue_numbers_display: string
  part_count: number
}

export interface HistoricalItemDetail {
  id: number
  type: string
  format: number | null
  format_display: string | null
  language: string | null
  hair_type: string | null
  date: number | null
  date_display: string | null
  catalogue_numbers: CatalogueNumber[]
  descriptions: HistoricalItemDescription[]
  item_parts: ItemPartNested[]
}

// ── Scribes ─────────────────────────────────────────────────────────────

export interface ScribeListItem {
  id: number
  name: string
  period: number | null
  period_display: string | null
  scriptorium: string
  hand_count: number
}

export interface HandListItem {
  id: number
  name: string
  scribe: number
  scribe_name: string
  item_part: number
  item_part_display: string
  script: number | null
  script_name: string | null
  date: number | null
  date_display: string | null
  place: string
  description: string
  item_part_images: number[]
}

export interface Script {
  id: number
  name: string
}

// ── Publications ────────────────────────────────────────────────────────

export interface PublicationListItem {
  id: number
  title: string
  slug: string
  status: 'Draft' | 'Published'
  is_blog_post: boolean
  is_news: boolean
  is_featured: boolean
  author: number
  author_name: string | null
  published_at: string | null
  created_at: string
  comment_count: number
}

export interface PublicationDetail extends PublicationListItem {
  content: string
  preview: string
  keywords: string
  allow_comments: boolean
  similar_posts: number[]
  updated_at: string
}

export interface EventItem {
  id: number
  title: string
  slug: string
  content: string
  created_at: string
  updated_at: string
}

export interface CommentItem {
  id: number
  post: number
  post_title: string
  content: string
  author_name: string
  author_email: string
  author_website: string | null
  is_approved: boolean
  created_at: string
  updated_at: string
}

export interface CarouselItem {
  id: number
  title: string
  url: string
  image: string
  ordering: number
}

// ── Annotations ─────────────────────────────────────────────────────────

export interface GraphComponentNested {
  id: number
  graph: number
  component: number
  component_name: string
  features: number[]
}

export interface GraphItem {
  id: number
  item_image: number
  image_display: string
  annotation: Record<string, unknown>
  annotation_type: string | null
  allograph: number
  allograph_name: string
  hand: number
  hand_name: string
  positions: number[]
  graphcomponent_set: GraphComponentNested[]
}
