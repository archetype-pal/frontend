'use client';

import * as React from 'react';
import { Table, TableHeader, TableRow, TableCell, TableHead } from '@/components/ui/table';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { getImageDetailUrl, getGraphDetailUrl, resolveAndPushGraphDetail } from '@/lib/media-url';
import { SEARCH_RESULT_TYPES } from '@/lib/search-types';

export type Column<T> = {
  header: string;
  sortKey?: string;
  sortUrl?: string;
  accessor: (item: T) => React.ReactNode;
  className?: string;
};

function makeColumn<T>(
  header: string,
  accessor: (item: T) => React.ReactNode,
  sortKey?: string,
  className?: string
): Column<T> {
  return { header, accessor, sortKey, className };
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
      <div className="relative inline-block w-20 h-20 flex items-center justify-center bg-gray-50 rounded border border-gray-200 overflow-hidden">
        <span className="text-xs text-muted-foreground">…</span>
      </div>
    );
  }
  return (
    <div className="relative z-[2] inline-block group w-20 h-20 flex items-center justify-center bg-gray-50 rounded border border-gray-200 overflow-hidden">
      <Image
        src={src}
        alt={`Thumbnail for ${graph.shelfmark}`}
        width={80}
        height={80}
        className="w-full h-full object-contain"
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
      width={960}
      height={280}
      className="block h-auto w-auto max-h-40 max-w-full object-contain"
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
          <div className="relative z-[2] inline-block group w-20 h-20 flex items-center justify-center bg-gray-50 rounded border border-gray-200 overflow-hidden">
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

const SUB_ROW_ACCESSORS = {
  clauses: (c: ClauseListItem) => c.content,
  people: (p: PersonListItem) => p.name,
  places: (p: PlaceListItem) => p.name,
} satisfies Partial<{ [K in ResultType]: SubRowAccessor<ResultMap[K]> }>;

const PREVIEW_ACCESSORS = {
  texts: (t: TextListItem) => (
    <AnnotationInlinePreview
      thumbnailIiif={t.thumbnail_iiif}
      coordinates={t.annotation_coordinates}
      alt={t.shelfmark || 'Text annotation'}
    />
  ),
  clauses: (c: ClauseListItem) => (
    <AnnotationInlinePreview
      thumbnailIiif={c.thumbnail_iiif}
      coordinates={c.annotation_coordinates}
      alt={c.shelfmark || 'Clause annotation'}
    />
  ),
  people: (p: PersonListItem) => (
    <AnnotationInlinePreview
      thumbnailIiif={p.thumbnail_iiif}
      coordinates={p.annotation_coordinates}
      alt={p.shelfmark || 'Person annotation'}
    />
  ),
  places: (p: PlaceListItem) => (
    <AnnotationInlinePreview
      thumbnailIiif={p.thumbnail_iiif}
      coordinates={p.annotation_coordinates}
      alt={p.shelfmark || 'Place annotation'}
    />
  ),
} satisfies Partial<{ [K in ResultType]: PreviewAccessor<ResultMap[K]> }>;

const DETAIL_URL_BUILDERS = {
  manuscripts: (item: ManuscriptListItem) => `/manuscripts/${item.id}`,
  images: (item: ImageListItem) => getImageDetailUrl(item),
  scribes: (item: ScribeListItem) => `/scribes/${item.id}`,
  hands: (item: HandListItem) => `/hands/${item.id}`,
  graphs: (item: GraphListItem) => getGraphDetailUrl(item),
  texts: (item: TextListItem) => getImageDetailUrl(item),
  clauses: (item: ClauseListItem) => getImageDetailUrl(item),
  people: (item: PersonListItem) => getImageDetailUrl(item),
  places: (item: PlaceListItem) => getImageDetailUrl(item),
} satisfies { [K in ResultType]: (item: ResultMap[K]) => string };

function getDetailUrl<K extends ResultType>(resultType: K, item: ResultMap[K]): string {
  const buildUrl = DETAIL_URL_BUILDERS[resultType] as (row: ResultMap[K]) => string;
  return buildUrl(item);
}

function getAccessorForResultType<K extends ResultType, TValue>(
  accessors: Partial<{ [P in ResultType]: (item: ResultMap[P]) => TValue }>,
  resultType: K
): ((item: ResultMap[K]) => TValue) | undefined {
  return accessors[resultType] as ((item: ResultMap[K]) => TValue) | undefined;
}

function ResultsTableComponent<K extends ResultType>({
  resultType,
  results,
  ordering,
  onSort,
  highlightKeyword = '',
  visibleColumns,
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
}) {
  const router = useRouter();
  const allCols = React.useMemo(() => COLUMNS[resultType] as Column<ResultMap[K]>[], [resultType]);
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

  const subRowAccessor = getAccessorForResultType(SUB_ROW_ACCESSORS, resultType);
  const previewAccessor = getAccessorForResultType(PREVIEW_ACCESSORS, resultType);
  const hasSubRow = !!subRowAccessor;
  // +1 for the View column when sub-rows are present
  const totalColSpan = cols.length + (hasSubRow ? 1 : 0);
  const getRowNavigationProps = React.useCallback(
    (row: ResultMap[K]) => {
      const href = getDetailUrl(resultType, row);
      return {
        href,
        onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
          if (resultType !== 'graphs' || href !== '#') return;
          e.preventDefault();
          void resolveAndPushGraphDetail(row as GraphListItem, router.push);
        },
      };
    },
    [resultType, router]
  );

  return (
    <div className="bg-white border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {hasSubRow && <TableHead className="w-16" />}
            {cols.map((col, i) => (
              <TableHead
                key={i}
                className={col.className}
                style={{ cursor: col.sortKey || col.sortUrl ? 'pointer' : undefined }}
                onClick={() => onSort?.({ sortKey: col.sortKey, sortUrl: col.sortUrl })}
              >
                <div className="inline-flex items-center space-x-1">
                  <span>{col.header}</span>
                  {col.sortKey === currKey &&
                    (isDesc ? (
                      <ArrowDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ArrowUp className="w-4 h-4 text-muted-foreground" />
                    ))}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        {results.map((row, ri) => {
          const { href: url, onClick: handleLinkClick } = getRowNavigationProps(row);
          const preview = previewAccessor ? previewAccessor(row) : null;
          return (
            <tbody key={ri} className="group border-b">
              {/* Main data row */}
              <TableRow
                className={`relative cursor-pointer group-hover:bg-muted/50 transition-colors${hasSubRow ? ' border-b-0' : ''}`}
              >
                {hasSubRow && (
                  <TableCell className="w-16 py-1.5">
                    <Link
                      href={url}
                      onClick={handleLinkClick}
                      className="absolute inset-0 z-[1]"
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                    <Link
                      href={url}
                      onClick={handleLinkClick}
                      className="relative z-[2] inline-block text-xs text-primary border border-primary/30 rounded px-2 py-0.5 hover:bg-primary/5 transition-colors whitespace-nowrap"
                    >
                      View
                    </Link>
                  </TableCell>
                )}
                {cols.map((col, ci) => {
                  const cell = col.accessor(row);
                  const isFirst = ci === 0 && !hasSubRow;
                  const inner =
                    highlightKeyword && (typeof cell === 'string' || typeof cell === 'number') ? (
                      <Highlight text={String(cell)} keyword={highlightKeyword} />
                    ) : (
                      cell
                    );

                  return (
                    <TableCell key={ci} className={col.className}>
                      {isFirst ? (
                        <Link
                          href={url}
                          onClick={handleLinkClick}
                          className="after:content-[''] after:absolute after:inset-0 after:z-[1]"
                        >
                          {inner}
                        </Link>
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
                      href={url}
                      onClick={handleLinkClick}
                      className="after:content-[''] after:absolute after:inset-0 after:z-[1]"
                    >
                      <span className="relative z-[2] inline-block">{preview}</span>
                    </Link>
                  </TableCell>
                </TableRow>
              )}
              {/* Sub-row: name/content displayed in italic spanning full width */}
              {subRowAccessor && (
                <TableRow className="relative cursor-pointer group-hover:bg-muted/50 transition-colors">
                  <TableCell
                    colSpan={totalColSpan}
                    className="py-1.5 pl-20 text-sm italic text-muted-foreground"
                  >
                    <Link
                      href={url}
                      onClick={handleLinkClick}
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
            </tbody>
          );
        })}
      </Table>
    </div>
  );
}

export const ResultsTable = React.memo(ResultsTableComponent) as typeof ResultsTableComponent;
