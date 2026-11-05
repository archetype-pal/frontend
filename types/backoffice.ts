import type { MsDescAreaId } from '@/lib/msdesc-vocab';

// ── Pagination ──────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Common ──────────────────────────────────────────────────────────────

export interface BackofficeDate {
  id: number;
  date: string;
  min_weight: number;
  max_weight: number;
}

export interface BackofficePlace {
  id: number;
  name: string;
}

// ── Symbols ─────────────────────────────────────────────────────────────

export const CHARACTER_TYPES = [
  'Majuscule Letter',
  'Minuscule Letter',
  'Numeral',
  'Punctuation',
  'Symbol',
  'Accent',
] as const;

export interface Feature {
  id: number;
  name: string;
}

export interface Component {
  id: number;
  name: string;
  features: number[];
}

export interface Position {
  id: number;
  name: string;
}

export interface CharacterListItem {
  id: number;
  name: string;
  type: string | null;
  allograph_count: number;
}

/** Nested feature within an allograph component (read shape). */
export interface AllographComponentFeatureNested {
  id: number;
  name: string;
  set_by_default: boolean;
}

/** Nested component within an allograph (read shape). */
export interface AllographComponentNested {
  id: number;
  component_id: number;
  component_name: string;
  features: AllographComponentFeatureNested[];
}

/** Nested allograph within a character detail (read shape). */
export interface AllographNested {
  id: number;
  name: string;
  components: AllographComponentNested[];
}

export interface CharacterDetail {
  id: number;
  name: string;
  type: string | null;
  allographs: AllographNested[];
}

/** Payload for the update-structure endpoint. */
export interface CharacterStructurePayload {
  name?: string;
  type?: string | null;
  allographs: {
    id?: number;
    name: string;
    components?: {
      id?: number;
      component_id: number;
      features?: { id: number; set_by_default: boolean }[];
    }[];
  }[];
}

// ── Manuscripts ─────────────────────────────────────────────────────────

export interface Repository {
  id: number;
  name: string;
  label: string;
  place: number | null;
  place_display: string | null;
  url: string | null;
  type: string | null;
  current_item_count?: number;
}

export interface BibliographicSource {
  id: number;
  name: string;
  label: string;
}

export interface ItemFormat {
  id: number;
  name: string;
}

export interface CatalogueNumber {
  id: number;
  historical_item: number;
  number: string;
  catalogue: number;
  catalogue_label: string;
  url: string | null;
}

export interface HistoricalItemOrigin {
  id: number;
  historical_item: number;
  place: number;
  place_display: string;
  evidence: string;
  dubitable: boolean;
}

export interface HistoricalItemDescription {
  id: number;
  historical_item: number;
  source: number;
  source_label: string;
  content: string;
}

/** One TEI msDesc area fragment; unique per (item_part, area). */
export interface MsDescArea {
  id: number;
  item_part: number;
  area: MsDescAreaId;
  content: string;
  is_published: boolean;
}

export interface ItemPartImage {
  id: number;
  image: string | null;
  image_path: string | null;
  locus: string;
  tags: string[];
  text_count: number;
}

export interface ItemPartNested {
  id: number;
  custom_label: string;
  current_item: number | null;
  current_item_display: string | null;
  current_item_locus: string;
  display_label: string;
  repository: number | null;
  repository_name: string | null;
  shelfmark: string | null;
  images: ItemPartImage[];
  /** TEI msDesc areas (0–4 rows; unpublished included — management payload). */
  msdesc_areas: MsDescArea[];
}

export interface CurrentItemOption {
  id: number;
  description: string;
  repository: number;
  repository_name: string;
  shelfmark: string;
  part_count: number;
}

export interface HistoricalItemListItem {
  id: number;
  type: string;
  format: number | null;
  format_display: string | null;
  language: string | null;
  hair_type: string | null;
  date: number | null;
  date_display: string | null;
  catalogue_numbers_display: string;
  part_count: number;
  location_display: string | null;
  repository_label: string | null;
  shelfmark: string | null;
  image_count: number;
}

