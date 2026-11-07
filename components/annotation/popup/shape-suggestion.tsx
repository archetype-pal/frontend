'use client';

/**
 * Asking a model what a drawn shape is (AI programme W3.5), in a draft's popup.
 *
 * The answer fills the draft's own fields, so accepting, editing and rejecting
 * are the popup's ordinary controls. Beside them it shows what the model saw and
 * how sure it was, which is what the researcher checks it against.
 */

import { useTranslations } from 'next-intl';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ShapeSuggestion as Suggestion } from '@/types/glyph-assist';

export function ShapeSuggestion({
  suggestion,
  asking,
  error,
  onAsk,
}: {
  suggestion: Suggestion | null;
  asking: boolean;
  error: string | null;
  onAsk: () => void;
}) {
  const t = useTranslations('annotation.popup.assist');

  return (
    <section className="mb-4 space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
      {!suggestion && <p className="text-xs text-muted-foreground">{t('suggestHint')}</p>}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        disabled={asking}
        onClick={onAsk}
      >
        {asking ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
        )}
        {asking ? t('suggesting') : suggestion ? t('suggestAgain') : t('suggest')}
      </Button>
      <div aria-live="polite" className="space-y-2 empty:hidden">
        {error && <p className="text-xs text-destructive">{error}</p>}
        {suggestion && !asking && (
          <>
            {suggestion.problem && (
              <p className="flex gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {suggestion.problem}
              </p>
            )}
            <p className="font-medium">
              {suggestion.allograph != null
                ? t('suggested', { label: suggestion.allograph_label })
                : t('suggestedNothing')}
              {suggestion.confidence != null && (
                <span className="ml-2 text-xs font-normal tabular-nums text-muted-foreground">
                  {t('confidence', { percent: Math.round(suggestion.confidence * 100) })}
                </span>
              )}
            </p>
            {suggestion.reasoning && <p className="leading-snug">{suggestion.reasoning}</p>}
            {suggestion.alternatives.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">{t('alternatives')}</p>
                <ul className="mt-1 space-y-1 text-xs">
                  {suggestion.alternatives.map((alternative) => (
                    <li key={alternative.allograph}>
                      <span className="font-medium">{alternative.label}:</span> {alternative.why}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {suggestion.allograph != null && (
              <p className="text-xs text-muted-foreground">{t('suggestCheck')}</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
