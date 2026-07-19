/**
 * msDesc vocabulary module (TEI descriptions roadmap Phase 0.2) — the msDesc
 * analog of the charter editor's `SEG_TYPES`: one source of truth for the four
 * description areas, the ODD's controlled attribute vocabularies, the
 * prose-vs-phrase leaf classification, and each area's element palette.
 *
 * Derived from `msdesc-minimal/msdesc-minimal.odd` (valItem lists transcribed
 * verbatim) and `msdesc-minimal-template.xml` (area skeletons). Canonical TEI
 * attribute values (e.g. `@material="perg"`) are serialized untranslated; the
 * display labels this module points at are next-intl KEYS relative to the
 * `backoffice` namespace (components call `useTranslations('backoffice')`).
 */

// ── Description areas ───────────────────────────────────────────────────

/** The four msDesc areas — one `MsDescArea` row per `(item_part, area)`. */
export const MSDESC_AREAS = ['msIdentifier', 'msContents', 'physDesc', 'history'] as const;

export type MsDescAreaId = (typeof MSDESC_AREAS)[number];

/** next-intl label key (relative to `backoffice`) for an area tab. */
export function msdescAreaLabelKey(area: MsDescAreaId): string {
  return `msdesc.areas.${area}`;
}

// ── Controlled vocabularies (ODD valItem lists) ─────────────────────────

/** `objectDesc/@form` (closed list). */
export const OBJECT_DESC_FORMS = [
  'codex',
  'roll',
  'sheet',
  'faltbuch',
  'roll-codex',
  'other',
  'unknown',
] as const;

export type ObjectDescForm = (typeof OBJECT_DESC_FORMS)[number];

/** `supportDesc/@material` (closed list). */
export const SUPPORT_MATERIALS = [
  'perg',
  'chart',
  'papyrus',
  'palm',
  'mixed',
  'other',
  'unknown',
] as const;

export type SupportMaterial = (typeof SUPPORT_MATERIALS)[number];

/** `handNote/@script` (semi-open list, Bodleian–Cambridge guidelines). */
export const HAND_SCRIPTS = [
  'capitalsSquare',
  'capitalsRustic',
  'uncial',
  'halfUncial',
  'minusculeInsular',
  'minusculeVernacular',
  'minusculeCaroline',
  'minuscule',
  'protogothic',
  'textualisNorthern',
  'textualisSouthern',
  'semitextualis',
  'cursivaAntiquior',
  'cursiva',
  'hybrida',
  'gothicoAntiqua',
  'humanisticaTextualis',
  'humanisticaSemitextualis',
  'humanisticaCursiva',
] as const;

export type HandScript = (typeof HAND_SCRIPTS)[number];

/** `handNote/@execution` (consolidated-msdesc addition to base TEI). */
export const HAND_EXECUTIONS = ['formata', 'libraria', 'currens'] as const;

export type HandExecution = (typeof HAND_EXECUTIONS)[number];

/** `decoNote/@type` (semi-open list). */
export const DECO_NOTE_TYPES = [
  'border',
  'diagram',
  'drawing',
  'histInit',
  'decInit',
  'flourInit',
  'colInit',
  'plainInit',
  'illustration',
  'initial',
  'marginal',
  'miniature',
  'rubrication',
  'bas-de-page',
  'map',
  'headpiece',
  'chrysography',
  'lineFill',
  'cadel',
  'instructions',
  'unfilled',
  'none',
  'other',
] as const;

export type DecoNoteType = (typeof DECO_NOTE_TYPES)[number];

/** `availability/@status` (semi-open list). */
export const AVAILABILITY_STATUSES = [
  'free',
  'restricted',
  'exhibition',
  'offsite',
  'printcat',
  'none',
  'unknown',
] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

/** `layout/@topLine` (closed list, consolidated-msdesc addition to base TEI). */
export const LAYOUT_TOP_LINES = ['above', 'below', 'mixed'] as const;

export type LayoutTopLine = (typeof LAYOUT_TOP_LINES)[number];

