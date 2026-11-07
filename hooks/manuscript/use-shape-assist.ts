'use client';

/**
 * Asking a model about the shape in a draft popup (AI programme W3.5).
 *
 * The answer goes into the popup's own draft fields, so everything after it is
 * the popup's ordinary editing. The draft carries the suggestion's id through
 * to its save, which is what closes the proposal as accepted; discarding the
 * draft closes it as rejected.
 */

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { a9sToBackendFeature } from '@/lib/anno-mapping';
import {
  GlyphAssistError,
  getAssistEnabled,
  rejectSuggestion,
  suggestShape,
} from '@/services/glyph-assist';
import type { PopupRecord } from '@/types/annotation-viewer';

/** Whether the researcher has changed what the model filled in. */
export function isSuggestionEdited(popup: PopupRecord): boolean {
  const { suggestion } = popup;
  if (!suggestion) return false;
  const chosen = (rows: Array<{ component: number; features: number[] }>) =>
    JSON.stringify(
      rows
        .map((row) => [row.component, [...row.features].sort((a, b) => a - b)])
        .sort((a, b) => Number(a[0]) - Number(b[0]))
    );
  return (
    (suggestion.allograph != null && popup.draftAllographId !== suggestion.allograph) ||
    chosen(popup.draftGraphcomponentSet) !== chosen(suggestion.components) ||
    [...popup.draftPositionIds].sort().join() !== [...suggestion.positions].sort().join()
  );
}

export function useShapeAssist({
  canAsk,
  imageId,
  imageHeight,
  allographNameById,
  getPopupById,
  updatePopupById,
}: {
  canAsk: boolean;
  imageId: string;
  imageHeight: number;
  allographNameById: Map<number, string>;
  getPopupById: (popupId: string) => PopupRecord | null;
  updatePopupById: (popupId: string, updates: Partial<PopupRecord>) => void;
}) {
  const t = useTranslations('annotation.popup.assist');
  const language = useLocale();
  // The popups as they are when an answer arrives, not as they were when it was asked for.
  const latestGetPopup = React.useRef(getPopupById);
  React.useEffect(() => {
    latestGetPopup.current = getPopupById;
  }, [getPopupById]);
  const [askingIds, setAskingIds] = React.useState<ReadonlySet<string>>(new Set());
  const [errors, setErrors] = React.useState<Readonly<Record<string, string>>>({});

  const [enabled, setEnabled] = React.useState(false);
  React.useEffect(() => {
    if (!canAsk) return;
    let cancelled = false;
    void getAssistEnabled()
      .catch(() => false)
      .then((on) => {
        if (!cancelled) setEnabled(on);
      });
    return () => {
      cancelled = true;
    };
  }, [canAsk]);

  const closeSuggestion = React.useCallback((popup: PopupRecord | null) => {
    // The person has decided; if this fails, the proposal only stays undecided.
    if (popup?.suggestion) void rejectSuggestion(popup.suggestion.id).catch(() => undefined);
  }, []);

  const ask = React.useCallback(
    async (popupId: string) => {
      const popup = getPopupById(popupId);
      if (!popup) return;
      setAskingIds((current) => new Set(current).add(popupId));
      setErrors(({ [popupId]: _cleared, ...rest }) => rest);
      try {
        const suggestion = await suggestShape(Number(imageId), {
          annotation: a9sToBackendFeature(popup.annotation, imageHeight),
          allograph: popup.allographLocked ? popup.draftAllographId : null,
          language,
        });
        // The draft was discarded while the model was working: nobody is left to decide.
        if (!latestGetPopup.current(popupId)) {
          void rejectSuggestion(suggestion.id).catch(() => undefined);
          return;
        }
        // Asked again: the previous answer is superseded.
        closeSuggestion(popup);
        const allograph = suggestion.allograph ?? popup.draftAllographId;
        updatePopupById(popupId, {
          suggestion,
          popupTab: 'details',
          draftAllographId: allograph,
          draftAllographText: allograph != null ? (allographNameById.get(allograph) ?? '') : '',
          draftHandId: suggestion.hand ?? popup.draftHandId,
          draftGraphcomponentSet: suggestion.components.map((row) => ({
            component: row.component,
            componentName: row.component_name,
            features: row.features,
            featureDetails: row.feature_details,
          })),
          draftPositionIds: suggestion.positions,
        });
      } catch (error) {
        const detail = error instanceof GlyphAssistError ? error.detail : '';
        setErrors((current) => ({ ...current, [popupId]: detail || t('failed') }));
      } finally {
        setAskingIds((current) => {
          const next = new Set(current);
          next.delete(popupId);
          return next;
        });
      }
    },
    [
      allographNameById,
      closeSuggestion,
      getPopupById,
      imageHeight,
      imageId,
      language,
      t,
      updatePopupById,
    ]
  );

  return {
    enabled: canAsk && enabled,
    ask,
    closeSuggestion,
    isAsking: (popupId: string) => askingIds.has(popupId),
    errorFor: (popupId: string) => errors[popupId] ?? null,
  };
}
