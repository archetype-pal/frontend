'use client';

import * as React from 'react';

import { useMediaQuery } from '@/hooks/use-media-query';
import { useResizableTextPanel } from '@/hooks/use-resizable-text-panel';
import type { AnnotationViewerSettings } from '@/types/annotation-viewer';

interface UseViewerTextModeArgs {
  imageId: string;
  imageTexts: Array<{ type: string }>;
  viewerSettings: AnnotationViewerSettings;
}

/**
 * View mode (Allograph / Text / Both) and the text panel derived from it.
 *
 * `viewMode` is the single source of truth; the text panel and the text-region
 * annotation layer are both derived from it. An image with no texts can never
 * enter a text view, so we clamp to 'allograph' to avoid a blank canvas.
 */
export function useViewerTextMode({ imageId, imageTexts, viewerSettings }: UseViewerTextModeArgs) {
  const hasTexts = imageTexts.length > 0;
  // The Transcription/Translation/Both chooser lives in the Settings panel; it is
  // only offered when both kinds exist (otherwise there is nothing to choose).
  const hasTranscription = React.useMemo(
    () => imageTexts.some((t) => t.type.toLowerCase() === 'transcription'),
    [imageTexts]
  );
  const hasTranslation = React.useMemo(
    () => imageTexts.some((t) => t.type.toLowerCase() === 'translation'),
    [imageTexts]
  );
  const showTextDisplay = hasTranscription && hasTranslation;

  // Arriving from a text search hit (…/images/{id}?q=william) should reveal the
  // transcription so the highlighted passage is visible — but transiently, never
  // persisting a view-mode preference (that lives in localStorage). Re-evaluated
  // per image; cleared the moment the reader uses the mode toggle themselves.
  const [searchForcesText, setSearchForcesText] = React.useState(false);
  // Re-derive from the URL whenever the image (or its has-texts status) changes,
  // using the React "store info from previous renders" pattern instead of an
  // effect. The window guard keeps the first (SSR/hydration) render at `false`,
  // so there is no hydration mismatch; the re-derive fires only on client-side
  // image transitions, exactly when the old effect did. Handlers may still set
  // this to `false` directly (a deliberate mode toggle), which sticks until the
  // next image change re-arms the previous-key tracker below.
  const prevSearchForcesKeyRef = React.useRef<string | null>(null);
  const searchForcesKey = `${imageId}|${hasTexts}`;
  if (prevSearchForcesKeyRef.current !== searchForcesKey) {
    prevSearchForcesKeyRef.current = searchForcesKey;
    if (typeof window !== 'undefined') {
      setSearchForcesText(
        hasTexts && Boolean(new URLSearchParams(window.location.search).get('q'))
      );
    }
  }

  const effectiveViewMode = !hasTexts
    ? 'allograph'
    : searchForcesText && viewerSettings.viewMode === 'allograph'
      ? 'text'
      : viewerSettings.viewMode;
  // The search term may live in either the Latin transcription or the English
  // translation, so a deep-link shows both (when both exist) so the match is
  // visible to highlight. Transient — does not change the saved preference.
  const effectiveTextDisplayMode =
    searchForcesText && showTextDisplay ? 'both' : viewerSettings.textDisplayMode;
  // Pure text view: drawing a region links it to a phrase (no glyph/allograph).
  const textLinkingActive = effectiveViewMode === 'text';
  const showTextPanel = effectiveViewMode !== 'allograph' && hasTexts;
  const textPanelPosition = viewerSettings.textPanelPosition;
  const isBottomDock = textPanelPosition === 'bottom';
  // Splitter sizing only applies on the md+ docked layout; on mobile the panel
  // stacks at a percentage height and the splitter is hidden.
  const isMdUp = useMediaQuery('(min-width: 768px)');
  const textPanelResize = useResizableTextPanel(textPanelPosition, {
    storageKey: 'viewerTextPanelSize',
    defaultWidth: 544, // md:w-[34rem]
    defaultHeight: 320, // ≈ h-[40%]
    minWidth: 320,
    maxWidth: 900,
    minHeight: 160,
    maxHeight: 900,
  });

  return {
    hasTexts,
    hasTranscription,
    hasTranslation,
    showTextDisplay,
    setSearchForcesText,
    effectiveViewMode,
    effectiveTextDisplayMode,
    textLinkingActive,
    showTextPanel,
    textPanelPosition,
    isBottomDock,
    isMdUp,
    textPanelResize,
  };
}
