'use client';

import * as React from 'react';
import { Table, TableHeader, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { IiifImage } from '@/components/ui/iiif-image';
import Link from 'next/link';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { ResultType } from '@/lib/search-types';
import type {
  ClauseListItem,
  GraphListItem,
  HandListItem,
  ImageListItem,
  ManuscriptListItem,
  PersonListItem,
  PlaceListItem,
  ResultMap,
  ScribeListItem,
  TextListItem,
} from '@/types/search';
import { getIiifImageUrl } from '@/utils/iiif';
import { useIiifThumbnailUrl } from '@/hooks/use-iiif-thumbnail';
import { useModelLabels } from '@/contexts/model-labels-context';
import type { ModelLabelKey } from '@/lib/model-labels';
import { Highlight, MatchSnippet } from './highlight';
import { CollectionStar } from '@/components/collection/collection-star';
import { clauseToGraphCollectionItem } from '@/lib/collection-item';
import type { CollectionItem } from '@/lib/collection-storage';
import { getImageDetailUrl, getGraphDetailUrl } from '@/lib/media-url';
import { SEARCH_RESULT_TYPES } from '@/lib/search-types';
import { GraphDetailLink } from '@/components/search/graph-detail-link';

export type Column<T> = {
  /** Stable identifier — used for visibleColumns matching and as fallback display text. */
  header: string;
  /** When set, the display header is resolved from model labels at render time. */
  labelKey?: ModelLabelKey;
  sortKey?: string;
  sortUrl?: string;
  formattedKey?: string;
  accessor: (item: T) => React.ReactNode;
  className?: string;
};

function makeColumn<T>(
  header: string,
  accessor: (item: T) => React.ReactNode,
  sortKey?: string,
  className?: string,
  formattedKey?: string,
  labelKey?: ModelLabelKey
): Column<T> {
  const inferredFormattedKey = sortKey?.replace(/_exact$/, '');
  return {
    header,
    labelKey,
    accessor,
    sortKey,
    className,
    formattedKey: formattedKey ?? inferredFormattedKey,
  };
}

type SearchFormattedFields = Record<string, string | undefined>;

function getFormattedFields(value: unknown): SearchFormattedFields | null {
  if (value == null || typeof value !== 'object') return null;
  const formatted = (value as { _formatted?: unknown })._formatted;
  if (formatted == null || typeof formatted !== 'object') return null;
  return formatted as SearchFormattedFields;
}

const repositoryCityColumn = <T extends { repository_city: string }>(): Column<T> =>
  makeColumn('Repository City', (item) => item.repository_city, 'repository_city_exact');

const repositoryColumn = <T extends { repository_name: string }>(): Column<T> =>
  makeColumn('Repository', (item) => item.repository_name, 'repository_name_exact');

const shelfmarkColumn = <T extends { shelfmark: string }>(): Column<T> =>
  makeColumn(
    'Shelfmark',
    (item) => item.shelfmark,
    'shelfmark_exact',
    undefined,
    undefined,
    'fieldShelfmark'
  );

const documentTypeColumn = <T extends { type: string }>(): Column<T> =>
  makeColumn('Document Type', (item) => item.type, 'type_exact');

const textDateColumn = <T extends { date?: string | null }>(): Column<T> =>
  makeColumn('Text Date', (item) => item.date ?? '—');

const textTypeColumn = <T extends { text_type: string }>(): Column<T> =>
  makeColumn('Text Type', (item) => item.text_type);

const catalogueNumColumn = <T extends { catalogue_numbers: string | string[] }>(): Column<T> =>
  makeColumn(
    'Cat. Num.',
    (item) => item.catalogue_numbers,
    undefined,
    undefined,
    undefined,
    'catalogueNumber'
  );

function GraphThumbnailCell({ graph }: { graph: GraphListItem }) {
  const infoUrl = (graph.image_iiif || '').trim();
  const src = useIiifThumbnailUrl(infoUrl, graph.coordinates);

  if (!infoUrl) return <span className="text-xs text-muted-foreground">N/A</span>;
  if (!src) {
    return (
      <div className="relative inline-block w-20 h-20 flex items-center justify-center bg-muted rounded overflow-hidden">
        <span className="text-xs text-muted-foreground">…</span>
      </div>
    );
  }
  return (
    <div className="relative z-[2] inline-block group w-20 h-20 flex items-center justify-center bg-muted rounded overflow-hidden">
      <IiifImage
        src={src}
        alt={`Thumbnail for ${graph.shelfmark}`}
        width={80}
        height={80}
        className="w-full h-full object-contain"
      />
      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/[0.05] transition-colors duration-200 pointer-events-none z-10" />
      <CollectionStar itemId={graph.id} itemType="graph" item={graph} size={16} />
    </div>
  );
}

function AnnotationInlinePreview({
  thumbnailIiif,
  coordinates,
  alt,
}: {
  thumbnailIiif: string | null;
  coordinates: string | null;
  alt: string;
}) {
  const infoUrl = (thumbnailIiif || '').trim();
  const src = useIiifThumbnailUrl(infoUrl, coordinates);

  if (!infoUrl || !src) return null;

  return (
    <IiifImage
      src={src}
      alt={alt}
      width={360}
      height={140}
      sizes="(max-width: 768px) 100vw, 360px"
      className="block h-auto w-full max-h-40 max-w-[360px] object-contain"
    />
  );
}

export const COLUMNS = {
  manuscripts: [
    repositoryCityColumn<ManuscriptListItem>(),
    repositoryColumn<ManuscriptListItem>(),
    shelfmarkColumn<ManuscriptListItem>(),
    makeColumn(
      'Catalogue Num.',
      (m: ManuscriptListItem) => m.catalogue_numbers,
      'catalogue_numbers_exact',
      undefined,
      undefined,
      'catalogueNumber'
    ),
    makeColumn('Text Date', (m: ManuscriptListItem) => m.date),
    makeColumn('Doc. Type', (m: ManuscriptListItem) => m.type, 'type_exact'),
    {
      header: 'Images',
      accessor: (m) =>
        typeof m.number_of_images === 'number' ? m.number_of_images.toLocaleString() : '—',
      className: 'text-center',
      sortKey: 'number_of_images_exact',
    },
    makeColumn('Format', (m: ManuscriptListItem) => m.format ?? '—', 'format_exact'),
    makeColumn('Display Label', (m: ManuscriptListItem) => m.display_label ?? '—'),
  ],

  images: [
    repositoryCityColumn<ImageListItem>(),
    repositoryColumn<ImageListItem>(),
    shelfmarkColumn<ImageListItem>(),
    makeColumn('Category Number', () => '—'),
    makeColumn('Doc. Type', (i: ImageListItem) => i.type, 'type_exact'),
    {
      header: 'Thumbnail',
      accessor: (i) => {
        const infoUrl = (i.image_iiif || '').trim();
        const src = infoUrl ? getIiifImageUrl(infoUrl, { thumbnail: true }) : '';

        if (!src) {
          return <span className="text-xs text-muted-foreground">N/A</span>;
        }

        return (
          <div className="relative z-[2] inline-block group w-20 h-20 flex items-center justify-center bg-muted rounded overflow-hidden">
            <IiifImage
              src={src}
              alt={i.shelfmark || 'Image thumbnail'}
              width={64}
              height={64}
              className="h-full w-auto object-contain"
            />
            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/[0.05] transition-colors duration-200 pointer-events-none z-10" />
            <CollectionStar itemId={i.id} itemType="image" item={i} size={16} />
          </div>
        );
      },
      className: 'text-center',
    },
    {
      header: 'Annotations',
      accessor: (i) => i.number_of_annotations,
      className: 'text-center',
      sortKey: 'number_of_annotations_exact',
    },
    makeColumn('Date', (i: ImageListItem) => i.date ?? '—'),
    makeColumn('Locus', (i: ImageListItem) => i.locus ?? '—'),
    makeColumn('Tags', (i: ImageListItem) => i.tags?.join(', ') ?? '—'),
  ],

  scribes: [
    makeColumn('Scribe Name', (s: ScribeListItem) => s.name, 'name_exact'),
    makeColumn('Date', (s: ScribeListItem) => s.period),
    makeColumn('Scriptorium', (s: ScribeListItem) => s.scriptorium, 'scriptorium_exact'),
    makeColumn('Period', (s: ScribeListItem) => s.period ?? '—'),
  ],

  hands: [
    makeColumn('Hand Title', (h: HandListItem) => h.name, 'name_exact'),
    repositoryCityColumn<HandListItem>(),
    repositoryColumn<HandListItem>(),
    shelfmarkColumn<HandListItem>(),
    makeColumn('Place', (h: HandListItem) => h.place, 'place_exact'),
    makeColumn('Date', (h: HandListItem) => h.date ?? '—'),
    {
      header: 'Catalogue Num.',
      labelKey: 'catalogueNumber' as ModelLabelKey,
      accessor: (h) => h.catalogue_numbers,
      sortKey: 'catalogue_numbers_exact',
    },
    makeColumn('Description', (h: HandListItem) => h.description ?? '—'),
  ],

  graphs: [
    repositoryCityColumn<GraphListItem>(),
    repositoryColumn<GraphListItem>(),
    shelfmarkColumn<GraphListItem>(),
    makeColumn('Document Date', (g: GraphListItem) => g.date),
    makeColumn('Allograph', (g: GraphListItem) => g.allograph ?? '—'),
    {
      header: 'Thumbnail',
      accessor: (g) => <GraphThumbnailCell graph={g} />,
      className: 'text-center',
    },
    makeColumn('Character', (g: GraphListItem) => g.character ?? '—', 'character_exact'),
    makeColumn(
      'Character Type',
      (g: GraphListItem) => g.character_type ?? '—',
      'character_type_exact'
    ),
    makeColumn('Hand Name', (g: GraphListItem) => g.hand_name ?? '—', 'hand_name_exact'),
  ],

  texts: [
    repositoryCityColumn<TextListItem>(),
    repositoryColumn<TextListItem>(),
    shelfmarkColumn<TextListItem>(),
    makeColumn('Text Type', (t: TextListItem) => t.text_type, 'text_type_exact'),
    makeColumn('MS Date', (t: TextListItem) => t.date ?? '—'),
    makeColumn('Locus', (t: TextListItem) => t.locus ?? '—'),
    makeColumn('Status', (t: TextListItem) => t.status ?? '—', 'status_exact'),
    makeColumn('Language', (t: TextListItem) => t.language ?? '—', 'language_exact'),
  ],

  clauses: [
    catalogueNumColumn<ClauseListItem>(),
    documentTypeColumn<ClauseListItem>(),
    repositoryCityColumn<ClauseListItem>(),
    repositoryColumn<ClauseListItem>(),
    shelfmarkColumn<ClauseListItem>(),
    textDateColumn<ClauseListItem>(),
    textTypeColumn<ClauseListItem>(),
    makeColumn('Clause Type', (c: ClauseListItem) => c.clause_type, 'clause_type_exact'),
    makeColumn('Locus', (c: ClauseListItem) => c.locus ?? '—'),
    makeColumn('Status', (c: ClauseListItem) => c.status ?? '—', 'status_exact'),
  ],

  people: [
    catalogueNumColumn<PersonListItem>(),
    documentTypeColumn<PersonListItem>(),
    repositoryCityColumn<PersonListItem>(),
    repositoryColumn<PersonListItem>(),
    shelfmarkColumn<PersonListItem>(),
    textDateColumn<PersonListItem>(),
    textTypeColumn<PersonListItem>(),
    makeColumn('Category', (p: PersonListItem) => p.person_type, 'person_type_exact'),
    makeColumn('Name', (p: PersonListItem) => p.name ?? '—'),
    makeColumn('Locus', (p: PersonListItem) => p.locus ?? '—'),
    makeColumn('Status', (p: PersonListItem) => p.status ?? '—', 'status_exact'),
  ],

  places: [
    catalogueNumColumn<PlaceListItem>(),
    documentTypeColumn<PlaceListItem>(),
    repositoryCityColumn<PlaceListItem>(),
    repositoryColumn<PlaceListItem>(),
    shelfmarkColumn<PlaceListItem>(),
    textDateColumn<PlaceListItem>(),
    textTypeColumn<PlaceListItem>(),
    makeColumn('Place Type', (p: PlaceListItem) => p.place_type, 'place_type_exact'),
    makeColumn('Name', (p: PlaceListItem) => p.name ?? '—'),
    makeColumn('Locus', (p: PlaceListItem) => p.locus ?? '—'),
    makeColumn('Status', (p: PlaceListItem) => p.status ?? '—', 'status_exact'),
  ],
} satisfies { [K in ResultType]: Column<ResultMap[K]>[] };

export const COLUMN_HEADERS_BY_TYPE: Record<ResultType, string[]> = Object.fromEntries(
  SEARCH_RESULT_TYPES.map((type) => [type, COLUMNS[type].map((column) => column.header)])
) as Record<ResultType, string[]>;

/* ---------- sub-row accessors (legacy two-row pattern) ---------- */

type SubRowAccessor<T> = (item: T) => string;
type PreviewAccessor<T> = (item: T) => React.ReactNode;

type ResultTypeDescriptor<K extends ResultType> = {
  columns: Column<ResultMap[K]>[];
  detailUrl: (item: ResultMap[K]) => string | null;
  subRowAccessor?: SubRowAccessor<ResultMap[K]>;
  previewAccessor?: PreviewAccessor<ResultMap[K]>;
  /** The connected graph to collect for this row, if any (clauses → its graph). */
  collectionItemAccessor?: (item: ResultMap[K]) => CollectionItem | null;
};

const RESULT_TYPE_DESCRIPTORS = {
  manuscripts: {
    columns: COLUMNS.manuscripts,
    detailUrl: (item: ManuscriptListItem) => `/manuscripts/${item.id}`,
  },
  images: {
    columns: COLUMNS.images,
    detailUrl: (item: ImageListItem) => getImageDetailUrl(item),
  },
  scribes: {
    columns: COLUMNS.scribes,
    detailUrl: (item: ScribeListItem) => `/scribes/${item.id}`,
  },
  hands: {
    columns: COLUMNS.hands,
    detailUrl: (item: HandListItem) => `/hands/${item.id}`,
  },
  graphs: {
    columns: COLUMNS.graphs,
    detailUrl: (item: GraphListItem) => getGraphDetailUrl(item),
  },
  texts: {
    columns: COLUMNS.texts,
    detailUrl: (item: TextListItem) => getImageDetailUrl(item),
    previewAccessor: (item: TextListItem) => (
      <AnnotationInlinePreview
        thumbnailIiif={item.thumbnail_iiif}
        coordinates={item.annotation_coordinates}
        alt={item.shelfmark || 'Text annotation'}
      />
    ),
  },
  clauses: {
    columns: COLUMNS.clauses,
    detailUrl: (item: ClauseListItem) => getImageDetailUrl(item),
    subRowAccessor: (item: ClauseListItem) => item.content,
    previewAccessor: (item: ClauseListItem) => (
      <AnnotationInlinePreview
        thumbnailIiif={item.thumbnail_iiif}
        coordinates={item.annotation_coordinates}
        alt={item.shelfmark || 'Clause annotation'}
      />
    ),
    collectionItemAccessor: (item: ClauseListItem) => clauseToGraphCollectionItem(item),
  },
  people: {
    columns: COLUMNS.people,
    detailUrl: (item: PersonListItem) => getImageDetailUrl(item),
    subRowAccessor: (item: PersonListItem) => item.name,
    previewAccessor: (item: PersonListItem) => (
      <AnnotationInlinePreview
        thumbnailIiif={item.thumbnail_iiif}
        coordinates={item.annotation_coordinates}
        alt={item.shelfmark || 'Person annotation'}
      />
    ),
  },
  places: {
    columns: COLUMNS.places,
    detailUrl: (item: PlaceListItem) => getImageDetailUrl(item),
    subRowAccessor: (item: PlaceListItem) => item.name,
    previewAccessor: (item: PlaceListItem) => (
      <AnnotationInlinePreview
        thumbnailIiif={item.thumbnail_iiif}
        coordinates={item.annotation_coordinates}
        alt={item.shelfmark || 'Place annotation'}
      />
    ),
  },
} satisfies { [K in ResultType]: ResultTypeDescriptor<K> };

function getDescriptor<K extends ResultType>(resultType: K): ResultTypeDescriptor<K> {
  return RESULT_TYPE_DESCRIPTORS[resultType] as ResultTypeDescriptor<K>;
}

function ResultsTableComponent<K extends ResultType>({
  resultType,
  results,
  ordering,
  onSort,
  highlightKeyword = '',
  visibleColumns,
  isFetching = false,
}: {
  resultType: K;
  results: ResultMap[K][];
  ordering?: {
    current: string;
    options: Array<{ name: string; text: string; url: string }>;
  };
  onSort?: (opts: { sortKey?: string; sortUrl?: string }) => void;
  highlightKeyword?: string;
  visibleColumns?: string[];
  isFetching?: boolean;
}) {
  const { getLabel } = useModelLabels();
  const resolveHeader = React.useCallback(
    (col: Column<ResultMap[K]>) => (col.labelKey ? getLabel(col.labelKey) : col.header),
    [getLabel]
  );
  const descriptor = React.useMemo(() => getDescriptor(resultType), [resultType]);
  const allCols = descriptor.columns;
  const baseCols = React.useMemo(
    () =>
      visibleColumns
        ? visibleColumns
            .map((h) => allCols.find((c) => c.header === h))
            .filter((c): c is NonNullable<typeof c> => c != null)
        : allCols,
    [allCols, visibleColumns]
  );
  const cols = React.useMemo(
    () =>
      ordering?.options
        ? baseCols.map((col) => {
            if (!col.sortKey) return col;
            // Server emits canonical attribute names (without `_exact`); columns
            // declare their sortKey in the same `_exact` convention used for
            // filters. Strip the suffix when looking up the ordering option.
            const canonicalKey = col.sortKey.replace(/_exact$/, '');
            const asc = ordering.options.find((o) => o.name === canonicalKey);
            const desc = ordering.options.find((o) => o.name === `-${canonicalKey}`);
            const next = ordering.current === canonicalKey ? desc || asc : asc || desc;
            return next ? { ...col, sortUrl: next.url } : col;
          })
        : baseCols,
    [baseCols, ordering]
  );

  const currKey = ordering?.current?.replace(/^-/, '');
  const isDesc = ordering?.current?.startsWith('-') ?? false;

  const { subRowAccessor, previewAccessor, collectionItemAccessor } = descriptor;
  const hasSubRow = !!subRowAccessor;
  const totalColSpan = cols.length + (hasSubRow ? 1 : 0);
  const rowKeyOf = React.useCallback((row: ResultMap[K], index: number): React.Key => {
    const withId = row as { id?: string | number };
    if (typeof withId.id === 'string' || typeof withId.id === 'number') return withId.id;
    const withShelfmark = row as { shelfmark?: string };
    if (withShelfmark.shelfmark) return `${withShelfmark.shelfmark}-${index}`;
    return index;
  }, []);

  const renderRow = React.useCallback(
    (row: ResultMap[K], ri: number) => {
      const rowUrl = descriptor.detailUrl(row);
      // Text-derived hits open the image viewer; carry the search term as ?q so
      // the transcription panel highlights + scrolls to the matched passage.
      const TEXT_HIT_TYPES = ['texts', 'clauses', 'people', 'places'];
      let rowHref = rowUrl ?? '#';
      if (rowUrl && highlightKeyword.trim() && TEXT_HIT_TYPES.includes(resultType)) {
        const term = highlightKeyword.trim().replace(/^["']|["']$/g, '');
        if (term) {
          rowHref = `${rowUrl}${rowUrl.includes('?') ? '&' : '?'}q=${encodeURIComponent(term)}`;
        }
      }
      const preview = previewAccessor ? previewAccessor(row) : null;
      const previewCollectionItem = collectionItemAccessor ? collectionItemAccessor(row) : null;
      const rowKey = rowKeyOf(row, ri);
      return (
        <tbody key={rowKey} className="group border-b">
          <TableRow
            className={`relative cursor-pointer transition-colors group-hover:bg-secondary/80 ${ri % 2 === 0 ? 'bg-secondary/30' : ''}${hasSubRow ? ' border-b-0' : ''}`}
          >
            {hasSubRow && (
              <TableCell className="w-16 py-1.5">
                <Link
                  href={rowHref}
                  className="absolute inset-0 z-[1]"
                  tabIndex={-1}
                  aria-hidden="true"
                />
                <Link
                  href={rowHref}
                  className="relative z-[2] inline-block text-xs text-primary border border-primary/30 rounded px-2 py-0.5 hover:bg-primary/5 transition-colors whitespace-nowrap"
                >
                  View
                </Link>
              </TableCell>
            )}
            {cols.map((col, ci) => {
              const cell = col.accessor(row);
              const isFirst = ci === 0 && !hasSubRow;
              const formattedFields = getFormattedFields(row);
              const formattedText =
                col.formattedKey && formattedFields ? formattedFields[col.formattedKey] : undefined;
              const inner =
                highlightKeyword && (typeof cell === 'string' || typeof cell === 'number') ? (
                  <Highlight
                    text={String(cell)}
                    keyword={highlightKeyword}
                    formattedText={typeof formattedText === 'string' ? formattedText : undefined}
                  />
                ) : (
                  cell
                );

              return (
                <TableCell key={ci} className={col.className}>
                  {isFirst ? (
                    resultType === 'graphs' ? (
                      <GraphDetailLink
                        graph={row as GraphListItem}
                        className="after:content-[''] after:absolute after:inset-0 after:z-[1]"
                      >
                        {inner}
                      </GraphDetailLink>
                    ) : (
                      <Link
                        href={rowHref}
                        className="after:content-[''] after:absolute after:inset-0 after:z-[1]"
                      >
                        {inner}
                      </Link>
                    )
                  ) : (
                    inner
                  )}
                </TableCell>
              );
            })}
          </TableRow>
          {['texts', 'clauses', 'people', 'places'].includes(resultType) &&
            highlightKeyword.trim() &&
            (() => {
              const ff = getFormattedFields(row);
              const content = ff?.content;
              if (typeof content !== 'string' || !content.includes('__hl_start__')) return null;
              return (
                <TableRow key={`${String(rowKey)}-snippet`}>
                  <TableCell
                    colSpan={totalColSpan}
                    className="border-b bg-muted/20 py-1.5 pl-4 pr-4 text-xs"
                  >
                    <span className="mb-0.5 block text-[10px] font-semibold uppercase text-muted-foreground">
                      Text match
                    </span>
                    <MatchSnippet formatted={content} />
                  </TableCell>
                </TableRow>
              );
            })()}
          {preview && (
            <TableRow className="relative cursor-pointer group-hover:bg-muted/50 transition-colors">
              <TableCell
                colSpan={totalColSpan}
                className={`py-1.5 ${hasSubRow ? 'pl-20' : 'pl-4'} text-sm text-muted-foreground`}
              >
                {previewCollectionItem ? (
                  // The clause's connected graph can be collected. The star is a
                  // sibling of the link (a button inside an anchor is invalid),
                  // sharing the image's positioning context so it sits over it.
                  <span className="relative inline-block">
                    <Link
                      href={rowHref}
                      className="inline-block after:content-[''] after:absolute after:inset-0 after:z-[1]"
                    >
                      <span className="relative z-[2] inline-block">{preview}</span>
                    </Link>
                    <CollectionStar
                      itemId={previewCollectionItem.id}
                      itemType="graph"
                      item={previewCollectionItem}
                      size={16}
                    />
                  </span>
                ) : (
                  <Link
                    href={rowHref}
                    className="after:content-[''] after:absolute after:inset-0 after:z-[1]"
                  >
                    <span className="relative z-[2] inline-block">{preview}</span>
                  </Link>
                )}
              </TableCell>
            </TableRow>
          )}
          {subRowAccessor && (
            <TableRow className="relative cursor-pointer group-hover:bg-muted/50 transition-colors">
              <TableCell
                colSpan={totalColSpan}
                className="py-1.5 pl-20 text-sm italic text-muted-foreground"
              >
                <Link
                  href={rowHref}
                  className="after:content-[''] after:absolute after:inset-0 after:z-[1]"
                >
                  {highlightKeyword ? (
                    <Highlight
                      text={subRowAccessor(row)}
                      keyword={highlightKeyword}
                      formattedText={(() => {
                        const f = getFormattedFields(row);
                        const keys = ['content', 'display_label', 'shelfmark', 'name'] as const;
                        for (const k of keys) {
                          const v = f?.[k];
                          if (typeof v === 'string' && v.includes('__hl_start__')) return v;
                        }
                        return undefined;
                      })()}
                    />
                  ) : (
                    subRowAccessor(row)
                  )}
                </Link>
              </TableCell>
            </TableRow>
          )}
        </tbody>
      );
    },
    [
      cols,
      collectionItemAccessor,
      descriptor,
      hasSubRow,
      highlightKeyword,
      previewAccessor,
      resultType,
      rowKeyOf,
      subRowAccessor,
      totalColSpan,
    ]
  );

  return (
    // The table flows in the document (no internal scroll). `overflow-visible`
    // on both this wrapper and the shared <Table>'s own wrapper lets the sticky
    // header anchor to the window; it sticks just below the site header.
    <div className="relative overflow-visible [&>div]:overflow-visible">
      <Table>
        {/* `[&_tr]:border-b-0` cancels the primitive's row border so the only
            divider is the th's sticky inset border (single line under the head). */}
        <TableHeader className="[&_tr]:border-b-0 [&_th]:sticky [&_th]:top-[var(--site-header-h,0px)] [&_th]:z-10 [&_th]:bg-secondary [&_th]:text-[11px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.05em] [&_th]:text-muted-foreground [&_th]:shadow-[inset_0_-1px_0_var(--border)]">
          <TableRow>
            {hasSubRow && <TableHead className="w-16" />}
            {cols.map((col) => {
              const sortable = !!(col.sortKey || col.sortUrl);
              const isSortedColumn = col.sortKey?.replace(/_exact$/, '') === currKey;
              const ariaSort: React.AriaAttributes['aria-sort'] = !sortable
                ? undefined
                : isSortedColumn
                  ? isDesc
                    ? 'descending'
                    : 'ascending'
                  : 'none';
              const label = resolveHeader(col);
              const indicator = (
                <>
                  {isSortedColumn &&
                    (isDesc ? (
                      <ArrowDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ArrowUp className="w-4 h-4 text-muted-foreground" />
                    ))}
                  {sortable && !isSortedColumn && (
                    <ArrowUp className="w-3 h-3 text-muted-foreground/40" />
                  )}
                </>
              );
              return (
                <TableHead key={col.header} className={col.className} aria-sort={ariaSort}>
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort?.({ sortKey: col.sortKey, sortUrl: col.sortUrl })}
                      title="Click to sort"
                      className="inline-flex items-center space-x-1 text-left uppercase tracking-[inherit] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    >
                      <span>{label}</span>
                      {indicator}
                    </button>
                  ) : (
                    <div className="inline-flex items-center space-x-1">
                      <span>{label}</span>
                    </div>
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        {results.map((row, ri) => renderRow(row, ri))}
      </Table>
      {isFetching && (
        <div className="pointer-events-none absolute inset-0 rounded-lg bg-card/35 animate-pulse" />
      )}
    </div>
  );
}

export const ResultsTable = React.memo(ResultsTableComponent) as typeof ResultsTableComponent;
