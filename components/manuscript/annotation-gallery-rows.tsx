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

/** The collection, as the rows need it: membership and a per-graph toggle. */
export interface GraphCollection {
  ready: boolean;
  has: (graphId: number) => boolean;
  toggle: (graph: BackendGraph) => void;
}

const allographAnchorId = (handId: number | null, allographId: number | null) =>
  `${handAnchorId(handId)}-allograph-${allographId ?? 'none'}`;

// ---------------------------------------------------------------------------
// Per-hand section: heading, allograph links, then one row per allograph
// ---------------------------------------------------------------------------

interface HandSectionProps {
  handGroup: HandGroup;
  accent: string;
  density: ThumbDensity;
  iiifImage: string;
  manuscriptId: string;
  imageId: string;
  canEdit: boolean;
  annotatingMode: boolean;
  selection: SelectionSet<number>;
  onEditGraph: (graphId: number) => void;
  onDeleteGraph: (graphId: number) => void;
  collection: GraphCollection;
}

export function HandSection({
  handGroup,
  accent,
  density,
  iiifImage,
  manuscriptId,
  imageId,
  canEdit,
  annotatingMode,
  selection,
  onEditGraph,
  onDeleteGraph,
  collection,
}: HandSectionProps) {
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
        {handGroup.allographs.map((allographGroup) => (
          <AllographRow
            key={allographGroup.allographId ?? 'none'}
            anchorId={allographAnchorId(handGroup.handId, allographGroup.allographId)}
            allographGroup={allographGroup}
            density={density}
            handName={handGroup.handName}
            iiifImage={iiifImage}
            manuscriptId={manuscriptId}
            imageId={imageId}
            canEdit={canEdit}
            annotatingMode={annotatingMode}
            selection={selection}
            onEditGraph={onEditGraph}
            onDeleteGraph={onDeleteGraph}
            collection={collection}
          />
        ))}
      </div>
    </section>
  );
}

interface AllographRowProps {
  anchorId: string;
  allographGroup: AllographGroup;
  density: ThumbDensity;
  handName: string;
  iiifImage: string;
  manuscriptId: string;
  imageId: string;
  canEdit: boolean;
  annotatingMode: boolean;
  selection: SelectionSet<number>;
  onEditGraph: (graphId: number) => void;
  onDeleteGraph: (graphId: number) => void;
  collection: GraphCollection;
}

