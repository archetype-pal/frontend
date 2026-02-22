'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UnsavedChangesBarProps {
  /** Whether there are unsaved changes to show the bar */
  visible: boolean;
  /** Called when the user clicks Save */
  onSave: () => void;
  /** Called when the user clicks Discard */
  onDiscard: () => void;
  /** Whether the save operation is in progress */
  saving?: boolean;
}

/**
 * A sticky bar at the bottom of the viewport that appears when
 * the user has unsaved form changes.
 *
 * Usage:
 * ```tsx
 * <UnsavedChangesBar
 *   visible={isDirty}
 *   onSave={handleSave}
 *   onDiscard={handleReset}
 *   saving={mutation.isPending}
 * />
 * ```
 */
export function UnsavedChangesBar({
  visible,
  onSave,
  onDiscard,
  saving = false,
}: UnsavedChangesBarProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex items-center justify-between gap-4 px-6 py-3 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>You have unsaved changes</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
            Discard
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
