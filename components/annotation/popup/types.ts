import type { ShapeSuggestion } from '@/types/glyph-assist';

export type PopupTab = 'details' | 'components' | 'positions' | 'notes' | 'explain';

export type SelectedComponentGroup = {
  componentId: number;
  componentName: string;
  featureNames: string[];
};

/** Asking a model about the shape in a standard popup (AI programme W3.5, W3.6). */
export type PopupAssist = {
  /** The saved annotation's id, to explain it; null on a draft. */
  graphId: number | null;
  suggestion: ShapeSuggestion | null;
  /** The researcher has changed what the model filled in. */
  edited: boolean;
  asking: boolean;
  error: string | null;
  onAsk: () => void;
};