// One allograph per row: its name, counts and a select-all box on the left,
// its graphs flowing to the right.
function AllographRow({
  anchorId,
  allographGroup,
  density,
  handName,
  iiifImage,
  manuscriptId,
  imageId,
  canEdit,
  annotatingMode,
  selection,
  onEditGraph,
  onDeleteGraph,
  collection,
}: AllographRowProps) {
  const t = useTranslations('manuscript.gallery');
  const { allographName, graphs } = allographGroup;
  const ids = graphs.map((g) => g.id);
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
    let next = idx;
    if (e.key === 'ArrowRight') next = idx < cells.length - 1 ? idx + 1 : 0;
    else if (e.key === 'ArrowLeft') next = idx > 0 ? idx - 1 : cells.length - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = cells.length - 1;
    e.preventDefault();
    cells[next]?.focus();
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
      <div className="flex w-full shrink-0 items-start gap-2.5 sm:w-[10.5rem]">
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          <GroupCheckbox
            checked={allSelected ? true : selectedCount > 0 ? 'mixed' : false}
            label={t('selectAllInRow', { allograph: allographName })}
            onToggle={() => (allSelected ? selection.removeMany(ids) : selection.addMany(ids))}
          />
          <h3
            id={headingId}
            className="break-words font-display text-3xl font-semibold leading-none"
          >
            {allographName}
          </h3>
        </div>
        <div className="flex flex-col gap-1 pt-0.5 text-xs tabular-nums text-muted-foreground">
          <span>{t('rowGraphs', { count: graphs.length })}</span>
          <span>{t('rowDescribed', { count: graphs.filter(isGraphDescribed).length })}</span>
          {selectedCount > 0 && (
            <span className="self-start rounded-full bg-primary/10 px-2 py-px font-semibold text-primary">
              {t('rowSelected', { count: selectedCount })}
            </span>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 basis-[30rem] flex-wrap gap-3" onKeyDown={handleKeyDown}>
        {graphs.map((graph) => (
          <GraphThumb
            key={graph.id}
            graph={graph}
            density={density}
            allographName={allographName}
            handName={handName}
            iiifImage={iiifImage}
            manuscriptId={manuscriptId}
            imageId={imageId}
            isSelected={selection.selected.has(graph.id)}
            onSelect={(shiftKey) => selectInRow(ids, graph.id, shiftKey)}
            canEdit={canEdit}
            annotatingMode={annotatingMode}
            onEdit={() => onEditGraph(graph.id)}
            onDelete={() => onDeleteGraph(graph.id)}
            inCollection={collection.has(graph.id)}
            collectionReady={collection.ready}
            onToggleCollection={() => collection.toggle(graph)}
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

interface GraphThumbProps {
  graph: BackendGraph;
  density: ThumbDensity;
  allographName: string;
  handName: string;
  iiifImage: string;
  manuscriptId: string;
  imageId: string;
  isSelected: boolean;
  onSelect: (shiftKey: boolean) => void;
  canEdit: boolean;
  annotatingMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  inCollection: boolean;
  /** False until the saved collection has loaded, when membership is unknown. */
  collectionReady: boolean;
  onToggleCollection: () => void;
}

function GraphThumb({
  graph,
  density,
  allographName,
  handName,
  iiifImage,
  manuscriptId,
  imageId,
  isSelected,
  onSelect,
  canEdit,
  annotatingMode,
  onEdit,
  onDelete,
  inCollection,
  collectionReady,
  onToggleCollection,
}: GraphThumbProps) {
  const t = useTranslations('manuscript.gallery');
  const tCommon = useTranslations('common');
  const href = `/manuscripts/${manuscriptId}/images/${imageId}?graph=${graph.id}`;
  const described = isGraphDescribed(graph);
  const names = { allograph: allographName, id: graph.id };

  // A crop that fails says so and can be retried; remounting the image (a new
  // key) re-runs the lookup, and a failed info.json is never cached.
  const [cropAttempt, setCropAttempt] = React.useState(0);
  const [cropFailed, setCropFailed] = React.useState(false);
  const onCropFailed = React.useCallback(() => setCropFailed(true), []);
  const retryCrop = () => {
    setCropFailed(false);
    setCropAttempt((n) => n + 1);
  };

  // Selection ring + hover ring on the image element so it hugs the glyph.
  const thumbClassName = cn(
    'relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border bg-muted transition',
    isSelected
      ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-card'
      : 'hover:border-primary hover:ring-2 hover:ring-primary/25'
  );
  const actionLabel = annotatingMode
    ? isSelected
      ? t('peekUnselect')
      : t('peekSelect')
    : t('peekOpen');

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
        onClick={onToggleCollection}
        disabled={!collectionReady}
        aria-pressed={inCollection}
        aria-label={
          inCollection
            ? t('removeGraphFromCollection', { id: graph.id })
            : t('addGraphToCollection', { id: graph.id })
        }
        title={
          inCollection
            ? t('removeGraphFromCollection', { id: graph.id })
            : t('addGraphToCollection', { id: graph.id })
        }
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
              <GraphThumbImage
                key={cropAttempt}
                graph={graph}
                iiifImage={iiifImage}
                density={density}
                onFailed={onCropFailed}
              />
            </button>
          ) : (
            <Link
              href={href}
              data-thumb-focusable
              aria-label={t('openThumb', names)}
              className={thumbClassName}
            >
              <GraphThumbImage
                key={cropAttempt}
                graph={graph}
                iiifImage={iiifImage}
                density={density}
                onFailed={onCropFailed}
              />
            </Link>
          )}
        </TooltipTrigger>
        {/* Hover peek (G6.5): richer context without entering editing mode. */}
        <TooltipContent
          side="top"
          className="max-w-xs border border-border bg-popover px-3 py-2 text-popover-foreground shadow-lg"
        >
          <GraphPeek
            graph={graph}
            allographName={allographName}
            handName={handName}
            actionLabel={actionLabel}
          />
        </TooltipContent>
      </Tooltip>

      {cropFailed && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 self-start px-2 text-xs"
          onClick={retryCrop}
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
          <AnnotatingDetails graph={graph} />
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 flex-1 gap-1.5 text-xs"
              onClick={onEdit}
              aria-label={t('editGraphLabel', { id: graph.id })}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {tCommon('edit')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onDelete}
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

// Lazy IIIF thumbnail — only resolves its bounded URL once scrolled into view
// (G2.1), so a dense folio doesn't fire hundreds of info.json-driven requests
// on mount. Kept as its own component so the hook is gated behind the
// in-view check.
function GraphThumbImage({
  graph,
  iiifImage,
  density,
  onFailed,
}: {
  graph: BackendGraph;
  iiifImage: string;
  density: ThumbDensity;
  onFailed: () => void;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref);
  return (
    <span ref={ref} className="flex h-full w-full items-center justify-center">
      {inView ? (
        <LoadedThumbImage
          graph={graph}
          iiifImage={iiifImage}
          density={density}
          onFailed={onFailed}
        />
      ) : (
        <ThumbPlaceholder />
      )}
    </span>
  );
}

function ThumbPlaceholder() {
  return <span aria-hidden className="h-full w-full animate-pulse bg-muted" />;
}

function LoadedThumbImage({
  graph,
  iiifImage,
  density,
  onFailed,
}: {
  graph: BackendGraph;
  iiifImage: string;
  density: ThumbDensity;
  onFailed: () => void;
}) {
  const t = useTranslations('manuscript.gallery');
  // Legacy GeoJSON polygons are stored bottom-left origin (Web Mercator);
  // useIiifThumbnail handles the y-flip and bounds clamping via info.json.
  const annotationJson = React.useMemo(() => JSON.stringify(graph.annotation), [graph.annotation]);
  const thumb = useIiifThumbnail(iiifImage, annotationJson, DENSITY_THUMB_PX[density]);
  const [imageFailed, setImageFailed] = React.useState(false);
  const failed = thumb.failed || imageFailed;

  React.useEffect(() => {
    if (failed) onFailed();
  }, [failed, onFailed]);

  if (failed) {
    return (
      <span className="flex h-full w-full items-center justify-center bg-[repeating-linear-gradient(135deg,var(--muted)_0_8px,var(--secondary)_8px_16px)] p-2 text-center text-xs text-muted-foreground">
        {t('imageFailed')}
      </span>
    );
  }
  if (!thumb.src) return <ThumbPlaceholder />;
  return (
    // Fills the box: small crops arrive at their own size, so S/M/L relies on this scaling.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={thumb.src}
      alt=""
      className="h-full w-full object-contain"
      loading="lazy"
      onError={() => setImageFailed(true)}
    />
  );
}

// Hover-peek body: allograph, hand, and described features/positions.
function GraphPeek({
  graph,
  allographName,
  handName,
  actionLabel,
}: {
  graph: BackendGraph;
  allographName: string;
  handName: string;
  actionLabel: string;
}) {
  const t = useTranslations('manuscript.gallery');
  const components = graph.graphcomponent_set ?? [];
  const positions = graph.position_details ?? [];
  return (
    <div className="space-y-1 text-xs">
      <div className="font-medium text-foreground">{allographName}</div>
      <div className="text-muted-foreground">{handName}</div>
      {components.length > 0 && (
        <div className="text-muted-foreground">
          {components
            .map((c) =>
              c.feature_details && c.feature_details.length > 0
                ? `${c.component_name ?? `#${c.component}`}: ${c.feature_details.map((f) => f.name).join(', ')}`
                : (c.component_name ?? `#${c.component}`)
            )
            .join(' · ')}
        </div>
      )}
      {positions.length > 0 && (
        <div className="italic text-muted-foreground">
          {positions.map((p) => p.name).join(', ')}
        </div>
      )}
      {components.length === 0 && positions.length === 0 && (
        <div className="italic text-muted-foreground">{t('undescribed')}</div>
      )}
      <div className="pt-0.5 text-muted-foreground/80">{actionLabel}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editing-mode inline detail (staff)
// ---------------------------------------------------------------------------

function AnnotatingDetails({ graph }: { graph: BackendGraph }) {
  const t = useTranslations('manuscript.gallery');
  const components = graph.graphcomponent_set ?? [];
  const positions = graph.position_details ?? [];

  if (components.length === 0 && positions.length === 0) {
    return <p className="text-[11px] italic text-muted-foreground">{t('undescribed')}</p>;
  }

  return (
    <div className="space-y-0.5 text-[11px] leading-snug text-muted-foreground">
      {components.map((c, i) => (
        <div key={`${c.component}-${i}`}>
          <span className="font-medium text-foreground">
            {c.component_name ?? `#${c.component}`}
          </span>
          {c.feature_details && c.feature_details.length > 0 && (
            <span className="text-foreground/70">
              {' — '}
              {c.feature_details.map((f) => f.name).join(', ')}
            </span>
          )}
        </div>
      ))}
      {positions.length > 0 && (
        <div className="italic text-foreground/70">{positions.map((p) => p.name).join(', ')}</div>
      )}
    </div>
  );
}
