import { renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAnnotationDeletion } from './use-annotation-deletion';
import type { ViewerApi } from '@/components/manuscript/manuscript-annotorious';
import { makeAnnotation, makePopup } from '@/test/annotation-fixtures';
import type { A9sWithMeta } from '@/types/annotation-viewer';

vi.mock('@/components/ui/action-toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui/action-toast')>();
  return { ...actual, showActionNotification: vi.fn(actual.showActionNotification) };
});

import { showActionNotification } from '@/components/ui/action-toast';

const editorial = makeAnnotation('db:7', { annotationType: 'editorial' });

function renderDeletion(canDeleteEditorialAnnotations: boolean) {
  const markDeleted = vi.fn();
  const { result } = renderHook(() =>
    useAnnotationDeletion({
      canDeleteAnnotations: true,
      canDeleteEditorialAnnotations,
      getCanonicalAnnotation: (annotation) => annotation,
      getAnnotationKind: (annotation) =>
        (annotation as A9sWithMeta)._meta?.annotationType === 'editorial' ? 'editorial' : 'public',
      getPopupById: () => makePopup({ id: editorial.id, annotation: editorial }),
      removePopupById: vi.fn(),
      notifyDeletedAnnotations: vi.fn(),
      markDeleted,
      viewerApiRef: { current: null as ViewerApi | null },
      setActiveTool: vi.fn(),
    })
  );
  return { ...result.current, markDeleted };
}

describe('useAnnotationDeletion', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(showActionNotification).mockClear();
    toast.dismiss();
  });

  it('warns instead of deleting an editorial annotation for a user who may not annotate editorially', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { handleConfirmDelete, handleDeletePopupAnnotation, markDeleted } = renderDeletion(false);

    expect(handleConfirmDelete(editorial)).toBe(false);
    handleDeletePopupAnnotation(editorial.id);

    expect(confirm).not.toHaveBeenCalled();
    expect(markDeleted).not.toHaveBeenCalled();
    expect(showActionNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'error',
        title: 'Cannot delete this annotation',
        description: 'Only an admin can delete editorial annotations.',
      })
    );
  });

  it('keeps one warning on screen when refused deletes repeat', () => {
    const { handleConfirmDelete } = renderDeletion(false);

    handleConfirmDelete(editorial);
    handleConfirmDelete(makeAnnotation('db:8', { annotationType: 'editorial' }));

    expect(toast.getToasts()).toHaveLength(1);
  });

  it('asks a user who may annotate editorially before deleting an editorial annotation', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { handleConfirmDelete } = renderDeletion(true);

    expect(handleConfirmDelete(editorial)).toBe(true);
    expect(confirm).toHaveBeenCalledOnce();
    expect(showActionNotification).not.toHaveBeenCalled();
  });
});
