'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Download, ExternalLink, X } from 'lucide-react';

import { ImageTextViewer } from '@/components/text/image-text-viewer';
import { showActionNotification } from '@/components/ui/action-toast';
import { Button } from '@/components/ui/button';
import { useTextCardSplit } from '@/hooks/use-text-card-split';
import { API_BASE_URL } from '@/lib/api-fetch';
import { cn } from '@/lib/utils';
import { updateImageText, type ImageTextDetail } from '@/services/image-texts';
import type { TextDisplayMode } from '@/types/annotation-viewer';

// The full TEI editor (TipTap + CodeMirror) is heavy and editor-only, so it is
// lazy-loaded — it never enters the public viewer's first-load chunk.
const TeiTextEditor = dynamic(
  () => import('@/components/backoffice/tei-text-editor').then((m) => m.TeiTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="px-1 py-3 font-mono text-xs text-muted-foreground">Loading editor…</div>
    ),
  }
);

interface ViewerTextPanelProps {
  texts: ImageTextDetail[];
  /**
   * Which text(s) to show: transcription, translation, or both in parallel.
   * The chooser lives in the Settings (wrench) panel, not in this panel's header.
   */
  displayMode: TextDisplayMode;
  /** Graph id of the region currently selected on the image (region → text). */
  linkedGraphId: number | null;
  /** Hovering a linked span highlights its region on the image. */
  onSpanHover: (graphId: number | null) => void;
  /** Clicking a linked span selects + centres its region on the image. */
  onSpanActivate: (graphId: number) => void;
  /** Track A — whether the current user may author text↔region links. */
  canLink?: boolean;
  /** Element index currently armed for linking (drives the highlight). */
  armedElementIndex?: number | null;
  /** Text id the armed element belongs to (scopes the highlight in "both" view). */
  armedTextId?: number | null;
  /** Arm linking: clicking an unlinked phrase asks the user to draw its region. */
  onArmLink?: (textId: number, elementIndex: number, label: string) => void;
  /** Cancel an armed link. */
  onCancelLink?: () => void;
  /** Reverse flow: a region was drawn first and is waiting for a phrase to link. */
  pendingLink?: boolean;
  /** Link the pending region to the clicked phrase. */
  onLinkPhrase?: (textId: number, elementIndex: number, label: string) => void;
  /** Cancel the pending (drawn-but-unlinked) region. */
  onCancelPendingLink?: () => void;
  /** Graph id of a linked region selected on the image (region-click) — shows
   *  its phrase + Also-link / Delete actions. Null when no region is selected. */
  selectedRegionGraphId?: number | null;
  /** Delete the selected region (removes the region graph + its link). */
  onDeleteRegion?: (graphId: number) => void;
  /** Arm "also link": the next phrase click links the selected region to a
   *  second element (e.g. its translation). */
  onStartAddRef?: (graphId: number) => void;
  /** Whether the "also link" arm is active (the next phrase click adds a ref). */
  addRefArmed?: boolean;
  /** Link the armed region to another clicked phrase. */
  onAddRefToPhrase?: (textId: number, elementIndex: number, label: string) => void;
  /** Cancel the "also link" arm. */
  onCancelAddRef?: () => void;
  onClose: () => void;
  /** Editor-only TEI authoring. */
  token?: string | null;
  canEdit?: boolean;
  /** Called after a successful in-panel save so the viewer can reload texts. */
  onTextSaved?: () => void;
  /**
   * How to arrange the per-text editor cards: side-by-side ('row', for the wide
   * bottom dock) or stacked ('column', for the narrow left/right docks). Each
   * text is its own bounded card either way.
   */
  layout?: 'row' | 'column';
}

// A span can carry several ids ("10,11") when one element was annotated by
// more than one region; parse them all so hover/highlight covers each.
function graphIdsOf(el: Element | null): number[] {
  const raw = el?.getAttribute('data-graph-id');
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((value) => Number.isFinite(value));
}