export interface HistoricalItemDetail {
  id: number;
  type: string;
  format: number | null;
  format_display: string | null;
  language: string | null;
  hair_type: string | null;
  date: number | null;
  date_display: string | null;
  probable_text_date: string;
  dating_notes: string;
  catalogue_numbers: CatalogueNumber[];
  descriptions: HistoricalItemDescription[];
  origins: HistoricalItemOrigin[];
  item_parts: ItemPartNested[];
}

// ── Scribes ─────────────────────────────────────────────────────────────

export interface AdminScribeListItem {
  id: number;
  name: string;
  period: number | null;
  period_display: string | null;
  scriptorium: number | null;
  scriptorium_display: string | null;
  hand_count: number;
}

export interface AdminHandListItem {
  id: number;
  name: string;
  scribe: number;
  scribe_name: string;
  item_part: number;
  item_part_display: string;
  script: number | null;
  script_name: string | null;
  display_order: number;
  date: number | null;
  date_display: string | null;
  place: number | null;
  place_display: string | null;
  descriptions: HandDescription[];
  item_part_images: number[];
}

export interface HandDescription {
  id: number;
  hand: number;
  source: number | null;
  source_label: string | null;
  content: string;
}

export interface Script {
  id: number;
  name: string;
}

// ── Publications ────────────────────────────────────────────────────────

export interface PublicationListItem {
  id: number;
  title: string;
  slug: string;
  status: 'Draft' | 'Published';
  is_blog_post: boolean;
  is_news: boolean;
  is_featured: boolean;
  author: number;
  author_name: string | null;
  published_at: string | null;
  created_at: string;
  comment_count: number;
}

export interface PublicationDetail extends PublicationListItem {
  content: string;
  preview: string;
  keywords: string;
  allow_comments: boolean;
  similar_posts: number[];
  updated_at: string;
}

