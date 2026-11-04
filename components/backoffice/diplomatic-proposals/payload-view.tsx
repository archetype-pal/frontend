'use client';

/**
 * A diplomatic proposal's answer, laid out for checking against its charter.
 *
 * Every string the model says it read in the charter carries a mark saying
 * whether the text contains it. One it cannot find is the model inventing a
 * reading, which is the thing a reviewer most needs to catch.
 */

import { useTranslations } from 'next-intl';
import { AlertTriangle, ArrowRight, Check } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { findQuote, quotedFragments } from '@/lib/backoffice/quote-finder';
import { cn } from '@/lib/utils';
import type { DiplomaticPayload, ProposedEntity } from '@/types/backoffice';

// The backend's vocabularies (`apps/diplomatic/models.py`). A value outside
// them is shown as it came, so a newer backend never renders a blank.
const ROLES = ['granter', 'beneficiary', 'transaction', 'place', 'date', 'witness'] as const;
const KINDS = [
  'sanctio',
  'corroboratio',
  'dispositive',
  'salutation',
  'notification',
  'other',
] as const;
const PREDICATES = [
  'granted_by',
  'witnessed_by',
  'written_by',
  'beneficiary_of',
  'located_at',
] as const;
const VERDICTS = ['inconsistent', 'uncertain', 'consistent'] as const;

function known<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

/**
 * Whether `quote` occurs in the charter. Renders nothing until the text is
 * known. `compact` reduces a found mark to its icon, for lines that carry
 * several; a missing quotation is always spelled out.
 */
export function QuoteCheck({
  text,
  quote,
  compact = false,
}: {
  text: string | null;
  quote: string;
  compact?: boolean;
}) {
  const t = useTranslations('backoffice.diplomaticProposals');
  if (text == null || !quote.trim()) return null;
  const found = findQuote(text, quote).length > 0;
  return found ? (
    <span
      title={compact ? t('inText') : undefined}
      className="inline-flex shrink-0 items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400"
    >
      <Check className="h-3 w-3" aria-hidden />
      <span className={cn(compact && 'sr-only')}>{t('inText')}</span>
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
      <AlertTriangle className="h-3 w-3" aria-hidden />
      {t('notInText')}
    </span>
  );
}

function Quoted({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('font-serif italic', className)}>{children}</span>;
}

function EntitiesView({ entities, text }: { entities: ProposedEntity[]; text: string | null }) {
  const t = useTranslations('backoffice.diplomaticProposals');
  const rank = (role: string) => (known(ROLES, role) ? ROLES.indexOf(role) : ROLES.length);
  const sorted = [...entities].sort((a, b) => rank(a.role) - rank(b.role));
  return (
    <ul className="divide-y rounded-md border">
      {sorted.map((entity, i) => (
        <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2">
          <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
            {known(ROLES, entity.role) ? t(`role.${entity.role}`) : entity.role}
          </span>
          <span className="min-w-0 flex-1">
            {entity.role === 'transaction' ? (
              <span className="text-sm">{entity.name}</span>
            ) : (
              <Quoted className="text-sm">{entity.name}</Quoted>
            )}
            {entity.normalised && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowRight className="h-3 w-3" aria-hidden />
                <span className="sr-only">{t('normalisedAs')}</span>
                {entity.normalised}
              </span>
            )}
            {entity.note && (
              <span className="block text-xs text-muted-foreground">{entity.note}</span>
            )}
          </span>
          {entity.role !== 'transaction' && <QuoteCheck text={text} quote={entity.name} />}
        </li>
      ))}
    </ul>
  );
}

export function PayloadView({
  pipeline,
  payload,
  text,
  catalogueDate,
}: {
  pipeline: string;
  payload: DiplomaticPayload;
  /** The charter text, once loaded; null while it loads or when it is gone. */
  text: string | null;
  catalogueDate: string;
}) {
  const t = useTranslations('backoffice.diplomaticProposals');

  switch (pipeline) {
    case 'W2.1':
      return <EntitiesView entities={payload.entities ?? []} text={text} />;

    case 'W2.2':
      return (
        <ul className="space-y-2">
          {(payload.formulae ?? []).map((formula, i) => (
            <li key={i} className="space-y-1 rounded-md border px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {known(KINDS, formula.kind) ? t(`kind.${formula.kind}`) : formula.kind}
                </Badge>
                <span className="text-sm font-medium">{formula.label}</span>
              </div>
              {formula.excerpt && (
                <div className="flex items-baseline gap-3">
                  <Quoted className="flex-1 text-sm">“{formula.excerpt}”</Quoted>
                  <QuoteCheck text={text} quote={formula.excerpt} />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {formula.published_type
                  ? t('publishedType', { type: formula.published_type })
                  : t('unpublishedType')}
              </p>
            </li>
          ))}
        </ul>
      );

    case 'W2.4':
      return (
        <div className="space-y-3">
          <p className="whitespace-pre-wrap rounded-md border bg-muted/30 px-3 py-2 text-sm leading-relaxed">
            {payload.translation}
          </p>
          {payload.notes && (
            <div>
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('translationNotes')}
              </h4>
              <p className="whitespace-pre-wrap text-sm">{payload.notes}</p>
            </div>
          )}
        </div>
      );

    case 'W3.2': {
      const fragments = quotedFragments(payload.evidence ?? '');
      const verdict = payload.verdict ?? '';
      return (
        <dl className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={verdict === 'inconsistent' ? 'destructive' : 'secondary'}>
              {verdict && known(VERDICTS, verdict) ? t(`verdict.${verdict}`) : verdict}
            </Badge>
            <span className="text-muted-foreground">
              {catalogueDate ? t('catalogueDate', { date: catalogueDate }) : t('catalogueUndated')}
            </span>
          </div>
          {payload.evidence && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('evidence')}
              </dt>
              <dd className="mt-0.5 space-y-1">
                <p>{payload.evidence}</p>
                {fragments.map((fragment) => (
                  <div key={fragment} className="flex items-baseline gap-3 text-xs">
                    <Quoted className="flex-1">“{fragment}”</Quoted>
                    <QuoteCheck text={text} quote={fragment} />
                  </div>
                ))}
              </dd>
            </div>
          )}
          {payload.reasoning && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('reasoning')}
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap">{payload.reasoning}</dd>
            </div>
          )}
          {payload.suggested_range && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('suggestedRange')}
              </dt>
              <dd className="mt-0.5">{payload.suggested_range}</dd>
            </div>
          )}
        </dl>
      );
    }

    case 'W3.3':
      return (
        <ul className="divide-y rounded-md border">
          {(payload.triples ?? []).map((triple, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-3 py-2 text-sm">
              <Quoted>{triple.subject}</Quoted>
              <QuoteCheck text={text} quote={triple.subject} compact />
              <Badge variant="outline" className="font-normal">
                {known(PREDICATES, triple.predicate)
                  ? t(`predicate.${triple.predicate}`)
                  : triple.predicate}
              </Badge>
              <Quoted>{triple.object}</Quoted>
              <QuoteCheck text={text} quote={triple.object} compact />
            </li>
          ))}
        </ul>
      );

    default:
      return (
        <pre className="overflow-x-auto rounded-md border bg-muted/30 p-3 text-xs">
          {JSON.stringify(payload, null, 2)}
        </pre>
      );
  }
}
