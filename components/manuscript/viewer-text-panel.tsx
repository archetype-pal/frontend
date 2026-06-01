'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Download, ExternalLink, Pencil, X } from 'lucide-react';

import { ImageTextViewer } from '@/components/text/image-text-viewer';
import { showActionNotification } from '@/components/ui/action-toast';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
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
  /** Which text(s) to show: transcription, translation, or both in parallel. */
  displayMode: TextDisplayMode;
  /** Change which text(s) are shown (the panel's own "Show" control). */
  onSetDisplayMode: (mode: TextDisplayMode) => void;
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

/** Editor-only authoring surface for a single text — lazy TEI editor + save. */
function TextEditPanel({
  text,
  token,
  onSaved,
  onCancel,
}: {
  text: ImageTextDetail;
  token: string | null | undefined;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = React.useState(text.content);
  const [valid, setValid] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

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
    <div className="space-y-2">
      <TeiTextEditor
        value={draft}
        onChange={setDraft}
        token={token ?? null}
        onValidityChange={setValid}
      />
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => void handleSave()}
          disabled={!valid || saving || draft === text.content}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

/** One text column: type/language label + actions (open editor, download,
 * edit toggle) over the rendered text or, for editors, the in-place TEI editor. */
function TextColumn({
  text,
  canEdit,
  token,
  isEditing,
  onToggleEdit,
  onSaved,
}: {
  text: ImageTextDetail;
  canEdit: boolean;
  token: string | null | undefined;
  isEditing: boolean;
  onToggleEdit: () => void;
  onSaved: () => void;
}) {
  return (
    <section data-text-id={text.id} className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {text.type}
          {text.language ? (
            <span className="ml-1.5 font-mono normal-case opacity-70">{text.language}</span>
          ) : null}
        </span>
        <div className="flex items-center gap-0.5">
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
          {canEdit ? (
            <Button
              variant={isEditing ? 'default' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              aria-label={isEditing ? 'Stop editing' : 'Edit text'}
              aria-pressed={isEditing}
              title={isEditing ? 'Stop editing' : 'Edit text markup'}
              onClick={onToggleEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="px-4 py-3">
        {isEditing ? (
          <TextEditPanel text={text} token={token} onSaved={onSaved} onCancel={onToggleEdit} />
        ) : (
          <ImageTextViewer
            html={text.content}
            richMarkup
            className="prose prose-sm max-w-none dark:prose-invert"
          />
        )}
      </div>
    </section>
  );
}

export function ViewerTextPanel({
  texts,
  displayMode,
  onSetDisplayMode,
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
  const hasTranscription = Boolean(transcription);
  const hasTranslation = Boolean(translation);

  const [editingId, setEditingId] = React.useState<number | null>(null);
  // Leaving a text view or losing edit rights closes any open editor.
  React.useEffect(() => {
    if (editingId != null && !shown.some((t) => t.id === editingId)) setEditingId(null);
  }, [shown, editingId]);
  React.useEffect(() => {
    if (!canEdit) setEditingId(null);
  }, [canEdit]);

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
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <Segmented
          ariaLabel="Show transcription or translation"
          value={displayMode}
          onChange={onSetDisplayMode}
          options={[
            { value: 'transcription', label: 'Transcription', disabled: !hasTranscription },
            { value: 'translation', label: 'Translation', disabled: !hasTranslation },
            { value: 'both', label: 'Both', disabled: !hasTranscription || !hasTranslation },
          ]}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label="Hide text panel"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

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
            <p className="px-4 py-3 text-sm text-muted-foreground">
              No text recorded for this image.
            </p>
          ) : (
            shown.map((text) => (
              <TextColumn
                key={text.id}
                text={text}
                canEdit={canEdit}
                token={token}
                isEditing={canEdit && editingId === text.id}
                onToggleEdit={() => setEditingId((cur) => (cur === text.id ? null : text.id))}
                onSaved={() => {
                  setEditingId(null);
                  onTextSaved?.();
                }}
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
