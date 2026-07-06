'use client';

import * as React from 'react';
import { Link2, Trash2, Unlink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Mode } from '@/components/backoffice/tei-text-editor';
import type { EditorLinkSelection } from '@/lib/tei-tiptap';

/** Region currently chosen for linking: a freshly drawn one (geometry held on
 *  the canvas, not yet a graph) or one selected on the image (an existing graph). */
export type ActiveRegion = { kind: 'drawn' } | { kind: 'existing'; graphId: number };

export interface ViewerLinkBarProps {
  /** Whether the current user may author links (superuser). */
  canLink: boolean;
  /** The text this bar links into. */
  textId: number;
  /** Editor state (from the card). */
  mode: Mode;
  richAvailable: boolean;
  /** The linkable element under the caret (null → no phrase to link). */
  linkTarget: EditorLinkSelection | null;
  /** Unsaved editor edits — the link index resolves against saved content, so a
   *  link auto-saves first. */
  dirty: boolean;
  onSave: () => Promise<void>;
  /** The region picked for linking (drawn or selected), or null. */
  activeRegion: ActiveRegion | null;
  /** Link the drawn region to the element_index-th phrase (geometry mode). */
  onLinkDrawnToElement: (textId: number, elementIndex: number, label: string) => void;
  /** Link the selected existing region (by graph id) to the element (graph_id mode). */
  onLinkRegionToElement: (
    textId: number,
    elementIndex: number,
    graphId: number,
    label: string
  ) => void;
  /** Remove just this element's link to the region. */
  onUnlinkElement: (textId: number, elementIndex: number, graphId: number) => void;
  /** Remove the whole region (deletes it + all its links). */
  onRemoveRegion: (graphId: number) => void;
  /** Discard a drawn-but-unlinked region. */
  onDiscardDrawnRegion: () => void;
}

const HINT = 'text-[11px] leading-relaxed text-muted-foreground';

/**
 * The region↔text link bar, docked at the foot of a text card. Linking is
 * explicit and edit-mode-only: pick a region (draw one, or click one on the
 * image) and put the cursor in a phrase, then press Link. Nothing is written
 * until then. Also hosts per-link unlink and whole-region removal.
 */
export function ViewerLinkBar(props: ViewerLinkBarProps) {
  const {
    canLink,
    textId,
    mode,
    richAvailable,
    linkTarget,
    dirty,
    onSave,
    activeRegion,
    onLinkDrawnToElement,
    onLinkRegionToElement,
    onUnlinkElement,
    onRemoveRegion,
    onDiscardDrawnRegion,
  } = props;

  const [busy, setBusy] = React.useState(false);

  if (!canLink) return null;

  const phrase = linkTarget?.target ?? null;
  const phraseLinkedToActive =
    activeRegion?.kind === 'existing' && phrase
      ? phrase.linkedGraphIds.includes(activeRegion.graphId)
      : false;

  // Save (so element_index matches saved content) before running a link action.
  // The index/label are captured by the caller before awaiting, so a re-seed on
  // save can't shift them.
  const withSave = async (fn: () => void) => {
    setBusy(true);
    try {
      if (dirty) await onSave();
      fn();
    } finally {
      setBusy(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="shrink-0 border-t bg-muted/40 px-3 py-1.5">{children}</div>
  );

  // Non-Rich modes: linking is Rich-only.
  if (mode !== 'rich') {
    return shell(
      <p className={HINT}>
        {richAvailable
          ? 'Switch to the Rich tab to link phrases to image regions.'
          : 'This document can’t be edited richly, so region links can’t be edited here.'}
      </p>
    );
  }

  const regionChip =
    activeRegion == null ? null : (
      <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
        {activeRegion.kind === 'drawn' ? 'New region drawn' : `Region #${activeRegion.graphId}`}
        {activeRegion.kind === 'drawn' ? (
          <button
            type="button"
            className="text-primary/70 hover:text-primary"
            title="Discard this region"
            onClick={onDiscardDrawnRegion}
          >
            ✕
          </button>
        ) : null}
      </span>
    );

  const phraseChip = phrase ? (
    <span className="min-w-0 max-w-[18rem] truncate rounded bg-muted px-1.5 py-0.5 text-[11px] text-foreground/80">
      “{phrase.label || `‹${phrase.el}›`}”
    </span>
  ) : (
    <span className={cn(HINT, 'italic')}>put your cursor in a phrase</span>
  );

  const doLink = () => {
    if (!phrase || !activeRegion) return;
    const { elementIndex, label } = phrase;
    void withSave(() => {
      if (activeRegion.kind === 'drawn') onLinkDrawnToElement(textId, elementIndex, label);
      else onLinkRegionToElement(textId, elementIndex, activeRegion.graphId, label);
    });
  };

  const doUnlink = () => {
    if (!phrase || activeRegion?.kind !== 'existing') return;
    const { elementIndex } = phrase;
    const graphId = activeRegion.graphId;
    void withSave(() => onUnlinkElement(textId, elementIndex, graphId));
  };

  return shell(
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Link
      </span>
      {regionChip ?? (
        <span className={cn(HINT, 'italic')}>select a region on the image, or draw one</span>
      )}
      <span aria-hidden className="text-muted-foreground">
        ↔
      </span>
      {phraseChip}

      <div className="ml-auto flex items-center gap-1">
        {activeRegion && phrase && !phraseLinkedToActive ? (
          <Button size="sm" className="h-7 gap-1" disabled={busy} onClick={doLink}>
            <Link2 className="h-3.5 w-3.5" />
            {busy ? 'Linking…' : 'Link'}
          </Button>
        ) : null}

        {phraseLinkedToActive ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1"
            disabled={busy}
            onClick={doUnlink}
          >
            <Unlink className="h-3.5 w-3.5" />
            Unlink phrase
          </Button>
        ) : null}

        {activeRegion?.kind === 'existing' ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  'Remove this region?\n\nIt will be deleted from the image and unlinked from every phrase.'
                )
              ) {
                onRemoveRegion(activeRegion.graphId);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove region
          </Button>
        ) : null}
      </div>
    </div>
  );
}
