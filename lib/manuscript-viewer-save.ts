/**
 * Pure interpretation of an annotation save outcome, extracted from
 * manuscript-viewer.tsx (Track D1). `handleSave` is otherwise orchestration
 * (validate → editorState.saveAll → side effects), but the 8-branch mapping of
 * the outcome to a user notification — and whether the success side effects
 * should run — is load-bearing logic worth testing directly.
 */

import type { SaveOutcome } from '@/hooks/use-annotation-editor-state';
import type { Annotation as A9sAnnotation } from '@/components/manuscript/manuscript-annotorious';
import type { AnnotationCreationKind } from '@/types/annotation-viewer';
import { isTextRegionAnnotation } from './manuscript-viewer-annotation-types';
import { formatSavedAnnotationDescription } from './manuscript-viewer-collection';

export interface SaveNotice {
  kind: 'error' | 'saved';
  title: string;
  description: string;
}

export interface SaveOutcomeView {
  /** The toast to show, or null for the silent (nothing-to-commit) branches. */
  notice: SaveNotice | null;
  /** Whether the success side effects (clear selection/popups, re-seed) run. */
  committed: boolean;
}

export function describeSaveOutcome(outcome: SaveOutcome): SaveOutcomeView {
  switch (outcome.kind) {
    case 'no-token':
      return {
        notice: {
          kind: 'error',
          title: 'Sign in required',
          description: 'Please log in again before saving annotations.',
        },
        committed: false,
      };
    case 'no-image':
    case 'no-capability':
    case 'no-changes':
      // Silent — the Save button is gated on isDirty, so these mean nothing
      // meaningful to commit.
      return { notice: null, committed: false };
    case 'all-failed':
      return {
        notice: {
          kind: 'error',
          title: 'Failed to save annotations',
          description: outcome.firstError ?? `${outcome.failedCount} could not be saved.`,
        },
        committed: false,
      };
    case 'saved-but-refresh-failed':
      return {
        notice: {
          kind: 'error',
          title: 'Saved but could not refresh',
          description: `${outcome.succeededCount} saved on the server, but reloading failed: ${outcome.message}. Reload the page to see the latest state.`,
        },
        committed: false,
      };
    case 'all-succeeded':
      return {
        notice: {
          kind: 'saved',
          title: 'Annotations saved',
          description: formatSavedAnnotationDescription({
            createdCount: outcome.counts.created,
            updatedCount: outcome.counts.updated,
            deletedCount: outcome.counts.deleted,
          }),
        },
        committed: true,
      };
    case 'partial':
      return {
        notice: {
          kind: 'error',
          title: 'Some annotations could not be saved',
          description: `${outcome.succeededCount} saved, ${outcome.failedCount} still unsaved. Try again to retry the failed entries.`,
        },
        committed: true,
      };
  }
}

/**
 * Why a not-yet-saved annotation cannot be saved, or null when it can.
 *
 * Pre-flight validation lives outside `editorState.saveAll` because the rules
 * depend on viewer-side classification — the caller passes the `kind` it
 * derived from the canonical annotation.
 */
export function standardSaveValidationError(
  annotation: A9sAnnotation,
  kind: AnnotationCreationKind
): string | null {
  if (isTextRegionAnnotation(annotation) || kind === 'editorial') return null;

  const allographId = annotation._meta?.allographId;
  const handId = annotation._meta?.handId;

  if (typeof allographId !== 'number' || allographId <= 0) {
    return 'Choose an allograph from the dropdown before saving a new annotation.';
  }

  if (typeof handId !== 'number' || handId <= 0) {
    return 'Choose a hand from the dropdown before saving a new annotation.';
  }

  return null;
}
