'use client';

/**
 * Asking a model about the shape in a draft popup (AI programme W3.5).
 *
 * The answer goes into the popup's own draft fields, so everything after it is
 * the popup's ordinary editing. The draft carries the suggestion's id through
 * to its save, which is what closes the proposal as accepted; discarding the
 * draft closes it as rejected.
 *
 * On a saved annotation the answer only adds to what is recorded. Nothing recorded
 * leaves the fields, and what the model did not see is listed for the researcher.
 */

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { useRefusalWords } from '@/lib/refusal';

import { a9sToBackendFeature, dbIdFromA9s } from '@/lib/anno-mapping';
import { isDbId } from '@/lib/annotation-popup-utils';
import {
  GlyphAssistError,
  getAssistEnabled,
  rejectSuggestion,
  suggestForAnnotation,
  suggestShape,
} from '@/services/glyph-assist';
import type { A9sGraphComponent, PopupRecord } from '@/types/annotation-viewer';
import type { ShapeSuggestion } from '@/types/glyph-assist';

type Recorded = { components: A9sGraphComponent[]; positions: number[] };

function describeRow(name: string | undefined, feature?: string): string {
  return feature ? `${name ?? ''}: ${feature}` : (name ?? '');
}

/** What the fields hold once `suggestion` is added to `recorded`, and how the two differ. */
export function addSuggestionToRecord(
  recorded: Recorded,
  suggestion: ShapeSuggestion,
  positionNameById: Map<number, string>
): ShapeSuggestion {
  const merged = new Map(
    recorded.components.map((row) => [
      row.component,
      {
        component: row.component,
        component_name: row.componentName ?? '',
        features: [...row.features],
        feature_details: [...(row.featureDetails ?? [])],
      },
    ])
  );
  const added: string[] = [];
  const seen = new Set<string>();
  for (const row of suggestion.components) {
    seen.add(`${row.component}`);
    let target = merged.get(row.component);
    if (!target) {
      target = {
        component: row.component,
        component_name: row.component_name,
        features: [],
        feature_details: [],
      };
      merged.set(row.component, target);
      if (row.features.length === 0) added.push(describeRow(row.component_name));
    }
    for (const feature of row.feature_details) {
      seen.add(`${row.component}:${feature.id}`);
      if (target.features.includes(feature.id)) continue;
      target.features.push(feature.id);
      target.feature_details.push(feature);
      added.push(describeRow(row.component_name, feature.name));
    }
  }
  const notSeen: string[] = [];
  for (const row of recorded.components) {
    if (!seen.has(`${row.component}`) && row.features.length === 0) {
      notSeen.push(describeRow(row.componentName));
    }
    for (const feature of row.featureDetails ?? []) {
      if (!seen.has(`${row.component}:${feature.id}`)) {
        notSeen.push(describeRow(row.componentName, feature.name));
      }
    }
  }
  const positionName = (id: number) => positionNameById.get(id) ?? `#${id}`;
  added.push(
    ...suggestion.positions.filter((id) => !recorded.positions.includes(id)).map(positionName)
  );
  notSeen.push(
    ...recorded.positions.filter((id) => !suggestion.positions.includes(id)).map(positionName)
  );
  return {
    ...suggestion,
    components: [...merged.values()],
    positions: [...new Set([...recorded.positions, ...suggestion.positions])],
    comparison: { base: recorded, added, notSeen },
  };
}

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
  positionNameById,
  getPopupById,
  updatePopupById,
}: {
  canAsk: boolean;
  imageId: string;
  imageHeight: number;
  allographNameById: Map<number, string>;
  positionNameById: Map<number, string>;
  getPopupById: (popupId: string) => PopupRecord | null;
  updatePopupById: (popupId: string, updates: Partial<PopupRecord>) => void;
}) {
  const t = useTranslations('annotation.popup.assist');
  const refusalWords = useRefusalWords();
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
        const savedId = isDbId(popup.annotation.id) ? dbIdFromA9s(popup.annotation) : null;
        const answer =
          savedId != null
            ? await suggestForAnnotation(savedId, {
                allograph: popup.draftAllographId,
                language,
              })
            : await suggestShape(Number(imageId), {
                annotation: a9sToBackendFeature(popup.annotation, imageHeight),
                allograph: popup.allographLocked ? popup.draftAllographId : null,
                language,
              });
        // The draft was discarded while the model was working: nobody is left to decide.
        if (!latestGetPopup.current(popupId)) {
          void rejectSuggestion(answer.id).catch(() => undefined);
          return;
        }
        const suggestion =
          savedId != null
            ? addSuggestionToRecord(
                popup.suggestion?.comparison?.base ?? {
                  components: popup.draftGraphcomponentSet,
                  positions: popup.draftPositionIds,
                },
                answer,
                positionNameById
              )
            : answer;
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
        const detail =
          error instanceof GlyphAssistError ? refusalWords(error.code, error.detail) : '';
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
      refusalWords,
      allographNameById,
      positionNameById,
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
