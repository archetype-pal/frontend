'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { IiifImage } from '@/components/ui/iiif-image';
import { getIiifImageUrl } from '@/utils/iiif';
import { useIiifThumbnailUrl } from '@/hooks/use-iiif-thumbnail';
import { getImageDetailUrl, getGraphDetailUrl } from '@/lib/media-url';
import { GraphDetailLink } from '@/components/search/graph-detail-link';
import { CollectionStar } from '@/components/collection/collection-star';
import { OpenLightboxButton } from '@/components/lightbox/open-lightbox-button';
import { Highlight, MatchSnippet } from './highlight';
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

type AnyItem = ResultMap[ResultType];

type MediaRow = {
  key: React.Key;
  /** Static thumbnail URL (manuscripts / images). */
  staticThumb: string | null;
  /** Region thumbnail source (graphs / annotated text types) resolved via hook. */
  regionIiif: string | null;
  coordinates: string | null;
  title: string;
  formattedTitle?: string;
  subtitle: string;
  /** Highlighted content snippet (texts / clauses), raw `_formatted` string. */
  snippet?: string;
  trailing?: string;
  detailUrl: string | null;
  isGraph: boolean;
  /** Collection/lightbox affordances only apply to image + graph items. */
  media?: { item: ImageListItem | GraphListItem; itemType: 'image' | 'graph' };
};

function formattedOf(item: AnyItem): Record<string, string | undefined> {
  return (item as { _formatted?: Record<string, string | undefined> })._formatted ?? {};
}

function joinMeta(...parts: Array<string | number | null | undefined>): string {
  return parts
    .map((p) => (p == null ? '' : String(p).trim()))
    .filter(Boolean)
    .join('  ·  ');
}

function toMediaRow(resultType: ResultType, item: AnyItem): MediaRow {
  const f = formattedOf(item);
  const base = {
    staticThumb: null as string | null,
    regionIiif: null as string | null,
    coordinates: null as string | null,
    snippet: undefined as string | undefined,
    trailing: undefined as string | undefined,
    isGraph: false,
    media: undefined as MediaRow['media'],
  };

  switch (resultType) {
    case 'manuscripts': {
      const m = item as ManuscriptListItem;
      return {
        ...base,
        key: m.id,
        staticThumb: m.first_image_iiif
          ? getIiifImageUrl(m.first_image_iiif, { thumbnail: true })
          : null,
        title: m.shelfmark || 'Untitled',
        formattedTitle: f.shelfmark,
        subtitle: joinMeta(m.repository_name, m.date, m.type),
        trailing: m.number_of_images > 0 ? `${m.number_of_images.toLocaleString()} img` : undefined,
        detailUrl: `/manuscripts/${m.id}`,
      };
    }
    case 'images': {
      const i = item as ImageListItem;
      return {
        ...base,
        key: i.id,
        staticThumb: i.image_iiif ? getIiifImageUrl(i.image_iiif, { thumbnail: true }) : null,
        title: i.shelfmark || 'Untitled',
        formattedTitle: f.shelfmark,
        subtitle: joinMeta(i.locus, i.repository_name, i.date, i.type),
        trailing:
          i.number_of_annotations > 0
            ? `${i.number_of_annotations.toLocaleString()} annot.`
            : undefined,
        detailUrl: getImageDetailUrl(i),
        media: { item: i, itemType: 'image' },
      };
    }
    case 'graphs': {
      const g = item as GraphListItem;
      return {
        ...base,
        key: g.id,
        regionIiif: (g.image_iiif || '').trim() || null,
        coordinates: g.coordinates ?? null,
        title: g.shelfmark || 'Untitled',
        formattedTitle: f.shelfmark,
        subtitle: joinMeta(g.repository_name, g.date, g.hand_name),
        detailUrl: getGraphDetailUrl(g),
        isGraph: true,
        media: { item: g, itemType: 'graph' },
      };
    }
    case 'scribes': {
      const s = item as ScribeListItem;
      return {
        ...base,
        key: s.id,
        title: s.name || 'Untitled',
        formattedTitle: f.name,
        subtitle: joinMeta(
          (s as { scriptorium?: string }).scriptorium,
          (s as { date?: string }).date
        ),
        detailUrl: `/scribes/${s.id}`,
      };
    }
    case 'hands': {
      const h = item as HandListItem;
      return {
        ...base,
        key: h.id,
        title: h.name || h.shelfmark || 'Untitled',
        formattedTitle: f.name,
        subtitle: joinMeta(h.shelfmark, h.repository_name, h.place, h.date),
        detailUrl: `/hands/${h.id}`,
      };
    }
    default: {
      // texts / clauses / people / places — annotated items with a region thumb.
      const a = item as TextListItem | ClauseListItem | PersonListItem | PlaceListItem;
      const named = a as Partial<PersonListItem & PlaceListItem>;
      const content = f.content && f.content.includes('__hl_start__') ? f.content : undefined;
      return {
        ...base,
        key: `${resultType}-${a.id}`,
        regionIiif: (a.thumbnail_iiif || '').trim() || null,
        coordinates: a.annotation_coordinates ?? null,
        title: named.name || a.shelfmark || 'Untitled',
        formattedTitle: named.name ? f.name : f.shelfmark,
        subtitle: joinMeta(a.repository_name, a.date, a.text_type),
        snippet: content,
        detailUrl: getImageDetailUrl(a),
      };
    }
  }
}

