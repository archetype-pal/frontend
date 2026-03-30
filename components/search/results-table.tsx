'use client';

import * as React from 'react';
import { Table, TableHeader, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { useVirtualizer } from '@tanstack/react-virtual';
import Image from 'next/image';
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
import { Highlight } from './highlight';
import { CollectionStar } from '@/components/collection/collection-star';
import { getImageDetailUrl, getGraphDetailUrl } from '@/lib/media-url';
import {
  SEARCH_RESULT_TYPES,
  SEARCH_RESULT_CONFIG,
  getRowCrossTypeTargets,
  buildShelfmarkFilterUrl,
} from '@/lib/search-types';
import { GraphDetailLink } from '@/components/search/graph-detail-link';

export type Column<T> = {
  header: string;
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
  formattedKey?: string
): Column<T> {
  const inferredFormattedKey = sortKey?.replace(/_exact$/, '');
  return {
    header,
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
  makeColumn('Shelfmark', (item) => item.shelfmark, 'shelfmark_exact');

const documentTypeColumn = <T extends { type: string }>(): Column<T> =>
  makeColumn('Document Type', (item) => item.type, 'type_exact');

const textDateColumn = <T extends { date?: string | null }>(): Column<T> =>
  makeColumn('Text Date', (item) => item.date ?? '—');

const textTypeColumn = <T extends { text_type: string }>(): Column<T> =>
  makeColumn('Text Type', (item) => item.text_type);

const catalogueNumColumn = <T extends { catalogue_numbers: string | string[] }>(): Column<T> =>
  makeColumn('Cat. Num.', (item) => item.catalogue_numbers);

function GraphThumbnailCell({ graph }: { graph: GraphListItem }) {
  const infoUrl = (graph.image_iiif || '').trim();
  const src = useIiifThumbnailUrl(infoUrl, graph.coordinates);

  if (!infoUrl) return <span className="text-xs text-muted-foreground">N/A</span>;
  if (!src) {
    return (
      <div className="relative inline-block w-20 h-20 flex items-center justify-center bg-gray-50 rounded overflow-hidden">
        <span className="text-xs text-muted-foreground">…</span>
      </div>
    );
  }
  return (
    <div className="relative z-[2] inline-block group w-20 h-20 flex items-center justify-center bg-gray-50 rounded overflow-hidden">
      <Image
        src={src}
        alt={`Thumbnail for ${graph.shelfmark}`}
        width={80}
        height={80}
        className="w-full h-full object-contain"
        unoptimized
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 pointer-events-none z-10" />
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
    <Image
      src={src}
      alt={alt}
      width={360}
      height={140}
      sizes="(max-width: 768px) 100vw, 360px"
      className="block h-auto w-full max-h-40 max-w-[360px] object-contain"
      unoptimized
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
      'catalogue_numbers_exact'
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
          <div className="relative z-[2] inline-block group w-20 h-20 flex items-center justify-center bg-gray-50 rounded overflow-hidden">
            <Image
              src={src}
              alt={i.shelfmark || 'Image thumbnail'}
              width={64}
              height={64}
              className="h-full w-auto object-contain"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 pointer-events-none z-10" />
            <CollectionStar itemId={i.id} itemType="image" item={i} size={16} />
          </div>
        );
      },
      className: 'text-center',
    },
    {
      header: 'Ann.',
      accessor: (i) => i.number_of_annotations,
      className: 'text-center',
      sortKey: 'number_of_annotations_exact',
    },
  ],

  scribes: [
    makeColumn('Scribe Name', (s: ScribeListItem) => s.name, 'name_exact'),
    makeColumn('Date', (s: ScribeListItem) => s.period),
    makeColumn('Scriptorium', (s: ScribeListItem) => s.scriptorium, 'scriptorium_exact'),
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
      accessor: (h) => h.catalogue_numbers,
      sortKey: 'catalogue_numbers_exact',
    },
  ],

  graphs: [
    repositoryCityColumn<GraphListItem>(),
    repositoryColumn<GraphListItem>(),
    shelfmarkColumn<GraphListItem>(),
    makeColumn('Document Date', (g: GraphListItem) => g.date),
    makeColumn('Allograph', (g: GraphListItem) => (g.is_annotated ? 'Yes' : 'No')),
    {
      header: 'Thumbnail',
      accessor: (g) => <GraphThumbnailCell graph={g} />,
      className: 'text-center',
    },
  ],

  texts: [
    repositoryCityColumn<TextListItem>(),
    repositoryColumn<TextListItem>(),
    shelfmarkColumn<TextListItem>(),
    makeColumn('Text Type', (t: TextListItem) => t.text_type, 'text_type_exact'),
    makeColumn('MS Date', (t: TextListItem) => t.date ?? '—'),
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
  ],

  places: [
    catalogueNumColumn<PlaceListItem>(),
    documentTypeColumn<PlaceListItem>(),
    repositoryCityColumn<PlaceListItem>(),
    repositoryColumn<PlaceListItem>(),
    shelfmarkColumn<PlaceListItem>(),
    textDateColumn<PlaceListItem>(),
    textTypeColumn<PlaceListItem>(),
    makeColumn('Clause Type', (p: PlaceListItem) => p.place_type, 'place_type_exact'),
  ],
} satisfies { [K in ResultType]: Column<ResultMap[K]>[] };

