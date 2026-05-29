/**
 * Pure interpretation of an annotation save outcome, extracted from
 * manuscript-viewer.tsx (Track D1). `handleSave` is otherwise orchestration
 * (validate → editorState.saveAll → side effects), but the 8-branch mapping of
 * the outcome to a user notification — and whether the success side effects
 * should run — is load-bearing logic worth testing directly.
 */

import type { SaveOutcome } from '@/hooks/use-annotation-editor-state';
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
