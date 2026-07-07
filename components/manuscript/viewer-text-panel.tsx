'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Download, ExternalLink, X } from 'lucide-react';

import { useTranslations } from 'next-intl';
import { ImageTextViewer } from '@/components/text/image-text-viewer';
import { showActionNotification } from '@/components/ui/action-toast';
import { Button } from '@/components/ui/button';
import { useTextCardSplit } from '@/hooks/use-text-card-split';
import { API_BASE_URL } from '@/lib/api-fetch';
import { cn } from '@/lib/utils';
import { updateImageText, type ImageTextDetail } from '@/services/image-texts';
import { ViewerLinkBar, type ActiveRegion } from './viewer-link-bar';
import type { Mode } from '@/components/backoffice/tei-text-editor';
import type { EditorLinkSelection } from '@/lib/tei-tiptap';
import type { TextDisplayMode } from '@/types/annotation-viewer';

function LoadingEditorFallback() {
  const t = useTranslations('manuscript');
  return <div className="px-1 py-3 font-mono text-xs text-muted-foreground">{t('text.loadingEditor')}</div>;
}

// The full TEI editor (TipTap + CodeMirror) is heavy and editor-only, so it is
// lazy-loaded — it never enters the public viewer's first-load chunk.
const TeiTextEditor = dynamic(
  () => import('@/components/backoffice/tei-text-editor').then((m) => m.TeiTextEditor),
  {
    ssr: false,
    loading: () => <LoadingEditorFallback />,
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
  /** Graph id of the region the pointer is hovering on the image (region → text).
   *  Highlights the linked phrase(s) without scrolling — the transient, hover
   *  counterpart to linkedGraphId. Null when no region is hovered. */
  hoveredGraphId?: number | null;
  /** Hovering a linked span highlights its region on the image. */
  onSpanHover: (graphId: number | null) => void;
  /** Clicking a linked span selects + centres its region on the image. */
  onSpanActivate: (graphId: number) => void;
  /** Track A — whether the current user may author text↔region links. */
  canLink?: boolean;
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
  /** Remove a single element's link to a region (per-link unlink), keeping the region. */
  onUnlinkElement?: (textId: number, elementIndex: number, graphId: number) => void;
  /** Explicit-bar link of a selected existing region (by graph id) to an element. */
  onLinkExistingRegion?: (
    textId: number,
    elementIndex: number,
    graphId: number,
    label: string
  ) => void;
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
/** Editor state a text card lifts out of its editor to drive the link bar. */
export interface EditorCardState {
  mode: Mode;
  richAvailable: boolean;
  linkTarget: EditorLinkSelection | null;
  dirty: boolean;
  save: () => Promise<void>;
}

function TextEditor({
  text,
  token,
  value,
  onChange,
  onSaved,
  toolbarHost,
  onEditorState,
}: {
  text: ImageTextDetail;
  token: string | null | undefined;
  /** The current draft (parent-held so it survives unmount). */
  value: string;
  onChange: (next: string) => void;
  onSaved: () => void;
  /** Header slot the Rich/Preview + validity toolbar portals into (one bar). */
  toolbarHost: HTMLElement | null;
  /** Lifts the editor's mode/link-target/dirty/save up to the card (for the link bar). */
  onEditorState?: (state: EditorCardState) => void;
}) {
  const t = useTranslations('manuscript');
  const tCommon = useTranslations('common');
  const [valid, setValid] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>('preview');
  const [richAvailable, setRichAvailable] = React.useState(false);
  const [linkTarget, setLinkTarget] = React.useState<EditorLinkSelection | null>(null);
  const dirty = value !== text.content;

  const handleSave = React.useCallback(async () => {
    if (!token) return;
    setSaving(true);
    try {
      await updateImageText(token, text.id, { content: value });
      showActionNotification({
        kind: 'created',
        title: t('text.savedTitle'),
        description: t('text.savedDescription', { type: text.type.toLowerCase() }),
        duration: 1800,
      });
      onSaved();
    } catch (error) {
      showActionNotification({
        kind: 'error',
        title: t('text.saveFailedTitle'),
        description: error instanceof Error ? error.message.slice(0, 160) : t('text.saveFailedDescription'),
      });
    } finally {
      setSaving(false);
    }
  }, [token, text.id, text.type, value, onSaved]);

  React.useEffect(() => {
    onEditorState?.({ mode, richAvailable, linkTarget, dirty, save: handleSave });
  }, [mode, richAvailable, linkTarget, dirty, handleSave, onEditorState]);

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
        onModeChange={(m, ra) => {
          setMode(m);
          setRichAvailable(ra);
        }}
        onLinkTargetChange={setLinkTarget}
      />
      {dirty ? (
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t bg-card px-3 py-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(text.content)}
            disabled={saving}
          >
            {t('text.discard')}
          </Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={!valid || saving}>
            {saving ? t('text.saving') : tCommon('save')}
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
  canLink,
  selectedRegionGraphId,
  pendingRegionActive,
  onLinkDrawnToElement,
  onLinkRegionToElement,
  onUnlinkElement,
  onRemoveRegion,
  onDiscardDrawnRegion,
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
  /** Link-bar wiring (region side, from the panel). */
  canLink: boolean;
  selectedRegionGraphId: number | null;
  pendingRegionActive: boolean;
  onLinkDrawnToElement: (textId: number, elementIndex: number, label: string) => void;
  onLinkRegionToElement: (
    textId: number,
    elementIndex: number,
    graphId: number,
    label: string
  ) => void;
  onUnlinkElement: (textId: number, elementIndex: number, graphId: number) => void;
  onRemoveRegion: (graphId: number) => void;
  onDiscardDrawnRegion: () => void;
}) {
  // The editor's Rich/Preview + validity toolbar portals into this header slot.
  const t = useTranslations('manuscript');
  const [toolbarHost, setToolbarHost] = React.useState<HTMLDivElement | null>(null);
  const [editorState, setEditorState] = React.useState<EditorCardState | null>(null);
  const tone = textTone(text.type);

  const activeRegion: ActiveRegion | null = pendingRegionActive
    ? { kind: 'drawn' }
    : selectedRegionGraphId != null
      ? { kind: 'existing', graphId: selectedRegionGraphId }
      : null;

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
              title={t('text.openInEditor')}
              aria-label={t('text.openInEditor')}
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          ) : null}
          <a
            href={`${API_BASE_URL}/api/v1/manuscripts/image-texts/${text.id}/tei/`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t('text.downloadTei', { type: text.type })}
            aria-label={t('text.downloadTei', { type: text.type })}
          >
            <Download className="h-4 w-4" />
          </a>
          {showClose ? (
            <Button
              variant="ghost"
              size="icon"
              className="ml-0.5 h-7 w-7"
              aria-label={t('text.hidePanel')}
              title={t('text.hidePanel')}
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
            onEditorState={setEditorState}
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

      {canEdit && editorState ? (
        <ViewerLinkBar
          canLink={canLink}
          textId={text.id}
          mode={editorState.mode}
          richAvailable={editorState.richAvailable}
          linkTarget={editorState.linkTarget}
          dirty={editorState.dirty}
          onSave={editorState.save}
          activeRegion={activeRegion}
          onLinkDrawnToElement={onLinkDrawnToElement}
          onLinkRegionToElement={onLinkRegionToElement}
          onUnlinkElement={onUnlinkElement}
          onRemoveRegion={onRemoveRegion}
          onDiscardDrawnRegion={onDiscardDrawnRegion}
        />
      ) : null}
    </section>
  );
}

export function ViewerTextPanel({
  texts,
  displayMode,
  linkedGraphId,
  hoveredGraphId = null,
  onSpanHover,
  onSpanActivate,
  canLink = false,
  pendingLink = false,
  onLinkPhrase,
  onCancelPendingLink,
  selectedRegionGraphId = null,
  onDeleteRegion,
  onUnlinkElement,
  onLinkExistingRegion,
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the browser URL (window.location) after mount; doing this during render would cause an SSR/hydration mismatch. Re-synced on shownKey (navigation swaps texts), not a browser event, so useSyncExternalStore/useSearchParams don't fit.
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

  // region hover → text: highlight every phrase linked to the hovered region so
  // the reader can find it while the pointer is over the region. Implemented as a
  // dynamically-generated stylesheet keyed on the hovered graph id — NOT a
  // per-span data attribute — because the Rich TEI editor is a ProseMirror
  // contentEditable that reverts external DOM mutations on its next sync (so an
  // attribute would flicker straight back out). A stylesheet never touches the
  // editor's DOM, so it highlights linked phrases robustly in BOTH the read view
  // and the editor. The four selectors match the id whether it stands alone or
  // sits in a comma-list ("10,11"). Transient: cleared on pointer-leave; never
  // scrolls (that would be jarring on pointer-move). Appended to <head> at
  // runtime so it wins the cascade over the equal-specificity `.tei-el` rules.
  const hoverStyleRef = React.useRef<HTMLStyleElement | null>(null);
  React.useEffect(() => {
    let styleEl = hoverStyleRef.current;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.dataset.viewerHoverHighlight = 'true';
      document.head.appendChild(styleEl);
      hoverStyleRef.current = styleEl;
    }
    if (hoveredGraphId == null) {
      styleEl.textContent = '';
      return;
    }
    const id = hoveredGraphId;
    const sel = [
      `[data-graph-id="${id}"]`,
      `[data-graph-id^="${id},"]`,
      `[data-graph-id$=",${id}"]`,
      `[data-graph-id*=",${id},"]`,
    ]
      .map((s) => `.viewer-text-panel ${s}`)
      .join(',');
    styleEl.textContent = `${sel}{background-color:hsl(var(--c-transcription-h) 70% 55% / 0.32);box-shadow:0 0 0 1px hsl(var(--c-transcription-h) 60% 45% / 0.45);border-radius:3px;}`;
  }, [hoveredGraphId]);
  React.useEffect(
    () => () => {
      hoverStyleRef.current?.remove();
      hoverStyleRef.current = null;
    },
    []
  );

  const handleClick = (event: React.MouseEvent) => {
    const target = event.target as Element;
    // In the Rich TEI editor (a contentEditable surface), a click places the
    // cursor to edit — never activates a region.
    if (target.closest('[contenteditable="true"]')) return;
    // Click a linked phrase → jump to its region on the image. Navigation only:
    // creating and removing links is now an explicit action in the Link Bar,
    // never a side effect of clicking (or drawing).
    const linkedIds = graphIdsOf(target.closest<HTMLElement>('[data-graph-id]'));
    if (linkedIds.length > 0) {
      skipLinkScrollRef.current = true;
      onSpanActivate(linkedIds[0]);
    }
  };
  const handleMouseOver = (event: React.MouseEvent) => {
    // Skip while pointing inside the Rich editor — hovering text there shouldn't
    // flash regions on the image (and could distract while editing). The reverse
    // direction (region → phrase highlight) is driven by hoveredGraphId, not this
    // handler, so it still works in the editor.
    if ((event.target as Element).closest('[contenteditable="true"]')) return;
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
              canLink={canLink}
              selectedRegionGraphId={selectedRegionGraphId}
              pendingRegionActive={pendingLink}
              onLinkDrawnToElement={(textId, elementIndex, label) =>
                onLinkPhrase?.(textId, elementIndex, label)
              }
              onLinkRegionToElement={(textId, elementIndex, graphId, label) =>
                onLinkExistingRegion?.(textId, elementIndex, graphId, label)
              }
              onUnlinkElement={(textId, elementIndex, graphId) =>
                onUnlinkElement?.(textId, elementIndex, graphId)
              }
              onRemoveRegion={(graphId) => onDeleteRegion?.(graphId)}
              onDiscardDrawnRegion={() => onCancelPendingLink?.()}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