export const COLUMN_HEADERS_BY_TYPE: Record<ResultType, string[]> = Object.fromEntries(
  SEARCH_RESULT_TYPES.map((type) => [type, COLUMNS[type].map((column) => column.header)])
) as Record<ResultType, string[]>;

/* ---------- sub-row accessors (legacy two-row pattern) ---------- */

type SubRowAccessor<T> = (item: T) => string;
type PreviewAccessor<T> = (item: T) => React.ReactNode;

type CrossTypeLink = { label: string; href: string };
type CrossTypeLinksFn<T> = (item: T) => CrossTypeLink[];

type ResultTypeDescriptor<K extends ResultType> = {
  columns: Column<ResultMap[K]>[];
  detailUrl: (item: ResultMap[K]) => string | null;
  subRowAccessor?: SubRowAccessor<ResultMap[K]>;
  previewAccessor?: PreviewAccessor<ResultMap[K]>;
  crossTypeLinks?: CrossTypeLinksFn<ResultMap[K]>;
};

function isComparableType(resultType: ResultType): boolean {
  return resultType === 'manuscripts' || resultType === 'graphs';
}

function buildCrossTypeLinks<T extends { shelfmark: string }>(
  resultType: ResultType
): CrossTypeLinksFn<T> | undefined {
  const targets = getRowCrossTypeTargets(resultType);
  if (!targets) return undefined;
  return (item: T) =>
    targets.map((target) => ({
      label: SEARCH_RESULT_CONFIG[target].label,
      href: buildShelfmarkFilterUrl(target, item.shelfmark),
    }));
}

