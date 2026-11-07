'use client';

/**
 * The formulary explorer (AI programme W2.2): the recurring formulae of the
 * charters, each with the charters that use it.
 *
 * Everything listed was proposed by a model and approved by a scholar, and
 * comes from a text the reader may see. The backend decides both. A formula
 * that matches nothing in the published typology is marked, since that is
 * the case worth a scholar's attention.
 */

import { useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { BookOpenText, FileText, ImageIcon, Search, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataPagination } from '@/components/ui/data-pagination';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { useDebouncedSearch } from '@/hooks/backoffice/use-debounced-search';
import { charterFolioHref, charterName, charterTextHref } from '@/lib/charter-route';
import { getFormulae } from '@/services/diplomatic';
import { FORMULA_KINDS, type Formula, type FormulaOccurrence } from '@/types/diplomatic';

const PAGE_SIZE = 20;
/** Occurrences shown before "Show all". A common formula is in hundreds of charters. */
const PREVIEW = 5;
const ALL = '__all__';

function isKnownKind(kind: string): kind is (typeof FORMULA_KINDS)[number] {
  return (FORMULA_KINDS as readonly string[]).includes(kind);
}

function Occurrence({ occurrence }: { occurrence: FormulaOccurrence }) {
  const t = useTranslations('formulary');
  const { charter } = occurrence;
  return (
    <li className="border-t py-3 first:border-t-0">
      {occurrence.excerpt && (
        <p lang="la" className="italic">
          {occurrence.excerpt}
        </p>
      )}
      <p className="mt-1 text-sm">
        <span className="font-medium">{charterName(charter) || t('noShelfmark')}</span>
        {(charter.repository || charter.date) && (
          <span className="text-muted-foreground">
            {' · '}
            {[charter.repository, charter.date].filter(Boolean).join(' · ')}
          </span>
        )}
      </p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <Link
          href={charterTextHref(charter)}
          className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
        >
          <FileText className="h-3.5 w-3.5" aria-hidden />
          {t('readText', { type: charter.type })}
        </Link>
        <Link
          href={charterFolioHref(charter)}
          className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
        >
          <ImageIcon className="h-3.5 w-3.5" aria-hidden />
          {t('openFolio')}
        </Link>
      </div>
    </li>
  );
}

function FormulaCard({ formula }: { formula: Formula }) {
  const t = useTranslations('formulary');
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? formula.occurrences : formula.occurrences.slice(0, PREVIEW);
  const headingId = `formula-${formula.id}`;
  const listId = `${headingId}-charters`;

  return (
    <article aria-labelledby={headingId} className="rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {isKnownKind(formula.kind) ? t(`kind.${formula.kind}`) : formula.kind}
        </Badge>
        {formula.published_type ? (
          <span className="text-xs text-muted-foreground">
            {t('publishedType', { type: formula.published_type })}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{t('unpublishedType')}</span>
        )}
      </div>
      <h2 id={headingId} className="mt-2 text-lg font-semibold">
        {formula.label}
      </h2>
      <figure className="mt-2">
        <figcaption className="sr-only">{t('exemplarLabel')}</figcaption>
        <blockquote lang="la" className="border-l-2 border-primary/40 pl-3 italic">
          {formula.exemplar}
        </blockquote>
      </figure>

      <h3 className="mt-4 text-sm font-medium text-muted-foreground">
        {t('foundIn', { count: formula.occurrence_count })}
      </h3>
      <ul id={listId} className="mt-1">
        {shown.map((occurrence) => (
          <Occurrence key={occurrence.id} occurrence={occurrence} />
        ))}
      </ul>
      {formula.occurrences.length > PREVIEW && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 h-7 px-2 text-xs"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? t('showFewer') : t('showAll', { count: formula.occurrences.length })}
        </Button>
      )}
    </article>
  );
}

export function FormularyExplorer() {
  const t = useTranslations('formulary');
  const [kind, setKind] = useState<string>(ALL);
  const { searchInput, setSearchInput, search, page, setPage } = useDebouncedSearch();

  const query = {
    kind: kind === ALL ? undefined : kind,
    search: search.trim() || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
  const { data, isLoading, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: ['formulary', query],
    queryFn: () => getFormulae(query),
    placeholderData: keepPreviousData,
  });
  const filtered = kind !== ALL || Boolean(query.search);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <header className="flex items-start gap-3">
        <BookOpenText className="mt-1 h-7 w-7 shrink-0 text-primary" aria-hidden />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('intro')}</p>
        </div>
      </header>

      <p className="mt-6 flex gap-2 rounded-md border bg-muted/40 px-4 py-3 text-sm">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        {t('provenance')}
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented<string>
          ariaLabel={t('kindLabel')}
          value={kind}
          options={[
            { value: ALL, label: t('all') },
            ...FORMULA_KINDS.map((value) => ({ value, label: t(`kind.${value}`) })),
          ]}
          onChange={(next) => {
            setKind(next);
            setPage(0);
          }}
        />
        <div className="relative sm:w-64">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            aria-label={t('searchLabel')}
            placeholder={t('searchPlaceholder')}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="mt-6" aria-busy={isLoading || isPlaceholderData}>
        {isError ? (
          <div className="rounded-lg border px-5 py-4" role="alert">
            <p>{t('loadError')}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              {t('retry')}
            </Button>
          </div>
        ) : data && data.count === 0 ? (
          <div className="rounded-lg border px-5 py-6 text-center">
            <p className="font-medium">{filtered ? t('noMatch') : t('empty')}</p>
            {!filtered && <p className="mt-1 text-sm text-muted-foreground">{t('emptyHint')}</p>}
          </div>
        ) : data ? (
          <>
            <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
              {t('count', { count: data.count })}
            </p>
            <div className={isPlaceholderData ? 'space-y-4 opacity-60' : 'space-y-4'}>
              {data.results.map((formula) => (
                <FormulaCard key={formula.id} formula={formula} />
              ))}
            </div>
            {data.count > PAGE_SIZE && (
              <DataPagination
                className="mt-6"
                totalItems={data.count}
                page={page + 1}
                pageSize={PAGE_SIZE}
                onPageChange={(next) => setPage(next - 1)}
              />
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
