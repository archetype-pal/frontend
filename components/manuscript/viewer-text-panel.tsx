'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Download, ExternalLink, X } from 'lucide-react';

import { ImageTextViewer } from '@/components/text/image-text-viewer';
import { showActionNotification } from '@/components/ui/action-toast';
import { Button } from '@/components/ui/button';
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

const TYPE_ORDER = (type: string): number =>
  type === 'Transcription' ? 0 : type === 'Translation' ? 1 : 2;

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
      <div className="px-4 py-3">
        <TeiTextEditor
          value={value}
          onChange={onChange}
          token={token ?? null}
          onValidityChange={setValid}
          toolbarContainer={toolbarHost}
          defaultMode="preview"
          hideSource
        />
      </div>
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
  if (k === 'transcription') return 'var(--color-transcription)';
  if (k === 'translation') return 'var(--color-translation)';
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
}) {
  // The editor's Rich/Preview + validity toolbar portals into this header slot.
  const [toolbarHost, setToolbarHost] = React.useState<HTMLDivElement | null>(null);
  const tone = textTone(text.type);

  return (
    <section
      data-text-id={text.id}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card shadow-sm"
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
    () => ordered.find((t) => t.type.toLowerCase() === 'transcription'),
    [ordered]
  );
  const translation = React.useMemo(
    () => ordered.find((t) => t.type.toLowerCase() === 'translation'),
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

  const containerRef = React.useRef<HTMLDivElement | null>(null);

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
    matches[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [linkedGraphId, shownKey]);

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
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [armedElementIndex, armedTextId, shownKey]);

  const handleClick = (event: React.MouseEvent) => {
    const target = event.target as Element;
    // Decide based on the *innermost* linkable element the user clicked.
    const innermost = target.closest<HTMLElement>('[data-dpt]');
    const ownIds = graphIdsOf(innermost);
    if (ownIds.length > 0) {
      onSpanActivate(ownIds[0]); // this element is itself linked → show its region
      return;
    }
    // Innermost element is unlinked + author capability → arm linking for it,
    // indexed within its own text column.
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
    // Otherwise fall back to the nearest linked ancestor (read-only navigation).
    const ancestorIds = graphIdsOf(target.closest('[data-graph-id]'));
    if (ancestorIds.length > 0) onSpanActivate(ancestorIds[0]);
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
          <TextEditorCard
            key={text.id}
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
          />
        ))}
      </div>

      {armedElementIndex != null ? (
        <div className="flex shrink-0 items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px]">
          <span className="text-primary">
            Draw the region for this phrase on the image to link it.
          </span>
          <button
            type="button"
            onClick={() => onCancelLink?.()}
            className="rounded px-1.5 py-0.5 font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : canLink ? (
        <p className="shrink-0 px-1 text-[11px] text-muted-foreground">
          Click a highlighted phrase to find its region; click an un-highlighted phrase to draw and
          link a new region.
        </p>
      ) : null}
    </div>
  );
}
