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
 * view until the editor switches to Rich. Keyed by text id so a different text
 * re-seeds the draft.
 */
function TextEditor({
  text,
  token,
  onSaved,
  toolbarHost,
}: {
  text: ImageTextDetail;
  token: string | null | undefined;
  onSaved: () => void;
  /** Header slot the Rich/Preview + validity toolbar portals into (one bar). */
  toolbarHost: HTMLElement | null;
}) {
  const [draft, setDraft] = React.useState(text.content);
  const [valid, setValid] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const dirty = draft !== text.content;

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await updateImageText(token, text.id, { content: draft });
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
          value={draft}
          onChange={setDraft}
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
            onClick={() => setDraft(text.content)}
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

/**
 * One text column. Editors get an always-on Rich/Preview editor whose toolbar is
 * merged into this header (no edit toggle); readers get the rendered text under a
 * label. The last shown column also carries the panel's close control.
 */
function TextColumn({
  text,
  canEdit,
  token,
  onSaved,
  showClose,
  onClose,
}: {
  text: ImageTextDetail;
  canEdit: boolean;
  token: string | null | undefined;
  onSaved: () => void;
  /** The last shown column carries the panel's close control (one bar, no extra header). */
  showClose: boolean;
  onClose: () => void;
}) {
  // The editor's Rich/Preview + validity toolbar portals into this slot, so the
  // column never stacks a second bar under its header.
  const [toolbarHost, setToolbarHost] = React.useState<HTMLDivElement | null>(null);

  return (
    <section data-text-id={text.id} className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-2 gap-y-1 border-b bg-card px-3 py-1.5">
        {canEdit ? (
          // The merged Rich/Preview + validity toolbar lands here.
          <div ref={setToolbarHost} className="flex min-w-0 flex-1 flex-wrap items-center gap-1" />
        ) : (
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {text.type}
            {text.language ? (
              <span className="ml-1.5 font-mono normal-case opacity-70">{text.language}</span>
            ) : null}
          </span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
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
      </div>

      {canEdit ? (
        <TextEditor
          key={text.id}
          text={text}
          token={token}
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

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-lg border bg-card">
      <div
        ref={containerRef}
        onClick={handleClick}
        onMouseOver={handleMouseOver}
        onMouseLeave={() => onSpanHover(null)}
        className="viewer-text-panel min-h-0 flex-1 overflow-hidden"
      >
        <div
          className={cn(
            'h-full',
            isBoth
              ? 'grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0'
              : 'block'
          )}
        >
          {shown.length === 0 ? (
            <div className="flex items-center justify-between gap-2 border-b bg-card px-3 py-1.5">
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
            </div>
          ) : (
            shown.map((text, index) => (
              <TextColumn
                key={text.id}
                text={text}
                canEdit={canEdit}
                token={token}
                onSaved={() => onTextSaved?.()}
                showClose={index === shown.length - 1}
                onClose={onClose}
              />
            ))
          )}
        </div>
      </div>

      {armedElementIndex != null ? (
        <div className="flex items-center justify-between gap-2 border-t bg-primary/5 px-3 py-1.5 text-[11px]">
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
      ) : (
        <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
          {canLink
            ? 'Click a highlighted phrase to find its region; click an un-highlighted phrase to draw and link a new region.'
            : 'Click a highlighted phrase to find its region on the image.'}
        </p>
      )}
    </aside>
  );
}
