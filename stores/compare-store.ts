import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** A manuscript (item-part) staged for side-by-side comparison. */
export interface CompareItem {
  itemPartId: number;
  displayLabel: string;
  shelfmark?: string;
  repositoryLabel?: string;
}

/** Mirador renders each compared manuscript in its own window; beyond a
 * handful the mosaic layout stops being usable, so the selection is capped
 * (see issue #110 UX discussion). */
export const MAX_COMPARE_ITEMS = 4;

interface CompareState {
  items: CompareItem[];
  isInCompare: (itemPartId: number) => boolean;
  /** Returns false (no-op) when the item is already staged or the cap is reached. */
  addItem: (item: CompareItem) => boolean;
  removeItem: (itemPartId: number) => void;
  clear: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],

      isInCompare: (itemPartId) => get().items.some((item) => item.itemPartId === itemPartId),

      addItem: (item) => {
        const { items } = get();
        if (items.length >= MAX_COMPARE_ITEMS || items.some((i) => i.itemPartId === item.itemPartId)) {
          return false;
        }
        set({ items: [...items, item] });
        return true;
      },

      removeItem: (itemPartId) => {
        set((state) => ({ items: state.items.filter((item) => item.itemPartId !== itemPartId) }));
      },

      clear: () => set({ items: [] }),
    }),
    {
      // Session-scoped staging area, distinct from the persistent, named
      // Collections (lib/collection-storage.ts) — closing the tab clears it.
      name: 'compare-selection',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