function RowThumb({
  staticThumb,
  regionIiif,
  coordinates,
  alt,
}: {
  staticThumb: string | null;
  regionIiif: string | null;
  coordinates: string | null;
  alt: string;
}) {
  const regionSrc = useIiifThumbnailUrl(regionIiif ?? '', coordinates);
  const src = staticThumb ?? regionSrc;
  if (!staticThumb && !regionIiif) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/40 text-[10px] text-muted-foreground/60">
        No image
      </div>
    );
  }
  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border/70 bg-muted/30">
      {src ? (
        <IiifImage src={src} alt={alt} fill className="object-contain" sizes="64px" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground/50">
          …
        </div>
      )}
    </div>
  );
}

const MediaRowItem = React.memo(function MediaRowItem({
  row,
  highlightKeyword,
}: {
  row: MediaRow;
  highlightKeyword: string;
}) {
  const inner = (
    <>
      <RowThumb
        staticThumb={row.staticThumb}
        regionIiif={row.regionIiif}
        coordinates={row.coordinates}
        alt={row.title}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-serif text-sm font-medium text-foreground transition-colors group-hover:text-primary">
          <Highlight
            text={row.title}
            keyword={highlightKeyword}
            formattedText={row.formattedTitle}
          />
        </div>
        {row.subtitle && (
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{row.subtitle}</div>
        )}
        {row.snippet && (
          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            <MatchSnippet formatted={row.snippet} />
          </div>
        )}
      </div>
      {row.trailing && (
        <span className="shrink-0 self-center whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">
          {row.trailing}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground/40 transition-colors group-hover:text-muted-foreground" />
    </>
  );

  return (
    <li className="group relative flex items-start gap-3 rounded-lg border border-transparent px-2 py-2.5 transition-colors hover:border-border hover:bg-muted/30">
      {row.isGraph ? (
        <GraphDetailLink
          graph={row.media!.item as GraphListItem}
          className="flex min-w-0 flex-1 items-start gap-3 after:absolute after:inset-0"
        >
          {inner}
        </GraphDetailLink>
      ) : (
        <Link
          href={row.detailUrl ?? '#'}
          className="flex min-w-0 flex-1 items-start gap-3 after:absolute after:inset-0"
        >
          {inner}
        </Link>
      )}
      {row.media && (
        <span className="absolute right-2 top-2 z-[2] flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <OpenLightboxButton
            item={row.media.item}
            variant="ghost"
            size="icon"
            className="h-7 w-7 bg-card/90 shadow-sm hover:bg-card"
          />
          <CollectionStar
            itemId={row.media.item.id}
            itemType={row.media.itemType}
            item={row.media.item}
          />
        </span>
      )}
    </li>
  );
});

export interface ResultsMediaListProps {
  resultType: ResultType;
  results: AnyItem[];
  highlightKeyword?: string;
  isFetching?: boolean;
}

function ResultsMediaListComponent({
  resultType,
  results,
  highlightKeyword = '',
  isFetching = false,
}: ResultsMediaListProps) {
  const rows = React.useMemo(
    () => results.map((item) => toMediaRow(resultType, item)),
    [results, resultType]
  );

  if (rows.length === 0) {
    return <div className="py-10 text-center text-muted-foreground">No results to display.</div>;
  }

  return (
    <ul className={`divide-y divide-border/60 ${isFetching ? 'opacity-60' : ''}`}>
      {rows.map((row) => (
        <MediaRowItem key={row.key} row={row} highlightKeyword={highlightKeyword} />
      ))}
    </ul>
  );
}

export const ResultsMediaList = React.memo(ResultsMediaListComponent);