const RESULT_TYPE_DESCRIPTORS = {
  manuscripts: {
    columns: COLUMNS.manuscripts,
    detailUrl: (item: ManuscriptListItem) => `/manuscripts/${item.id}`,
    crossTypeLinks: buildCrossTypeLinks<ManuscriptListItem>('manuscripts'),
  },
  images: {
    columns: COLUMNS.images,
    detailUrl: (item: ImageListItem) => getImageDetailUrl(item),
    crossTypeLinks: buildCrossTypeLinks<ImageListItem>('images'),
  },
  scribes: {
    columns: COLUMNS.scribes,
    detailUrl: (item: ScribeListItem) => `/scribes/${item.id}`,
  },
  hands: {
    columns: COLUMNS.hands,
    detailUrl: (item: HandListItem) => `/hands/${item.id}`,
    crossTypeLinks: buildCrossTypeLinks<HandListItem>('hands'),
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
  scrollContainerRef,
  isFetching = false,
  compareSelection = [],
  onToggleCompare,
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
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  isFetching?: boolean;
  compareSelection?: Array<string | number>;
  onToggleCompare?: (id: string | number) => void;
}) {
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
            const asc = ordering.options.find((o) => o.name === col.sortKey);
            const desc = ordering.options.find((o) => o.name === `-${col.sortKey}`);
            const next = ordering.current === col.sortKey ? desc || asc : asc || desc;
            return next ? { ...col, sortUrl: next.url } : col;
          })
        : baseCols,
    [baseCols, ordering]
  );

  const currKey = ordering?.current?.replace(/^-/, '');
  const isDesc = ordering?.current?.startsWith('-') ?? false;

  const { subRowAccessor, previewAccessor, crossTypeLinks } = descriptor;
  const hasSubRow = !!subRowAccessor;
  const canCompare = isComparableType(resultType);
  const totalColSpan = cols.length + (hasSubRow ? 1 : 0) + (canCompare ? 1 : 0);
  const localScrollRef = React.useRef<HTMLDivElement | null>(null);
  const shouldVirtualize = results.length > 80;
  const rowEstimate = React.useMemo(() => {
    if (hasSubRow || previewAccessor || crossTypeLinks) return 120;
    return 56;
  }, [hasSubRow, previewAccessor, crossTypeLinks]);
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => scrollContainerRef?.current ?? localScrollRef.current,
    estimateSize: () => rowEstimate,
    overscan: 8,
    measureElement: (el) => el?.getBoundingClientRect().height ?? rowEstimate,
  });
  const virtualRows = shouldVirtualize ? rowVirtualizer.getVirtualItems() : [];
  const topSpacerHeight = shouldVirtualize && virtualRows.length > 0 ? virtualRows[0]!.start : 0;
  const bottomSpacerHeight =
    shouldVirtualize && virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1]!.end
      : 0;
  const rowKeyOf = React.useCallback((row: ResultMap[K], index: number): React.Key => {
    const withId = row as { id?: string | number };
    if (typeof withId.id === 'string' || typeof withId.id === 'number') return withId.id;
    const withShelfmark = row as { shelfmark?: string };
    if (withShelfmark.shelfmark) return `${withShelfmark.shelfmark}-${index}`;
    return index;
  }, []);

  const renderRow = React.useCallback(
    (
      row: ResultMap[K],
      ri: number,
      virtualKey?: React.Key,
      measure?: (el: Element | null) => void
    ) => {
      const rowUrl = descriptor.detailUrl(row);
      const rowHref = rowUrl ?? '#';
      const preview = previewAccessor ? previewAccessor(row) : null;
      const rowCrossLinks = crossTypeLinks ? crossTypeLinks(row) : null;
      const rowKey = virtualKey ?? rowKeyOf(row, ri);
      return (
        <tbody
          key={rowKey}
          className="group border-b"
          ref={measure ? (el) => measure(el) : undefined}
        >
          <TableRow
            className={`relative cursor-pointer group-hover:bg-muted/50 transition-colors${hasSubRow ? ' border-b-0' : ''}`}
          >
            {canCompare && (
              <TableCell className="w-10 py-1.5">
                <input
                  type="checkbox"
                  checked={compareSelection
                    .map(String)
                    .includes(String((row as { id: string | number }).id))}
                  onChange={() => onToggleCompare?.((row as { id: string | number }).id)}
                  onClick={(event) => event.stopPropagation()}
                  className="relative z-[3]"
                  aria-label="Toggle compare selection"
                />
              </TableCell>
            )}
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
          {preview && (
            <TableRow className="relative cursor-pointer group-hover:bg-muted/50 transition-colors">
              <TableCell
                colSpan={totalColSpan}
                className={`py-1.5 ${hasSubRow ? 'pl-20' : 'pl-4'} text-sm text-muted-foreground`}
              >
                <Link
                  href={rowHref}
                  className="after:content-[''] after:absolute after:inset-0 after:z-[1]"
                >
                  <span className="relative z-[2] inline-block">{preview}</span>
                </Link>
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
                    <Highlight text={subRowAccessor(row)} keyword={highlightKeyword} />
                  ) : (
                    subRowAccessor(row)
                  )}
                </Link>
              </TableCell>
            </TableRow>
          )}
          {rowCrossLinks && rowCrossLinks.length > 0 && (
            <TableRow className="h-0 overflow-hidden group-hover:h-auto border-b-0">
              <TableCell
                colSpan={totalColSpan}
                className="py-0 group-hover:py-1 px-4 transition-all"
              >
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[11px] text-muted-foreground">View:</span>
                  {rowCrossLinks.map((link) => (
                    <Link
                      key={`${link.label}-${link.href}`}
                      href={link.href}
                      className="relative z-[2] text-[11px] text-primary hover:underline px-1.5 py-0.5 rounded hover:bg-primary/5 transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          )}
        </tbody>
      );
    },
    [
      canCompare,
      cols,
      compareSelection,
      crossTypeLinks,
      descriptor,
      hasSubRow,
      highlightKeyword,
      onToggleCompare,
      previewAccessor,
      resultType,
      rowKeyOf,
      subRowAccessor,
      totalColSpan,
    ]
  );

  return (
    <div
      ref={scrollContainerRef ? undefined : localScrollRef}
      className={`relative bg-white border rounded-lg ${scrollContainerRef ? 'overflow-visible' : 'overflow-auto'}`}
    >
      <Table>
        <TableHeader>
          <TableRow>
            {canCompare && <TableHead className="w-10">Cmp</TableHead>}
            {hasSubRow && <TableHead className="w-16" />}
            {cols.map((col) => (
              <TableHead
                key={col.header}
                className={col.className}
                style={{ cursor: col.sortKey || col.sortUrl ? 'pointer' : undefined }}
                onClick={() => onSort?.({ sortKey: col.sortKey, sortUrl: col.sortUrl })}
                title={col.sortKey || col.sortUrl ? 'Click to sort' : undefined}
              >
                <div className="inline-flex items-center space-x-1">
                  <span>{col.header}</span>
                  {col.sortKey === currKey &&
                    (isDesc ? (
                      <ArrowDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ArrowUp className="w-4 h-4 text-muted-foreground" />
                    ))}
                  {(col.sortKey || col.sortUrl) && col.sortKey !== currKey && (
                    <ArrowUp className="w-3 h-3 text-muted-foreground/40" />
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        {shouldVirtualize && topSpacerHeight > 0 && (
          <tbody>
            <TableRow>
              <TableCell colSpan={totalColSpan} style={{ height: `${topSpacerHeight}px` }} />
            </TableRow>
          </tbody>
        )}
        {shouldVirtualize
          ? virtualRows.map((vr) =>
              renderRow(results[vr.index]!, vr.index, vr.key, rowVirtualizer.measureElement)
            )
          : results.map((row, ri) => renderRow(row, ri))}
        {shouldVirtualize && bottomSpacerHeight > 0 && (
          <tbody>
            <TableRow>
              <TableCell colSpan={totalColSpan} style={{ height: `${bottomSpacerHeight}px` }} />
            </TableRow>
          </tbody>
        )}
      </Table>
      {isFetching && (
        <div className="pointer-events-none absolute inset-0 rounded-lg bg-white/35 animate-pulse" />
      )}
    </div>
  );
}

export const ResultsTable = React.memo(ResultsTableComponent) as typeof ResultsTableComponent;