/**
 * Bring a span into view by scrolling ONLY its nearest scrollable ancestor (the
 * card body) — never the window. `el.scrollIntoView()` would also scroll the page
 * (the viewer is 100dvh), yanking the whole layout. No-op if already visible.
 */
function scrollSpanIntoView(el: HTMLElement): void {
  let scroller: HTMLElement | null = el.parentElement;
  while (scroller) {
    const overflowY = getComputedStyle(scroller).overflowY;
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      scroller.scrollHeight > scroller.clientHeight
    ) {
      break;
    }
    scroller = scroller.parentElement;
  }
  if (!scroller) return;
  const sRect = scroller.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  if (eRect.top >= sRect.top && eRect.bottom <= sRect.bottom) return; // already visible
  const delta = eRect.top + eRect.height / 2 - (sRect.top + scroller.clientHeight / 2);
  scroller.scrollBy({ top: delta, behavior: 'smooth' });
}

// The ImageText.type taxonomy (compared case-insensitively — older rows vary).
const TEXT_TYPE = { TRANSCRIPTION: 'transcription', TRANSLATION: 'translation' } as const;

const TYPE_ORDER = (type: string): number => {
  const kind = type.toLowerCase();
  if (kind === TEXT_TYPE.TRANSCRIPTION) return 0;
  if (kind === TEXT_TYPE.TRANSLATION) return 1;
  return 2;
};

/**
 * Always-on authoring surface for a single text (editors only). The Rich/Preview
 * toolbar portals into the column header; a Save bar slides in only when there
 * are unsaved changes. Defaults to Preview so the column reads like the public
 * view until the editor switches to Rich. The draft is held by the parent
 * (keyed by text id) so it survives a display-mode switch that unmounts this card.
 */