/**
 * `layout/@rulingMedium` — free text in the ODD; these are its documented
 * suggested values (semi-open), so a form may still accept other strings.
 */
export const RULING_MEDIA = [
  'leadpoint',
  'hardpoint',
  'ink',
  'drypoint',
  'crayon',
  'mixed',
  'unknown',
] as const;

export type RulingMedium = (typeof RULING_MEDIA)[number];

/** Vocabulary id → value list; ids double as the label-key segment. */
export const MSDESC_VOCABS = {
  form: OBJECT_DESC_FORMS,
  material: SUPPORT_MATERIALS,
  script: HAND_SCRIPTS,
  execution: HAND_EXECUTIONS,
  decoType: DECO_NOTE_TYPES,
  availabilityStatus: AVAILABILITY_STATUSES,
  topLine: LAYOUT_TOP_LINES,
  rulingMedium: RULING_MEDIA,
} as const;

export type MsDescVocabId = keyof typeof MSDESC_VOCABS;

export type MsDescVocabValue<V extends MsDescVocabId> = (typeof MSDESC_VOCABS)[V][number];

/** next-intl label key (relative to `backoffice`) for a vocabulary value. */
export function msdescVocabLabelKey<V extends MsDescVocabId>(
  vocab: V,
  value: MsDescVocabValue<V>
): string {
  return `msdesc.vocab.${vocab}.${value}`;
}

// ── Leaf classification (roadmap 0.2 / findings §8.1) ───────────────────

/**
 * `<p>`-rooted prose leaves: their inner `<p>`-sequence round-trips
 * byte-exact through the Phase-H rich editor, so they are rich-editable
 * (the form/section layer owns the container element itself; `summary` is
 * specialPara content authored as prose).
 */
export const MSDESC_PROSE_LEAVES = ['provenance', 'decoNote', 'layout', 'summary', 'note'] as const;

export type MsDescProseLeaf = (typeof MSDESC_PROSE_LEAVES)[number];

/**
 * Phrase-content leaves: they cannot legally contain `<p>`, so they fail the
 * byte-exact rich gate — edited as plain form fields with the `@key`/`@target`
 * stamping shim (roadmap 3.2) instead of the rich editor.
 */
export const MSDESC_PHRASE_LEAVES = ['author', 'origPlace', 'origDate', 'title'] as const;

export type MsDescPhraseLeaf = (typeof MSDESC_PHRASE_LEAVES)[number];

// ── Per-area element palettes ───────────────────────────────────────────

/**
 * The elements each area's canonical skeleton contains, derived from
 * `msdesc-minimal-template.xml` (including its commented-out optional
 * elements). `<p>` is listed only where the skeleton itself carries
 * `<p>`-sequences; inline phrase markup (persName, date, q, hi, ref, …) is
 * the rich editor's concern and is deliberately not listed here.
 */
export const MSDESC_AREA_PALETTES = {
  msIdentifier: [
    'country',
    'settlement',
    'institution',
    'repository',
    'idno',
    'msName',
    'altIdentifier',
  ],
  msContents: [
    'summary',
    'textLang',
    'msItem',
    'locus',
    'author',
    'title',
    'rubric',
    'incipit',
    'explicit',
    'finalRubric',
    'note',
    'bibl',
  ],
  physDesc: [
    'objectDesc',
    'supportDesc',
    'support',
    'material',
    'extent',
    'measure',
    'dimensions',
    'height',
    'width',
    'foliation',
    'collation',
    'catchwords',
    'signatures',
    'condition',
    'layoutDesc',
    'layout',
    'handDesc',
    'handNote',
    'decoDesc',
    'summary',
    'decoNote',
    'additions',
    'bindingDesc',
    'binding',
    'accMat',
    'p',
  ],
  history: [
    'origin',
    'origDate',
    'origPlace',
    'country',
    'region',
    'settlement',
    'provenance',
    'acquisition',
    'p',
  ],
} as const satisfies Record<MsDescAreaId, readonly string[]>;
