'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Check, Minus, Pencil, RefreshCw, Star, Trash2 } from 'lucide-react';

import { useIiifThumbnail } from '@/hooks/use-iiif-thumbnail';
import { useInView } from '@/hooks/use-in-view';
import { useRangeSelect, type SelectionSet } from '@/hooks/use-selection-set';
import type { BackendGraph } from '@/services/annotations';
import { isGraphDescribed } from '@/lib/annotation-gallery-filters';
import { type AllographGroup, type HandGroup, handAnchorId } from '@/lib/annotation-gallery-groups';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DENSITY_THUMB_PX,
  DENSITY_WIDTH,
  type ThumbDensity,
} from '@/components/manuscript/thumb-density';
import { GALLERY_SCROLL_MARGIN } from '@/components/manuscript/annotation-gallery-toolbar';

/** What every row and graph shares, provided once by the gallery. */
export interface GalleryRowsContextValue {
  density: ThumbDensity;
  iiifImage: (graph: BackendGraph) => string;
  /** The image viewer; a graph opens there with `?graph=<id>`. */
  viewerHref: (graph: BackendGraph) => string;
  canEdit: boolean;
  annotatingMode: boolean;
  selection: SelectionSet<number>;
  onEditGraph: (graphId: number) => void;
  onDeleteGraph: (graphId: number) => void;
  collection: {
    /** False until the saved collection has loaded, when membership is unknown. */
    ready: boolean;
    has: (graphId: number) => boolean;
    toggle: (graph: BackendGraph) => void;
  };
}

const GalleryRowsContext = React.createContext<GalleryRowsContextValue | null>(null);
export const GalleryRowsProvider = GalleryRowsContext.Provider;

function useGalleryRows() {
  const value = React.useContext(GalleryRowsContext);
  if (!value) throw new Error('Gallery rows must render inside GalleryRowsProvider');
  return value;
}

const allographAnchorId = (handId: number | null, allographId: number | null) =>
  `${handAnchorId(handId)}-allograph-${allographId ?? 'none'}`;

// ---------------------------------------------------------------------------
// Per-hand section: heading, allograph links, then one row per allograph
// ---------------------------------------------------------------------------

export function HandSection({ handGroup, accent }: { handGroup: HandGroup; accent: string }) {
  const t = useTranslations('manuscript.gallery');
  const anchorId = handAnchorId(handGroup.handId);
  const headingId = `${anchorId}-heading`;
  const graphs = handGroup.allographs.flatMap((a) => a.graphs);
  return (
    <section id={anchorId} aria-labelledby={headingId} className={GALLERY_SCROLL_MARGIN}>
      <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
        <h2
          id={headingId}
          className="inline-flex items-center gap-2.5 font-display text-3xl font-semibold leading-tight"
        >
          {/* Per-hand accent (G6.9). */}
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
          />
          {handGroup.handName}
        </h2>
        {/* Per-hand signature summary (G4.2). */}
        <span className="text-sm text-muted-foreground">
          {t('handStats', {
            graphs: graphs.length,
            allographs: handGroup.allographs.length,
            described: graphs.filter(isGraphDescribed).length,
          })}
        </span>
      </div>

      <nav
        aria-label={t('allographsNav', { hand: handGroup.handName })}
        className="mt-2.5 flex flex-wrap gap-1.5"
      >
        {handGroup.allographs.map((a) => (
          <a
            key={a.allographId ?? 'none'}
            href={`#${allographAnchorId(handGroup.handId, a.allographId)}`}
            className="inline-flex h-7 items-center gap-1.5 rounded-full border bg-card px-3 text-sm text-foreground transition hover:border-primary hover:text-primary"
          >
            {a.allographName}
            <span className="tabular-nums text-muted-foreground">{a.graphs.length}</span>
          </a>
        ))}
      </nav>

      <div className="mt-4 rounded-lg border bg-card">
        {handGroup.allographs.map((group) => (
          <AllographRow
            key={group.allographId ?? 'none'}
            anchorId={allographAnchorId(handGroup.handId, group.allographId)}
            group={group}
            handName={handGroup.handName}
          />
        ))}
      </div>
    </section>
  );
}