export interface CommentItem {
  id: number;
  post: number;
  post_title: string;
  post_slug: string;
  parent_author_name: string | null;
  parent_content: string | null;
  content: string;
  author_name: string;
  author_email: string;
  author_website: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface CarouselItem {
  id: number;
  title: string;
  url: string;
  image: string;
  ordering: number;
}

export interface PartnerItem {
  id: number;
  name: string;
  url: string;
  logo: string;
  ordering: number;
}

// ── Users ──────────────────────────────────────────────────────────────

export interface UserListItem {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export type UserDetail = UserListItem;

export interface UserCreatePayload {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
}

export interface UserUpdatePayload {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  password?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  is_active?: boolean;
}

// ── Annotations ─────────────────────────────────────────────────────────

export interface GraphComponentNested {
  id: number;
  graph: number;
  component: number;
  component_name: string;
  features: number[];
}

export interface GraphItem {
  id: number;
  item_image: number;
  image_display: string;
  historical_item: number;
  annotation: Record<string, unknown>;
  annotation_type: string | null;
  // Null for editorial and TEXT-typed graphs: the backend's
  // graph_editorial_or_required_allograph_hand constraint only requires these
  // for image graphs.
  allograph: number | null;
  allograph_name: string | null;
  hand: number | null;
  hand_name: string | null;
  positions: number[];
  graphcomponent_set: GraphComponentNested[];
  created: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export type GraphProposalStatus = 'pending' | 'accepted' | 'rejected';

/**
 * A machine-proposed annotation awaiting a human decision (AI programme W0.5).
 * Read-only: the only writes are the accept and reject actions.
 */
export interface GraphProposalItem {
  id: number;
  item_image: number;
  image_display: string;
  /** The page's IIIF info.json URL; null when the image server can't address it. */
  image_iiif: string | null;
  historical_item: number;
  /** GeoJSON Feature in the page's pixel space, Y-up, as on a graph. */
  annotation: Record<string, unknown>;
  allograph: number | null;
  allograph_name: string | null;
  // Null when the page's part has no hand recorded. An image proposal without
  // one cannot be accepted: Graph's check constraint requires both.
  hand: number | null;
  hand_name: string | null;
  annotation_type: 'image' | 'text' | 'editorial';
  confidence: number | null;
  ml_job: number | null;
  model_name: string;
  status: GraphProposalStatus;
  reviewer: number | null;
  reviewer_username: string;
  reviewed: string | null;
  reason: string;
  accepted_graph: number | null;
  created: string;
}

/** The charter transcription a diplomatic proposal was read from. */
export interface DiplomaticProposalSource {
  image_text: number;
  type: string;
  item_image: number;
  /** With `item_image`, the viewer's route: /manuscripts/<part>/images/<image>. */
  item_part: number;
  historical_item: number;
  label: string;
  /** The catalogue date; what a W3.2 verdict was judged against. Empty when undated. */
  date: string;
}

export interface ProposedEntity {
  role: string;
  name: string;
  normalised?: string;
  note?: string;
}

export interface ProposedFormula {
  kind: string;
  label: string;
  excerpt?: string;
  published_type?: string;
}

export interface ProposedTriple {
  subject: string;
  predicate: string;
  object: string;
}

/**
 * A pipeline's parsed answer. Its shape depends on the pipeline: W2.1
 * `entities`, W2.2 `formulae`, W2.4 `translation` and `notes`, W3.2 a
 * `verdict` with its evidence, W3.3 `triples`.
 */
export interface DiplomaticPayload {
  entities?: ProposedEntity[];
  formulae?: ProposedFormula[];
  triples?: ProposedTriple[];
  translation?: string;
  notes?: string;
  verdict?: string;
  evidence?: string;
  reasoning?: string;
  suggested_range?: string;
  [key: string]: unknown;
}

/** A machine-authored diplomatic proposal (AI programme Phases 2–3). Read-only. */
export interface DiplomaticProposalItem {
  id: number;
  pipeline: string;
  source_type: string;
  source_id: number;
  /** Null when the source is not a transcription, or no longer exists. */
  source: DiplomaticProposalSource | null;
  payload: DiplomaticPayload;
  confidence: number | null;
  ml_job: number | null;
  model_name: string;
  status: GraphProposalStatus;
  reviewer: number | null;
  reviewer_username: string;
  reviewed: string | null;
  reason: string;
  /**
   * Positions in the payload's list that the reviewer left out when accepting
   * the rest. Empty when accepted whole, rejected, or still pending.
   */
  dropped_items: number[];
  created: string;
}

export interface DiplomaticProposalDetail extends DiplomaticProposalItem {
  /** The charter text as the model read it: TEI stripped, truncated past 12,000 characters. */
  source_text: string;
}

// ── Inference ledger ────────────────────────────────────────────────────

export type MLJobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'refused';

export type PageDraftStatus = 'queued' | 'working' | 'drafted' | 'failed' | 'refused';

/**
 * A user's request that a model draft one page's transcription (AI programme
 * W1.4). What it files is an ordinary Draft, marked machine-drafted, for review.
 */
export interface PageDraft {
  id: number;
  item_image: number;
  status: PageDraftStatus;
  /** Why it stopped, fit to show; empty unless it failed or was refused. */
  error: string;
  requested_by: string | null;
  /** The Draft transcription it filed. */
  image_text: number | null;
  ml_job: number | null;
  cost_micros: number | null;
  created: string;
  updated: string;
}

/** One model call, as the ledger records it (AI programme W0.1). Append-only. */
export interface MLJobListItem {
  id: number;
  /** The programme item that made the call ("W2.1"), or a named routine. */
  task: string;
  provider: string;
  model_name: string;
  model_version: string;
  status: MLJobStatus;
  /** Millionths of `cost_currency`. An integer, never a float. */
  cost_micros: number;
  cost_currency: string;
  duration_ms: number | null;
  created: string;
}

export interface MLJobDetail extends MLJobListItem {
  /** sha256 of the prompt. The prompt itself is not stored. */
  prompt_hash: string;
  /** sha256 of the inputs. */
  input_ref: string;
  params: Record<string, unknown>;
  error: string;
  input_tokens: number;
  output_tokens: number;
  actor: number | null;
  actor_username: string;
  celery_task_id: string;
  /** The records the call produced or changed. */
  targets: { target_type: string; target_id: number }[];
}

/** The spend breaker's state over its trailing window. */
export interface MLJobSummary {
  inference_enabled: boolean;
  hosted_providers_enabled: boolean;
  window: string;
  spend_micros: number;
  /** 0 means no cap. */
  cap_micros: number;
  per_actor_cap_micros: number;
  /** What the window's costs were in; more than one means the caps add unlike amounts. */
  currencies: string[];
  by_status: Record<MLJobStatus, number>;
  tasks: { task: string; count: number }[];
}
