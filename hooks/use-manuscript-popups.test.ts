import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useManuscriptPopups } from './use-manuscript-popups';
import type { A9sWithMeta } from '@/types/annotation-viewer';

function makeAnnotation(id: string, meta: A9sWithMeta['_meta'] = {}): A9sWithMeta {
  return {
    id,
    type: 'Annotation',
    target: {},
    _meta: meta,
  } as A9sWithMeta;
}

describe('useManuscriptPopups', () => {
  describe('opening', () => {
    it('starts empty', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: false }));
      expect(result.current.openPopups).toEqual([]);
      expect(result.current.activePopupId).toBeNull();
      expect(result.current.activePopupRecord).toBeNull();
    });

    it('replaces single-popup state when allowMultipleBoxes is false', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: false }));
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('a'));
      });
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('b'));
      });
      expect(result.current.openPopups.map((p) => p.id)).toEqual(['b']);
      expect(result.current.activePopupId).toBe('b');
    });

    it('appends new popups when allowMultipleBoxes is true', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: true }));
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('a'));
      });
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('b'));
      });
      expect(result.current.openPopups.map((p) => p.id)).toEqual(['a', 'b']);
      expect(result.current.activePopupId).toBe('b');
    });

    it('does not duplicate when appending an annotation that is already open', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: true }));
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('a'));
      });
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('a'));
      });
      expect(result.current.openPopups.map((p) => p.id)).toEqual(['a']);
    });

    it('explicit mode override beats allowMultipleBoxes default', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: false }));
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('a'));
      });
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('b'), { mode: 'append' });
      });
      expect(result.current.openPopups.map((p) => p.id)).toEqual(['a', 'b']);
    });

    it('seeds draft fields from annotation _meta', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: false }));
      act(() => {
        result.current.openPopupCollectionFromAnnotation(
          makeAnnotation('local-1', {
            allographId: 5,
            handId: 7,
            positions: [1, 2],
            graphcomponentSet: [{ component: 3, features: [10] }],
          })
        );
      });
      const popup = result.current.openPopups[0];
      expect(popup.draftAllographId).toBe(5);
      expect(popup.draftHandId).toBe(7);
      expect(popup.draftPositionIds).toEqual([1, 2]);
      expect(popup.draftGraphcomponentSet).toEqual([{ component: 3, features: [10] }]);
    });

    it('overrides take precedence over seeded defaults', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: false }));
      act(() => {
        result.current.openPopupCollectionFromAnnotation(
          makeAnnotation('local-1', { allographId: 5 }),
          { overrides: { draftAllographId: 99, popupTab: 'notes' } }
        );
      });
      expect(result.current.openPopups[0].draftAllographId).toBe(99);
      expect(result.current.openPopups[0].popupTab).toBe('notes');
    });

    it('clears popups when called with null annotation', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: true }));
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('a'));
      });
      act(() => {
        result.current.openPopupCollectionFromAnnotation(null);
      });
      expect(result.current.openPopups).toEqual([]);
      expect(result.current.activePopupId).toBeNull();
    });
  });

  describe('removal', () => {
    it('removePopupById drops the popup and re-routes activePopupId to the first remaining', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: true }));
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('a'));
      });
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('b'));
      });
      act(() => {
        result.current.removePopupById('b');
      });
      expect(result.current.openPopups.map((p) => p.id)).toEqual(['a']);
      expect(result.current.activePopupId).toBe('a');
    });

    it('clearPopupCollection wipes both popups and active id', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: true }));
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('a'));
      });
      act(() => {
        result.current.clearPopupCollection();
      });
      expect(result.current.openPopups).toEqual([]);
      expect(result.current.activePopupId).toBeNull();
    });
  });

  describe('activation', () => {
    it('handleActivatePopup sets active id', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: true }));
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('a'));
      });
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('b'));
      });
      act(() => {
        result.current.handleActivatePopup('a');
      });
      expect(result.current.activePopupId).toBe('a');
      expect(result.current.activePopupRecord?.id).toBe('a');
    });

    it('visiblePopupRecords places the active popup last (paint order)', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: true }));
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('a'));
      });
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('b'));
      });
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('c'));
      });
      act(() => {
        result.current.handleActivatePopup('a');
      });
      expect(result.current.visiblePopupRecords.map((p) => p.id)).toEqual(['b', 'c', 'a']);
    });

    it('falls back to the first popup when active id is missing from the list', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: true }));
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('a'));
      });
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('b'));
      });
      act(() => {
        // Activate something that doesn't exist; the cleanup effect should
        // reroute activePopupId to openPopups[0].
        result.current.handleActivatePopup('does-not-exist');
      });
      expect(result.current.activePopupId).toBe('a');
    });
  });

  describe('getPopupById', () => {
    it('returns the matching popup', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: true }));
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('a'));
      });
      expect(result.current.getPopupById('a')?.id).toBe('a');
    });

    it('returns null for unknown id', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: true }));
      expect(result.current.getPopupById('nope')).toBeNull();
    });
  });

  describe('updatePopupById', () => {
    it('updates a single field on the matching popup', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: true }));
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('a'));
      });
      act(() => {
        result.current.updatePopupById('a', { popupTab: 'notes' });
      });
      expect(result.current.getPopupById('a')?.popupTab).toBe('notes');
    });

    it('is a no-op (preserves array identity) when updates produce identical values', () => {
      // The 11-field equality check at use-manuscript-popups.ts:178-191 exists
      // to avoid re-rendering popup consumers when nothing actually changed.
      // Pin the contract so a future refactor that replaces the check
      // doesn't silently break it.
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: true }));
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('a'));
      });
      const beforePopups = result.current.openPopups;
      act(() => {
        result.current.updatePopupById('a', { popupTab: 'components' });
      });
      expect(result.current.openPopups).toBe(beforePopups);
    });

    it('does not touch popups other than the one matched by id', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: true }));
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('a'));
      });
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('b'));
      });
      act(() => {
        result.current.updatePopupById('a', { popupTab: 'notes' });
      });
      expect(result.current.getPopupById('b')?.popupTab).toBe('components');
    });

    it('does nothing for an unknown id', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: true }));
      act(() => {
        result.current.openPopupCollectionFromAnnotation(makeAnnotation('a'));
      });
      const before = result.current.openPopups;
      act(() => {
        result.current.updatePopupById('missing', { popupTab: 'notes' });
      });
      expect(result.current.openPopups).toBe(before);
    });
  });

  describe('handlePopupPositionChange', () => {
    it('updates singlePopupPosition only when allowMultipleBoxes is false', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: false }));
      act(() => {
        result.current.handlePopupPositionChange('any', 42, 99);
      });
      expect(result.current.singlePopupPosition).toEqual({ x: 42, y: 99 });
    });

    it('is a no-op (preserves identity) when xy equals the previous position', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: false }));
      act(() => {
        result.current.handlePopupPositionChange('a', 10, 20);
      });
      const before = result.current.singlePopupPosition;
      act(() => {
        result.current.handlePopupPositionChange('a', 10, 20);
      });
      expect(result.current.singlePopupPosition).toBe(before);
    });

    it('ignores the call entirely when allowMultipleBoxes is true', () => {
      const { result } = renderHook(() => useManuscriptPopups({ allowMultipleBoxes: true }));
      const before = result.current.singlePopupPosition;
      act(() => {
        result.current.handlePopupPositionChange('a', 50, 50);
      });
      expect(result.current.singlePopupPosition).toBe(before);
    });
  });
});
