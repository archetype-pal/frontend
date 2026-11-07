'use client';

/**
 * One question and what Ask Archetype made of it.
 *
 * The answer is model output, so it is shown as text, never as markup. Its
 * sources are listed under it, each with the claim it supports and links to
 * the folio and the text. Every one of them was resolved against the database
 * before the answer was written. An answer with no sources says so, because
 * then nothing in it was checked.
 */

import { forwardRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, FileText, ImageIcon, MapPin } from 'lucide-react';

import {
  answerParagraphs,
  citationTextHref,
  citationViewerHref,
  hasUnverifiedRegion,
} from '@/lib/ask';
import type { AgentCitation, AgentRun } from '@/types/agent';

function Notice({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex gap-3 rounded-md border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        <p className="font-medium">{title}</p>
        {hint && <p className="mt-1">{hint}</p>}
      </div>
    </div>
  );
}

function Source({ citation }: { citation: AgentCitation }) {
  const t = useTranslations('ask.source');
  const record = citation.shelfmark
    ? [citation.shelfmark, citation.locus].filter(Boolean).join(', ')
    : t('noShelfmark');
  const marked = citation.verified_region && citation.graph_id;

  return (
    <li className="rounded-md border bg-card px-4 py-3">
      <p className="text-sm">{citation.claim}</p>
      <p className="mt-2 text-sm font-medium">
        {record}
        {(citation.repository || citation.date) && (
          <span className="font-normal text-muted-foreground">
            {' · '}
            {[citation.repository, citation.date].filter(Boolean).join(' · ')}
          </span>
        )}
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <Link
          href={citationTextHref(citation)}
          className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
        >
          <FileText className="h-3.5 w-3.5" aria-hidden />
          {t('readText', { type: citation.type })}
        </Link>
        <Link
          href={citationViewerHref(citation)}
          className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
        >
          {marked ? (
            <MapPin className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <ImageIcon className="h-3.5 w-3.5" aria-hidden />
          )}
          {marked ? t('openMark') : t('openFolio')}
        </Link>
      </div>
      {hasUnverifiedRegion(citation) && (
        <p className="mt-2 text-xs text-muted-foreground">{t('unverifiedRegion')}</p>
      )}
    </li>
  );
}

export const AgentAnswer = forwardRef<HTMLHeadingElement, { run: AgentRun }>(function AgentAnswer(
  { run },
  headingRef
) {
  const t = useTranslations('ask');
  const paragraphs = run.status === 'answered' ? answerParagraphs(run.answer) : [];
  const headingId = `ask-run-${run.id}`;

  return (
    <article aria-labelledby={headingId} className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('youAsked')}
        </p>
        <h2
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className="mt-1 whitespace-pre-line text-lg font-semibold outline-none"
        >
          {run.question}
        </h2>
      </div>

      {run.status === 'answered' && (
        <div className="space-y-3">
          <h3 className="sr-only">{t('answerTitle')}</h3>
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="whitespace-pre-line leading-relaxed">
              {paragraph}
            </p>
          ))}
          {run.citations.length === 0 && <Notice title={t('noCitations')} />}
        </div>
      )}
      {run.status === 'exhausted' && <Notice title={t('exhausted')} hint={t('exhaustedHint')} />}
      {run.status === 'refused' && <Notice title={t('refused')} hint={t('refusedHint')} />}
      {run.status === 'failed' && <Notice title={t('failed')} hint={t('failedHint')} />}

      {run.citations.length > 0 && (
        <section aria-labelledby={`${headingId}-sources`}>
          <h3 id={`${headingId}-sources`} className="text-sm font-semibold">
            {t('sourcesTitle', { count: run.citations.length })}
          </h3>
          <ol className="mt-2 space-y-2">
            {run.citations.map((citation, index) => (
              <Source key={index} citation={citation} />
            ))}
          </ol>
        </section>
      )}
    </article>
  );
});