// One allograph per row: a select-all box, its name and counts on the left,
// its graphs flowing to the right.
function AllographRow({
  anchorId,
  group,
  handName,
}: {
  anchorId: string;
  group: AllographGroup;
  handName: string;
}) {
  const t = useTranslations('manuscript.gallery');
  const { selection } = useGalleryRows();
  const ids = group.graphs.map((g) => g.id);
  const selectedCount = ids.filter((id) => selection.selected.has(id)).length;
  const allSelected = selectedCount > 0 && selectedCount === ids.length;
  const headingId = `${anchorId}-heading`;

  // Shift-click range selection (G6.6), anchored within this row.
  const selectInRow = useRangeSelect(selection);

  // Left/Right/Home/End move focus between the row's graphs (G3.4 / G5.2);
  // vertical movement is left to the tab order, since the column count
  // depends on the layout.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') {
      return;
    }
    const cells = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>('[data-thumb-focusable]')
    );
    const idx = cells.indexOf(document.activeElement as HTMLElement);
    if (idx === -1) return;
    const last = cells.length - 1;
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? last
          : e.key === 'ArrowRight'
            ? (idx + 1) % cells.length
            : idx === 0
              ? last
              : idx - 1;
    e.preventDefault();
    cells[next].focus();
  };

  return (
    <div
      id={anchorId}
      role="group"
      aria-labelledby={headingId}
      className={cn(
        'flex flex-wrap items-start gap-x-5 gap-y-3 border-t px-4 py-3.5 first:border-t-0',
        GALLERY_SCROLL_MARGIN
      )}
    >
      {/* Stacked, so a long name ("./, punctus elevatus") wraps in its own
          column instead of squeezing the counts or spilling into the next row. */}
      <div className="flex w-full shrink-0 flex-col items-start gap-1.5 sm:w-[10.5rem]">
        <GroupCheckbox
          checked={allSelected ? true : selectedCount > 0 ? 'mixed' : false}
          label={t('selectAllInRow', { allograph: group.allographName })}
          onToggle={() => (allSelected ? selection.removeMany(ids) : selection.addMany(ids))}
        />
        <h3
          id={headingId}
          className="max-w-full break-words font-display text-3xl font-semibold leading-tight"
        >
          {group.allographName}
        </h3>
        <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-xs tabular-nums text-muted-foreground">
          <span>{t('rowGraphs', { count: group.graphs.length })}</span>
          <span>{t('rowDescribed', { count: group.graphs.filter(isGraphDescribed).length })}</span>
        </div>
        {selectedCount > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-px text-xs font-semibold tabular-nums text-primary">
            {t('selectedCount', { count: selectedCount })}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 basis-[30rem] flex-wrap gap-3" onKeyDown={handleKeyDown}>
        {group.graphs.map((graph) => (
          <GraphThumb
            key={graph.id}
            graph={graph}
            allographName={group.allographName}
            handName={handName}
            onSelect={(shiftKey) => selectInRow(ids, graph.id, shiftKey)}
          />
        ))}
      </div>
    </div>
  );
}

