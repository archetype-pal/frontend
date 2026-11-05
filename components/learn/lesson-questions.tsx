'use client';

/**
 * Questions about the lesson, and the tutor's answers. Only the student who
 * started it may ask, once it is written and one question at a time; anyone
 * with the link reads the conversation. An answer can point at the picture
 * and show glyphs from other charters, as a step does.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Eye, Loader2, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { GlyphExamples } from '@/components/learn/glyph-examples';
import { LearnRefusal } from '@/components/learn/learn-refusal';
import { Paragraphs } from '@/components/learn/lesson-walkthrough';
import { useNow } from '@/hooks/use-now';
import { MAX_QUESTION, citedGlyphs, formatElapsed, lessonKey } from '@/lib/learn';
import { cn } from '@/lib/utils';
import { askTutor } from '@/services/learn';
import type { LearnMessage, TutorSession } from '@/types/learn';

function TutorMessage({
  message,
  selected,
  activeBox,
  onSelect,
  onSelectBox,
  itemRef,
}: {
  message: LearnMessage;
  selected: boolean;
  activeBox: number | null;
  onSelect: () => void;
  onSelectBox: (index: number | null) => void;
  itemRef?: React.Ref<HTMLLIElement>;
}) {
  const t = useTranslations('learn.questions');
  const boxes = message.boxes ?? [];
  const examples = citedGlyphs(message.example_glyph_ids, message.glyphs);

  return (
    <li
      ref={itemRef}
      tabIndex={-1}
      data-role="tutor"
      className={cn(
        'mr-auto w-full space-y-3 rounded-lg rounded-tl-sm border bg-card px-4 py-3 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected && 'border-amber-400/70 ring-1 ring-amber-400/30',
        message.failed && 'border-destructive/40 bg-destructive/5'
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('tutor')}
      </p>
      {message.failed ? (
        <div className="flex gap-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">{t('failedTitle')}</p>
            {message.text && <p className="mt-1">{message.text}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-[0.95rem]">
          <Paragraphs text={message.text} />
        </div>
      )}
      {boxes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="aria-pressed:border-amber-400 aria-pressed:bg-amber-50 aria-pressed:text-amber-950 dark:aria-pressed:bg-amber-400/20 dark:aria-pressed:text-amber-100"
            onClick={onSelect}
            aria-pressed={selected}
          >
            <MapPin className="mr-1.5 h-4 w-4" aria-hidden />
            {t('show', { count: boxes.length })}
          </Button>
          {selected &&
            boxes.length > 1 &&
            boxes.map((box, index) => {
              const chosen = activeBox === index;
              return (
                <button
                  key={index}
                  type="button"
                  aria-pressed={chosen}
                  onClick={() => onSelectBox(chosen ? null : index)}
                  className={cn(
                    'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    chosen
                      ? 'border-amber-400 bg-amber-100 text-amber-950 dark:bg-amber-400/20 dark:text-amber-100'
                      : 'hover:border-amber-400/70 hover:bg-amber-50 dark:hover:bg-amber-400/10'
                  )}
                >
                  <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="font-semibold">{String.fromCharCode(97 + index)}</span>
                  {box.label && <span className="truncate">{box.label}</span>}
                </button>
              );
            })}
        </div>
      )}
      <GlyphExamples glyphs={examples} title={t('examples')} />
    </li>
  );
}

function Thinking({ since, progress }: { since: string | undefined; progress: string | null }) {
  const t = useTranslations('learn.questions');
  const now = useNow();
  const started = since ? Date.parse(since) : NaN;
  return (
    <li className="flex gap-3 rounded-lg border border-dashed px-4 py-3 text-sm">
      <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
      <div>
        <p className="font-medium">{t('thinking')}</p>
        <p className="text-muted-foreground">
          {progress ? `${progress} · ` : ''}
          {Number.isFinite(started) && now > 0
            ? t('elapsed', { time: formatElapsed(now - started) })
            : t('thinkingHint')}
        </p>
      </div>
    </li>
  );
}

export function LessonQuestions({
  session,
  signedIn,
  selectedMessage,
  activeBox,
  onSelectMessage,
  onSelectBox,
}: {
  session: TutorSession;
  signedIn: boolean;
  selectedMessage: number | null;
  activeBox: number | null;
  onSelectMessage: (index: number | null) => void;
  onSelectBox: (index: number | null) => void;
}) {
  const t = useTranslations('learn.questions');
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState('');
  const awaiting = useRef(false);
  const latest = useRef<HTMLLIElement>(null);

  const ask = useMutation({
    mutationFn: (text: string) => askTutor(session.id, text, signedIn),
    onSuccess: (updated) => {
      // The session comes back working on the answer; the lesson's poll takes it from here.
      queryClient.setQueryData(lessonKey(session.id, signedIn), updated);
      setQuestion('');
      awaiting.current = true;
    },
  });

  const messages = session.messages;
  const last = messages.at(-1);
  // Move to the answer when it arrives, so a screen reader hears it.
  useEffect(() => {
    if (awaiting.current && last?.role === 'tutor') {
      awaiting.current = false;
      latest.current?.focus();
    }
  }, [last]);

  const answering = session.status === 'queued' || session.status === 'working';
  const pendingQuestion = answering && last?.role === 'student' ? last : undefined;
  const sinceQuestion = pendingQuestion
    ? (session.progress.filter((line) => line.at >= pendingQuestion.at).at(-1)?.text ?? null)
    : null;

  const trimmed = question.trim();
  const canSubmit =
    session.can_ask && session.status === 'ready' && trimmed.length > 0 && !ask.isPending;
  const submit = (event?: { preventDefault: () => void }) => {
    event?.preventDefault();
    if (canSubmit) ask.mutate(trimmed);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <section aria-labelledby="lesson-questions" className="space-y-4">
      <div>
        <h2 id="lesson-questions" className="text-lg font-semibold">
          {t('title')}
        </h2>
        {session.can_ask && messages.length === 0 && (
          <p className="mt-1 text-sm text-muted-foreground">{t('intro')}</p>
        )}
      </div>

      {(messages.length > 0 || pendingQuestion) && (
        <ol className="space-y-3" aria-label={t('conversation')}>
          {messages.map((message, index) =>
            message.role === 'student' ? (
              <li
                key={index}
                data-role="student"
                className="ml-auto w-fit max-w-[85%] rounded-lg rounded-tr-sm bg-primary px-4 py-2.5 text-primary-foreground shadow-sm"
              >
                <p className="sr-only">{t('you')}</p>
                <p className="whitespace-pre-line text-[0.95rem]">{message.text}</p>
              </li>
            ) : (
              <TutorMessage
                key={index}
                message={message}
                selected={selectedMessage === index}
                activeBox={selectedMessage === index ? activeBox : null}
                onSelect={() => onSelectMessage(selectedMessage === index ? null : index)}
                onSelectBox={onSelectBox}
                itemRef={index === messages.length - 1 ? latest : undefined}
              />
            )
          )}
          {pendingQuestion && <Thinking since={pendingQuestion.at} progress={sinceQuestion} />}
        </ol>
      )}

      <div role="status" aria-live="polite" className="sr-only">
        {pendingQuestion ? t('thinking') : ''}
      </div>

      {ask.isError && <LearnRefusal error={ask.error} />}

      {session.can_ask ? (
        <form onSubmit={submit} className="space-y-2">
          <Label htmlFor="lesson-question">{t('label')}</Label>
          <textarea
            id="lesson-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={onKeyDown}
            maxLength={MAX_QUESTION}
            rows={3}
            placeholder={t('placeholder')}
            aria-describedby="lesson-question-hint"
            disabled={ask.isPending || answering}
            className="flex w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p id="lesson-question-hint" className="text-xs text-muted-foreground">
              {t('submitHint')}
              {' · '}
              <span className="font-medium text-foreground">
                {t('left', { count: session.questions_left })}
              </span>
              {MAX_QUESTION - question.length < 200 && (
                <>
                  {' · '}
                  {t('charsLeft', { count: MAX_QUESTION - question.length })}
                </>
              )}
            </p>
            <Button type="submit" disabled={!canSubmit}>
              {ask.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              {t('submit')}
            </Button>
          </div>
        </form>
      ) : (
        <p className="rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {session.questions_left === 0 ? t('usedUp') : t('onlyStarter')}
        </p>
      )}
    </section>
  );
}
