'use client';

/**
 * Why this annotation is this allograph (AI programme W3.6), as a tab of its
 * popup. The model cannot know why the annotator chose it, so what it gives is
 * the evidence, by kind, and whether it would read the shape differently.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useRefusalWords } from '@/lib/refusal';
import { GlyphAssistError, explainAnnotation, getStoredExplanation } from '@/services/glyph-assist';
import type { ExplanationBasis } from '@/types/glyph-assist';

const BASES: ExplanationBasis[] = ['form', 'context', 'comparison', 'record', 'practice'];

export function AnnotationExplanation({
  graphId,
  hasLocalChanges,
}: {
  graphId: number;
  hasLocalChanges: boolean;
}) {
  const t = useTranslations('annotation.popup.assist');
  const locale = useLocale();
  const refusalWords = useRefusalWords();
  const queryClient = useQueryClient();
  const queryKey = ['graph-explanation', graphId, locale];
  // Lives in the cache rather than here, so it outlasts this tab being switched away from.
  const stored = useQuery({
    queryKey,
    queryFn: () => getStoredExplanation(graphId, locale),
    retry: false,
  });
  const explain = useMutation({
    mutationFn: () => explainAnnotation(graphId, locale),
    onSuccess: (answer) => queryClient.setQueryData(queryKey, answer),
  });
  const answer = stored.data;
  const detail =
    explain.error instanceof GlyphAssistError
      ? refusalWords(explain.error.code, explain.error.detail)
      : '';

  return (
    <div className="space-y-3 text-sm">
      {!answer && <p className="text-muted-foreground">{t('explainHint')}</p>}
      {hasLocalChanges && <p className="text-xs text-muted-foreground">{t('explainSavedOnly')}</p>}
      {!answer && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          disabled={explain.isPending}
          onClick={() => explain.mutate()}
        >
          {explain.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          )}
          {explain.isPending ? t('explaining') : t('explain')}
        </Button>
      )}
      <div aria-live="polite" className="space-y-3 empty:hidden">
        {explain.isError && <p className="text-xs text-destructive">{detail || t('failed')}</p>}
        {answer && (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t(`verdict.${answer.verdict}`)}
            </p>
            {answer.alternative && (
              <p className="flex gap-1.5 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {t('disagrees', { label: answer.alternative.label })}
              </p>
            )}
            <p className="leading-snug">{answer.summary}</p>
            {BASES.map((basis) => {
              const reasons = answer.reasons.filter((reason) => reason.basis === basis);
              if (reasons.length === 0) return null;
              return (
                <section key={basis}>
                  <h4 className="text-xs font-medium text-foreground">{t(`basis.${basis}`)}</h4>
                  {basis === 'practice' && (
                    <p className="text-xs text-muted-foreground">{t('practiceNote')}</p>
                  )}
                  {reasons.map((reason) => (
                    <p key={reason.text} className="mt-1 leading-snug text-muted-foreground">
                      {reason.text}
                    </p>
                  ))}
                </section>
              );
            })}
            {answer.doubts.length > 0 && (
              <section>
                <h4 className="text-xs font-medium text-foreground">{t('doubts')}</h4>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
                  {answer.doubts.map((doubt) => (
                    <li key={doubt}>{doubt}</li>
                  ))}
                </ul>
              </section>
            )}
            <p className="flex gap-1.5 border-t pt-2 text-xs text-muted-foreground">
              <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden />
              {t('aiNotice', { model: answer.model_name })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