function GroupCheckbox({
  checked,
  label,
  onToggle,
}: {
  checked: boolean | 'mixed';
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition',
        checked
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-muted-foreground/70 bg-background hover:border-primary'
      )}
    >
      {checked === true && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
      {checked === 'mixed' && <Minus className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Per-graph thumbnail
// ---------------------------------------------------------------------------

function GraphThumb({
  graph,
  allographName,
  handName,
  onSelect,
}: {
  graph: BackendGraph;
  allographName: string;
  handName: string;
  onSelect: (shiftKey: boolean) => void;
}) {
  const t = useTranslations('manuscript.gallery');
  const tCommon = useTranslations('common');
  const {
    density,
    viewerHref,
    canEdit,
    annotatingMode,
    selection,
    onEditGraph,
    onDeleteGraph,
    collection,
  } = useGalleryRows();
  const isSelected = selection.selected.has(graph.id);
  const inCollection = collection.has(graph.id);
  const described = isGraphDescribed(graph);
  const names = { allograph: allographName, id: graph.id };
  const starLabel = inCollection
    ? t('removeGraphFromCollection', { id: graph.id })
    : t('addGraphToCollection', { id: graph.id });

  // A crop that fails says so and can be retried; remounting the image (a new
  // key) re-runs the lookup, and a failed info.json is never cached.
  const [cropAttempt, setCropAttempt] = React.useState(0);
  const [cropFailed, setCropFailed] = React.useState(false);
  const onCropFailed = React.useCallback(() => setCropFailed(true), []);

  // Selection ring + hover ring on the image element so it hugs the glyph.
  const thumbClassName = cn(
    'relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border bg-muted transition',
    isSelected
      ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-card'
      : 'hover:border-primary hover:ring-2 hover:ring-primary/25'
  );
  const image = <ThumbImage key={cropAttempt} graph={graph} onFailed={onCropFailed} />;

  return (
    // content-visibility:auto so offscreen thumbs skip layout and paint work on
    // dense folios (G2.2); contain-intrinsic-size reserves roughly their height.
    <div
      className={cn('relative flex flex-col gap-1.5', DENSITY_WIDTH[density])}
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 12rem' }}
    >
      <button
        type="button"
        onClick={(e) => onSelect(e.shiftKey)}
        aria-pressed={isSelected}
        aria-label={isSelected ? t('unselectGraph', names) : t('selectGraph', names)}
        className={cn(
          'absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-[5px] border-[1.5px] shadow-sm transition',
          isSelected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-muted-foreground bg-background/90 text-transparent hover:border-primary'
        )}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
      </button>

      {/* Adds just this graph to the collection. A bare star with a light
          halo, so it reads over any crop without covering it. */}
      <button
        type="button"
        onClick={() => collection.toggle(graph)}
        disabled={!collection.ready}
        aria-pressed={inCollection}
        aria-label={starLabel}
        title={starLabel}
        className={cn(
          'group/star absolute right-1 top-1 z-10 flex h-[30px] w-[30px] items-center justify-center rounded-md disabled:invisible',
          inCollection ? 'text-amber-600' : 'text-foreground'
        )}
      >
        <Star
          aria-hidden
          strokeWidth={1.75}
          className={cn(
            'h-[18px] w-[18px] drop-shadow-[0_0_1.5px_rgb(255_255_255/0.9)] transition group-hover/star:scale-110 group-hover/star:opacity-100 group-focus-visible/star:opacity-100',
            inCollection ? 'fill-current opacity-85' : 'fill-white/50 opacity-55'
          )}
        />
      </button>

      <Tooltip>
        <TooltipTrigger asChild>
          {annotatingMode ? (
            <button
              type="button"
              data-thumb-focusable
              onClick={(e) => onSelect(e.shiftKey)}
              aria-pressed={isSelected}
              aria-label={t('selectThumb', names)}
              className={thumbClassName}
            >
              {image}
            </button>
          ) : (
            <Link
              href={`${viewerHref(graph)}?graph=${graph.id}`}
              data-thumb-focusable
              aria-label={t('openThumb', names)}
              className={thumbClassName}
            >
              {image}
            </Link>
          )}
        </TooltipTrigger>
        {/* Hover peek (G6.5): richer context without entering editing mode. */}
        <TooltipContent
          side="top"
          className="max-w-xs border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg"
        >
          <div className="font-medium">{allographName}</div>
          <div className="text-muted-foreground">{handName}</div>
          <GraphDescription graph={graph} className="mt-1" />
          <div className="mt-1 text-muted-foreground/80">
            {annotatingMode ? (isSelected ? t('peekUnselect') : t('peekSelect')) : t('peekOpen')}
          </div>
        </TooltipContent>
      </Tooltip>

      {cropFailed && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 self-start px-2 text-xs"
          onClick={() => {
            setCropFailed(false);
            setCropAttempt((n) => n + 1);
          }}
          aria-label={t('retryImageLabel', { id: graph.id })}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          {t('retryImage')}
        </Button>
      )}

      <div className="flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
        <span
          aria-hidden
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            described ? 'bg-emerald-600' : 'bg-amber-500'
          )}
        />
        <span className="text-foreground">#{graph.id}</span>
        <span>{described ? t('described') : t('notDescribed')}</span>
      </div>

      {canEdit && annotatingMode && (
        <>
          <GraphDescription graph={graph} className="text-[11px]" />
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 flex-1 gap-1.5 text-xs"
              onClick={() => onEditGraph(graph.id)}
              aria-label={t('editGraphLabel', { id: graph.id })}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {tCommon('edit')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDeleteGraph(graph.id)}
              aria-label={t('deleteGraphLabel', { id: graph.id })}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// Lazy IIIF crop (G2.1): no lookup until the tile nears the screen (the hook
// skips an empty URL), so a dense folio doesn't fire hundreds of info.json
// requests on mount. Reports a failed lookup or image so the tile can retry.
function ThumbImage({ graph, onFailed }: { graph: BackendGraph; onFailed: () => void }) {
  const t = useTranslations('manuscript.gallery');
  const { iiifImage, density } = useGalleryRows();
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref);
  // Legacy GeoJSON polygons are stored bottom-left origin (Web Mercator);
  // useIiifThumbnail handles the y-flip and bounds clamping via info.json.
  const annotationJson = React.useMemo(() => JSON.stringify(graph.annotation), [graph.annotation]);
  const thumb = useIiifThumbnail(
    inView ? iiifImage(graph) : '',
    annotationJson,
    DENSITY_THUMB_PX[density]
  );
  const [imageFailed, setImageFailed] = React.useState(false);
  const failed = thumb.failed || imageFailed;

  React.useEffect(() => {
    if (failed) onFailed();
  }, [failed, onFailed]);

  return (
    <span ref={ref} className="flex h-full w-full items-center justify-center">
      {failed ? (
        <span className="flex h-full w-full items-center justify-center bg-[repeating-linear-gradient(135deg,var(--muted)_0_8px,var(--secondary)_8px_16px)] p-2 text-center text-xs text-muted-foreground">
          {t('imageFailed')}
        </span>
      ) : thumb.src ? (
        // Fills the box: small crops arrive at their own size, so S/M/L relies on this scaling.
        // oxlint-disable-next-line @next/next/no-img-element
        <img
          src={thumb.src}
          alt=""
          className="h-full w-full object-contain"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span aria-hidden className="h-full w-full animate-pulse bg-muted" />
      )}
    </span>
  );
}

// A graph's described components (with their features) and positions; used by
// the hover peek and, in editing mode, under each graph.
function GraphDescription({ graph, className }: { graph: BackendGraph; className?: string }) {
  const t = useTranslations('manuscript.gallery');
  const components = graph.graphcomponent_set ?? [];
  const positions = graph.position_details ?? [];

  if (components.length === 0 && positions.length === 0) {
    return <p className={cn('italic text-muted-foreground', className)}>{t('notDescribed')}</p>;
  }

  return (
    <div className={cn('space-y-0.5 leading-snug text-muted-foreground', className)}>
      {components.map((c, i) => (
        <div key={`${c.component}-${i}`}>
          <span className="font-medium text-foreground">
            {c.component_name ?? `#${c.component}`}
          </span>
          {c.feature_details && c.feature_details.length > 0 && (
            <> — {c.feature_details.map((f) => f.name).join(', ')}</>
          )}
        </div>
      ))}
      {positions.length > 0 && (
        <div className="italic">{positions.map((p) => p.name).join(', ')}</div>
      )}
    </div>
  );
}
