'use client';

/**
 * "Label every long-s on this folio" (AI programme W3.4), in the viewer
 * header for managers.
 *
 * The request is read on the server against the letters already marked on the
 * page, which are also what it searches by. What it finds goes to the review
 * queue as proposals, never straight onto the page, so the reply links there.
 * When the request could mean more than one letter, or none marked here, the
 * reply offers the page's letters to pick from.
 */

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Loader2, WandSparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatAllographLabel } from '@/lib/allograph-labels';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { BackofficeApiError } from '@/services/backoffice/api-client';
import { refusalCode, useRefusalWords } from '@/lib/refusal';
import {
  findOnPage,
  type FindOnPageReply,
  type PageLetter,
  type PageLetterOption,
} from '@/services/backoffice/annotation-proposals';

type Reply = FindOnPageReply | { status: 'failed'; detail: string };

function letterLabel(letter: PageLetter): string {
  return formatAllographLabel({ name: letter.name, character_name: letter.character });
}

export function FindOnPageControl({ imageId }: { imageId: number | string }) {
  const t = useTranslations('manuscript.findOnPage');
  const refusalWords = useRefusalWords();
  const [request, setRequest] = React.useState('');
  const [reply, setReply] = React.useState<Reply | null>(null);
  const [pending, setPending] = React.useState(false);

  const send = async (body: Parameters<typeof findOnPage>[1]) => {
    setPending(true);
    try {
      setReply(await findOnPage(imageId, body));
    } catch (error) {
      const code = error instanceof BackofficeApiError ? refusalCode(error.body) : '';
      setReply({ status: 'failed', detail: refusalWords(code, formatApiError(error)) });
    } finally {
      setPending(false);
    }
  };

  const onSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = request.trim();
    if (text && !pending) void send({ request: text });
  };

  const options = (choices: PageLetterOption[]) => (
    <ul className="flex flex-wrap gap-1.5">
      {choices.map(({ allograph, examples }) => (
        <li key={allograph.id}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={pending}
            onClick={() => void send({ allograph: allograph.id })}
          >
            {t('option', { letter: letterLabel(allograph), examples })}
          </Button>
        </li>
      ))}
    </ul>
  );

  const answer = (() => {
    if (!reply) return null;
    switch (reply.status) {
      case 'proposed':
        return reply.proposed === 0 ? (
          <p>{t('noneFound', { letter: letterLabel(reply.allograph) })}</p>
        ) : (
          <>
            <p>
              {t('proposed', {
                count: reply.proposed,
                letter: letterLabel(reply.allograph),
                examples: reply.examples,
              })}
            </p>
            <Link
              href={`/backoffice/annotation-proposals?ml_job=${reply.job}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('review')}
            </Link>
          </>
        );
      case 'ask':
        return (
          <>
            <p>{t('ask')}</p>
            {options(reply.options)}
          </>
        );
      case 'cannot':
        if (reply.reason === 'unknown_letter') {
          return reply.options.length === 0 ? (
            <p>{t('nothingMarked')}</p>
          ) : (
            <>
              <p>{t('unknownLetter')}</p>
              {options(reply.options)}
            </>
          );
        }
        if (reply.reason === 'too_few_examples') {
          return (
            <p>
              {t('tooFewExamples', {
                letter: letterLabel(reply.allograph),
                examples: reply.examples,
                minimum: reply.minimum,
              })}
            </p>
          );
        }
        return <p>{t('pageTooLarge', { letter: letterLabel(reply.allograph) })}</p>;
      case 'failed':
        return <p className="text-destructive">{t('failed', { detail: reply.detail })}</p>;
    }
  })();

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label={t('open')}>
              <WandSparkles className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('open')}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" side="bottom" className="w-80 space-y-3">
        <div>
          <div className="text-sm font-semibold leading-none">{t('title')}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t('intro')}</div>
        </div>
        <form className="flex gap-2" onSubmit={onSubmit}>
          <Input
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            placeholder={t('placeholder')}
            aria-label={t('requestLabel')}
            maxLength={500}
            className="h-8 text-sm"
          />
          <Button type="submit" size="sm" className="h-8" disabled={pending || !request.trim()}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            {t('send')}
          </Button>
        </form>
        <div aria-live="polite" className="space-y-2 text-sm empty:hidden">
          {answer}
        </div>
      </PopoverContent>
    </Popover>
  );
}
