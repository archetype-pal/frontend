import type { ModelLabelKey } from './model-labels';
import type { ResultType } from './search-types';
import { SEARCH_RESULT_CONFIG } from './search-types';

/** Result types whose display name is controlled by a model label. */
const RESULT_TYPE_LABEL_KEYS: Partial<Record<ResultType, ModelLabelKey>> = {
  manuscripts: 'appManuscripts',
};

/**
 * Return the user-facing label for a result type, resolving it from
 * model labels when a custom translation exists.
 */
export function resolveResultTypeLabel(
  type: ResultType,
  getLabel?: (key: ModelLabelKey) => string
): string {
  const labelKey = RESULT_TYPE_LABEL_KEYS[type];
  if (labelKey && getLabel) return getLabel(labelKey);
  return SEARCH_RESULT_CONFIG[type].label;
}
