'use client';

/**
 * Ask Archetype (AI programme W3.1): a question box over the corpus.
 *
 * One question at a time, answered within the request (the backend stops
 * itself before the proxy's minute is up). Answers stay on the page,
 * newest first, until the visitor leaves; nothing is stored in the browser,
 * because a question typed here is the visitor's own and the page has no
 * reason to keep it.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Loader2, MessageCircleQuestion, Sparkles } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AgentAnswer } from '@/components/ask/agent-answer';
import { AgentLimits } from '@/components/ask/agent-limits';
import { AGENT_TOOLS_KEY, MAX_QUESTION, askFailure } from '@/lib/ask';
import { cn } from '@/lib/utils';
import { AskError, askArchetype, getAgentTools } from '@/services/agent';
import type { AgentRun } from '@/types/agent';

export function AskArchetype() {
  const t = useTranslations('ask');
  const [question, setQuestion] = useState('');
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const latestHeading = useRef<HTMLHeadingElement>(null);

  const tools = useQuery({
    queryKey: AGENT_TOOLS_KEY,
    queryFn: getAgentTools,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const ask = useMutation({
    mutationFn: askArchetype,
    onSuccess: (run) => {
      setRuns((previous) => [run, ...previous]);
      setQuestion('');
    },
  });

  // Move to the new answer, so a screen reader hears it and a sighted reader
  // does not have to look for it below the form.
  const latestId = runs[0]?.id;
  useEffect(() => {
    if (latestId !== undefined) latestHeading.current?.focus();
  }, [latestId]);

  // Off only when the backend says so. A failed lookup leaves the box open:
  // the question itself will say whether the service is there.
  const switchedOff = tools.data?.enabled === false;
  const trimmed = question.trim();
  const canAsk = trimmed.length > 0 && !ask.isPending && !switchedOff;

  const submit = (event?: { preventDefault: () => void }) => {
    event?.preventDefault();
    if (canAsk) ask.mutate(trimmed);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const failure = ask.isError ? askFailure(ask.error) : null;
  const detail = ask.error instanceof AskError ? ask.error.detail : '';

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <header className="flex items-start gap-3">
        <MessageCircleQuestion className="mt-1 h-7 w-7 shrink-0 text-primary" aria-hidden />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('intro')}</p>
        </div>
      </header>

      <p className="mt-6 flex gap-2 rounded-md border bg-muted/40 px-4 py-3 text-sm">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        {t('aiNotice')}
      </p>

      {switchedOff ? (
        <div className="mt-6 rounded-lg border px-5 py-4">
          <h2 className="font-semibold">{t('offTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('off')}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-2">
          <Label htmlFor="ask-question">{t('questionLabel')}</Label>
          <textarea
            id="ask-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={onKeyDown}
            maxLength={MAX_QUESTION}
            rows={3}
            placeholder={t('placeholder')}
            aria-describedby="ask-question-hint"
            disabled={ask.isPending}
            className="flex w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p id="ask-question-hint" className="text-xs text-muted-foreground">
              {t('submitHint')}
              {' · '}
              <span className={cn(MAX_QUESTION - question.length < 100 && 'text-foreground')}>
                {t('charsLeft', { count: MAX_QUESTION - question.length })}
              </span>
            </p>
            <Button type="submit" disabled={!canAsk}>
              {ask.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              {t('submit')}
            </Button>
          </div>
        </form>
      )}

      <div role="status" aria-live="polite" className="mt-4">
        {ask.isPending && (
          <div className="flex gap-3 rounded-md border px-4 py-3 text-sm">
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
            <div>
              <p className="font-medium">{t('asking')}</p>
              <p className="text-muted-foreground">{t('askingHint')}</p>
            </div>
          </div>
        )}
      </div>

      {failure && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>{t(`failure.${failure}`)}</AlertTitle>
          {detail && <AlertDescription>{detail}</AlertDescription>}
        </Alert>
      )}

      {runs.length > 0 && (
        <div className="mt-8 space-y-10">
          <AgentAnswer ref={latestHeading} run={runs[0]} />
          {runs.length > 1 && (
            <section aria-labelledby="ask-earlier" className="space-y-8 border-t pt-6">
              <h2 id="ask-earlier" className="text-sm font-semibold text-muted-foreground">
                {t('earlier')}
              </h2>
              {runs.slice(1).map((run) => (
                <AgentAnswer key={run.id} run={run} />
              ))}
            </section>
          )}
        </div>
      )}

      <div className="mt-10">
        {tools.data && <AgentLimits tools={tools.data.tools} />}
        {tools.isError && <p className="text-sm text-muted-foreground">{t('toolsError')}</p>}
      </div>
    </div>
  );
}