function TextEditor({
  text,
  token,
  value,
  onChange,
  onSaved,
  toolbarHost,
}: {
  text: ImageTextDetail;
  token: string | null | undefined;
  /** The current draft (parent-held so it survives unmount). */
  value: string;
  onChange: (next: string) => void;
  onSaved: () => void;
  /** Header slot the Rich/Preview + validity toolbar portals into (one bar). */
  toolbarHost: HTMLElement | null;
}) {
  const [valid, setValid] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const dirty = value !== text.content;

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await updateImageText(token, text.id, { content: value });
      showActionNotification({
        kind: 'created',
        title: 'Text saved',
        description: `Saved the ${text.type.toLowerCase()}.`,
        duration: 1800,
      });
      onSaved();
    } catch (error) {
      showActionNotification({
        kind: 'error',
        title: 'Save failed',
        description: error instanceof Error ? error.message.slice(0, 160) : 'Could not save text.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TeiTextEditor
        value={value}
        onChange={onChange}
        token={token ?? null}
        onValidityChange={setValid}
        toolbarContainer={toolbarHost}
        defaultMode="preview"
        hideSource
      />
      {dirty ? (
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-card px-3 py-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(text.content)}
            disabled={saving}
          >
            Discard
          </Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={!valid || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      ) : null}
    </>
  );
}

/** Accent colour for a text card, drawn from the app's transcription/translation idiom. */
function textTone(type: string): string | undefined {
  const k = type.toLowerCase();
  if (k === TEXT_TYPE.TRANSCRIPTION) return 'var(--color-transcription)';
  if (k === TEXT_TYPE.TRANSLATION) return 'var(--color-translation)';
  return undefined;
}

/**
 * A self-contained editor for one text — its own bounded card with a titled
 * header (colour-keyed to transcription/translation), the editor's
 * Rich/Preview + validity controls, document actions, and a scrollable body.
 * Editors get the always-on Rich/Preview editor (no edit toggle); readers get
 * the rendered text. The last card carries the panel's close control.
 */
function TextEditorCard({
  text,
  canEdit,
  token,
  draft,
  onDraftChange,
  onSaved,
  showClose,
  onClose,
  flexGrow,
  highlightQuery,
}: {
  text: ImageTextDetail;
  canEdit: boolean;
  token: string | null | undefined;
  /** Parent-held draft for this text (survives display-mode unmount). */
  draft: string;
  onDraftChange: (next: string) => void;
  onSaved: () => void;
  showClose: boolean;
  onClose: () => void;
  /** Share of the panel's main axis (set when two cards split the space). */
  flexGrow?: number;
  /** Search term to highlight in the read-only rendering (deep-link from a hit). */
  highlightQuery?: string;
}) {
  // The editor's Rich/Preview + validity toolbar portals into this header slot.
  const [toolbarHost, setToolbarHost] = React.useState<HTMLDivElement | null>(null);
  const tone = textTone(text.type);

  return (
    <section
      data-text-id={text.id}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card shadow-sm"
      style={flexGrow != null ? { flexGrow } : undefined}
    >
      {/* type accent rail */}
      <div className="h-[3px] shrink-0" style={tone ? { background: tone } : undefined} />
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b bg-muted/30 px-3 py-1.5">
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground/80">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: tone ?? 'var(--muted-foreground)' }}
            aria-hidden
          />
          {text.type}
          {text.language ? (
            <span className="font-mono text-muted-foreground normal-case">{text.language}</span>
          ) : null}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {/* Rich/Preview + validity (editors) portal in here. */}
          {canEdit ? (
            <div ref={setToolbarHost} className="flex flex-wrap items-center gap-1" />
          ) : null}
          {canEdit ? (
            <Link
              href={`/backoffice/image-texts/${text.id}`}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Open in the full editor"
              aria-label="Open in the full editor"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          ) : null}
          <a
            href={`${API_BASE_URL}/api/v1/manuscripts/image-texts/${text.id}/tei/`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={`Download ${text.type} as TEI`}
            aria-label={`Download ${text.type} as TEI`}
          >
            <Download className="h-4 w-4" />
          </a>
          {showClose ? (
            <Button
              variant="ghost"
              size="icon"
              className="ml-0.5 h-7 w-7"
              aria-label="Hide text panel"
              title="Hide text panel"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {canEdit ? (
          <TextEditor
            key={text.id}
            text={text}
            token={token}
            value={draft}
            onChange={onDraftChange}
            onSaved={onSaved}
            toolbarHost={toolbarHost}
          />
        ) : (
          <div className="px-4 py-3">
            <ImageTextViewer
              html={text.content}
              richMarkup
              highlightQuery={highlightQuery}
              className="prose prose-sm max-w-none dark:prose-invert"
            />
          </div>
        )}
      </div>
    </section>
  );
}

export function ViewerTextPanel({
  texts,
  displayMode,
  linkedGraphId,
  onSpanHover,
  onSpanActivate,
  canLink = false,
  armedElementIndex = null,
  armedTextId = null,
  onArmLink,
  onCancelLink,
  pendingLink = false,
  onLinkPhrase,
  onCancelPendingLink,
  selectedRegionGraphId = null,
  onDeleteRegion,
  onStartAddRef,
  addRefArmed = false,
  onAddRefToPhrase,
  onCancelAddRef,
  onClose,
  token,
  canEdit = false,
  onTextSaved,
  layout = 'column',
}: ViewerTextPanelProps) {
  const ordered = React.useMemo(
    () => [...texts].sort((a, b) => TYPE_ORDER(a.type) - TYPE_ORDER(b.type)),
    [texts]
  );

  const transcription = React.useMemo(
    () => ordered.find((t) => t.type.toLowerCase() === TEXT_TYPE.TRANSCRIPTION),
    [ordered]
  );
  const translation = React.useMemo(
    () => ordered.find((t) => t.type.toLowerCase() === TEXT_TYPE.TRANSLATION),
    [ordered]
  );

  // Which text(s) the panel shows. Falls back gracefully when a requested type
  // isn't present for this image (e.g. "translation" with none recorded).
  const shown = React.useMemo<ImageTextDetail[]>(() => {
    if (displayMode === 'both') {
      const both = [transcription, translation].filter(Boolean) as ImageTextDetail[];
      return both.length ? both : ordered;
    }
    if (displayMode === 'translation') return translation ? [translation] : ordered.slice(0, 1);
    return transcription ? [transcription] : ordered.slice(0, 1);
  }, [displayMode, ordered, transcription, translation]);

  const isBoth = displayMode === 'both' && shown.length > 1;
  const shownKey = shown.map((t) => `${t.id}:${t.content.length}`).join('|');

  // Search deep-link: when arriving from a text hit (…/images/{id}?q=william),
  // highlight + scroll to that term in the read-only transcription. Read from
  // the URL directly (re-read when the shown texts change on navigation), in
  // the same window.location idiom the ?graph= share-target uses.
  const [highlightQuery, setHighlightQuery] = React.useState('');
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    setHighlightQuery(new URLSearchParams(window.location.search).get('q') ?? '');
  }, [shownKey]);

  // Per-text edit drafts live here (not in each card) so an unsaved draft
  // survives a display-mode switch that unmounts a card. A text with no entry
  // falls back to its saved content; a successful save clears the entry.
  const [drafts, setDrafts] = React.useState<Record<number, string>>({});
  const setDraftFor = React.useCallback((id: number, next: string) => {
    setDrafts((prev) => ({ ...prev, [id]: next }));
  }, []);
  const clearDraftFor = React.useCallback((id: number) => {
    setDrafts((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // Adjustable split between the two cards (side-by-side in the bottom dock,
  // stacked in side docks). ratio = the first card's share of the main axis.
  const { ratio, bindSplitter } = useTextCardSplit(layout);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  // Set when a *text* click drives the linked-graph change, so the highlight
  // effect skips its scroll: the clicked span is already in view, and scrolling
  // would just move the page. Image→text selections leave it false (do scroll).
  const skipLinkScrollRef = React.useRef(false);

  // region → text: mark every span linked to the selected region and bring the
  // first into view. Covers all shown columns (the query spans the whole panel).
  React.useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    root
      .querySelectorAll('[data-graph-linked="true"]')
      .forEach((el) => el.removeAttribute('data-graph-linked'));
    if (linkedGraphId == null) return;
    const matches = Array.from(root.querySelectorAll<HTMLElement>('[data-graph-id]')).filter((el) =>
      graphIdsOf(el).includes(linkedGraphId)
    );
    if (matches.length === 0) return;
    matches.forEach((el) => el.setAttribute('data-graph-linked', 'true'));
    // A text click already has the span in view (and onSpanActivate focuses the
    // image); only scroll for image→text selections, and only within the panel.
    if (skipLinkScrollRef.current) {
      skipLinkScrollRef.current = false;
    } else {
      scrollSpanIntoView(matches[0]);
    }
  }, [linkedGraphId, shownKey]);

  // The phrase text of the selected region (for the Delete banner). Derived from
  // the span carrying that graph id; recomputed when the selection or texts change.
  const [selectedRegionPhrase, setSelectedRegionPhrase] = React.useState('');
  React.useEffect(() => {
    const root = containerRef.current;
    if (!root || selectedRegionGraphId == null) {
      setSelectedRegionPhrase('');
      return;
    }
    const match = Array.from(root.querySelectorAll<HTMLElement>('[data-graph-id]')).find((el) =>
      graphIdsOf(el).includes(selectedRegionGraphId)
    );
    setSelectedRegionPhrase((match?.textContent ?? '').trim());
  }, [selectedRegionGraphId, shownKey, linkedGraphId]);

  // Mark the armed element so the editor sees which phrase they're linking. The
  // index is scoped to its own text column (data-text-id) so "both" view stays
  // unambiguous.
  React.useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    root
      .querySelectorAll('[data-graph-arming="true"]')
      .forEach((el) => el.removeAttribute('data-graph-arming'));
    if (armedElementIndex == null || armedTextId == null) return;
    const section = root.querySelector<HTMLElement>(`[data-text-id="${armedTextId}"]`);
    if (!section) return;
    const el = section.querySelectorAll<HTMLElement>('[data-dpt]')[armedElementIndex];
    if (el) {
      el.setAttribute('data-graph-arming', 'true');
      scrollSpanIntoView(el);
    }
  }, [armedElementIndex, armedTextId, shownKey]);

  const handleClick = (event: React.MouseEvent) => {
    const target = event.target as Element;
    // Decide based on the *innermost* linkable element the user clicked.
    const innermost = target.closest<HTMLElement>('[data-dpt]');

    // "Also link" armed: the next phrase click links the selected region to a
    // second element (e.g. its translation). Highest precedence — any phrase,
    // linked or not, becomes a second corresp for that region.
    if (addRefArmed && onAddRefToPhrase && innermost) {
      const section = target.closest<HTMLElement>('[data-text-id]');
      if (section) {
        const textId = Number(section.getAttribute('data-text-id'));
        const index = Array.from(section.querySelectorAll<HTMLElement>('[data-dpt]')).indexOf(
          innermost
        );
        if (Number.isFinite(textId) && index >= 0) {
          onAddRefToPhrase(textId, index, (innermost.textContent ?? '').trim().slice(0, 40));
          return;
        }
      }
    }

    // Reverse flow: a region was drawn first; the next phrase click links it.
    if (pendingLink && onLinkPhrase && innermost) {
      const section = target.closest<HTMLElement>('[data-text-id]');
      if (section) {
        const textId = Number(section.getAttribute('data-text-id'));
        const index = Array.from(section.querySelectorAll<HTMLElement>('[data-dpt]')).indexOf(
          innermost
        );
        if (Number.isFinite(textId) && index >= 0) {
          onLinkPhrase(textId, index, (innermost.textContent ?? '').trim().slice(0, 40));
          return;
        }
      }
    }

    // If the click lands anywhere inside an already-linked element, navigate to
    // its region (revealing the "Also link" / Delete affordances). This takes
    // precedence over arming a NEW link so that clicking a linked phrase is
    // reliable — previously, clicking an inner un-linked sub-span of a linked
    // phrase fell through to the arm-link branch and (mis)started a new link
    // instead. Matches the panel hint: link a NEW region by clicking an
    // un-highlighted (un-linked) phrase. Uses the nearest [data-graph-id]
    // ancestor-or-self, so it also covers the element-is-itself-linked case.
    const linkedIds = graphIdsOf(target.closest<HTMLElement>('[data-graph-id]'));
    if (linkedIds.length > 0) {
      // Text click → focus the image only; don't scroll the text panel/page.
      skipLinkScrollRef.current = true;
      onSpanActivate(linkedIds[0]);
      return;
    }
    // Click is on un-linked text + author capability → arm linking for the
    // innermost linkable element, indexed within its own text column.
    const section = target.closest<HTMLElement>('[data-text-id]');
    if (canLink && onArmLink && section && innermost) {
      const textId = Number(section.getAttribute('data-text-id'));
      const all = Array.from(section.querySelectorAll<HTMLElement>('[data-dpt]'));
      const index = all.indexOf(innermost);
      if (Number.isFinite(textId) && index >= 0) {
        onArmLink(textId, index, (innermost.textContent ?? '').trim().slice(0, 40));
        return;
      }
    }
  };
  const handleMouseOver = (event: React.MouseEvent) => {
    const ids = graphIdsOf((event.target as Element).closest('[data-graph-id]'));
    onSpanHover(ids.length > 0 ? ids[0] : null);
  };

  if (shown.length === 0) {
    return (
      <aside className="flex h-full w-full items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
        <p className="text-sm text-muted-foreground">No text recorded for this image.</p>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label="Hide text panel"
          title="Hide text panel"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </aside>
    );
  }

  return (
    // Transparent shell: each text is its own bounded card, so this just lays
    // them out (side-by-side in the wide bottom dock, stacked in side docks).
    <div className="flex h-full w-full flex-col gap-2">
      {pendingLink ? (
        <div className="flex shrink-0 items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px]">
          <span className="text-primary">Click the phrase this region belongs to.</span>
          <button
            type="button"
            // Blur before the click handler clears the banner: this button is
            // about to unmount, and the browser would otherwise shift focus to
            // the next focusable element (far down the page) and scroll the
            // canvas out of view — which broke "cancel, then draw again".
            onClick={(e) => {
              e.currentTarget.blur();
              onCancelPendingLink?.();
            }}
            className="rounded px-1.5 py-0.5 font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : armedElementIndex != null ? (
        <div className="flex shrink-0 items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px]">
          <span className="text-primary">
            Draw the region for this phrase on the image to link it.
          </span>
          <button
            type="button"
            // See note above — blur before unmount to avoid the focus-jump scroll.
            onClick={(e) => {
              e.currentTarget.blur();
              onCancelLink?.();
            }}
            className="rounded px-1.5 py-0.5 font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : addRefArmed ? (
        <div className="flex shrink-0 items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px]">
          <span className="text-primary">
            Click another phrase to also link it to this region — show the translation (Both view)
            to link it there.
          </span>
          <button
            type="button"
            // See note above — blur before unmount to avoid the focus-jump scroll.
            onClick={(e) => {
              e.currentTarget.blur();
              onCancelAddRef?.();
            }}
            className="shrink-0 rounded px-1.5 py-0.5 font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : canLink && selectedRegionGraphId != null ? (
        <div className="flex shrink-0 items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-[11px]">
          <span className="min-w-0 truncate text-muted-foreground">
            Region linked to{' '}
            <span className="font-medium text-foreground">
              {selectedRegionPhrase ? `“${selectedRegionPhrase.slice(0, 50)}”` : 'this phrase'}
            </span>
            .
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onStartAddRef?.(selectedRegionGraphId)}
              className="rounded px-1.5 py-0.5 font-medium text-primary hover:bg-primary/10"
            >
              Also link
            </button>
            <button
              type="button"
              onClick={() => onDeleteRegion?.(selectedRegionGraphId)}
              className="rounded px-1.5 py-0.5 font-medium text-destructive hover:bg-destructive/10"
            >
              Delete
            </button>
          </div>
        </div>
      ) : canLink ? (
        <p className="shrink-0 px-1 text-[11px] text-muted-foreground">
          Click a highlighted phrase to find its region. To link a new region: click an
          un-highlighted phrase then draw it, or draw a region then click its phrase.{' '}
          <span className="text-foreground/70">Links save automatically — no Save needed.</span>
        </p>
      ) : null}
      <div
        ref={containerRef}
        onClick={handleClick}
        onMouseOver={handleMouseOver}
        onMouseLeave={() => onSpanHover(null)}
        className={cn(
          'viewer-text-panel flex min-h-0 flex-1 gap-2',
          isBoth && layout === 'row' ? 'flex-col md:flex-row' : 'flex-col'
        )}
      >
        {shown.map((text, index) => (
          <React.Fragment key={text.id}>
            {isBoth && index > 0 ? (
              <div
                {...bindSplitter}
                className={cn(
                  'group relative hidden shrink-0 self-stretch rounded-full bg-border/60 transition-colors hover:bg-accent/60 focus-visible:bg-accent focus-visible:outline-none md:block',
                  layout === 'row'
                    ? "w-1.5 cursor-col-resize before:absolute before:inset-y-0 before:-inset-x-2 before:content-['']"
                    : "h-1.5 cursor-row-resize before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']"
                )}
              />
            ) : null}
            <TextEditorCard
              text={text}
              canEdit={canEdit}
              token={token}
              draft={drafts[text.id] ?? text.content}
              onDraftChange={(next) => setDraftFor(text.id, next)}
              onSaved={() => {
                clearDraftFor(text.id);
                onTextSaved?.();
              }}
              showClose={index === shown.length - 1}
              onClose={onClose}
              flexGrow={isBoth ? (index === 0 ? ratio : 1 - ratio) : undefined}
              highlightQuery={highlightQuery}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
