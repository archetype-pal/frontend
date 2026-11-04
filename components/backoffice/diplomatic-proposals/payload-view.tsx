'use client';

/**
 * A diplomatic proposal's answer, laid out for checking against its charter.
 *
 * Every string the model says it read in the charter carries a mark saying
 * whether the text contains it. One it cannot find is the model inventing a
 * reading, which is the thing a reviewer most needs to catch.
 *
 * A list answer (entities, formulae, relations) gives each item a checkbox
 * while the proposal is pending, so the reviewer can leave out the ones the
 * charter does not support. Once accepted, the items left out are marked.
 */

import { useTranslations } from 'next-intl';
import { AlertTriangle, ArrowRight, Check } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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

/** The reviewer's choice of items, while a list answer is pending. */
export type ItemChoice = {
  /** Positions in the payload's list that are ticked. */
  chosen: ReadonlySet<number>;
  onToggle: (index: number) => void;
};

/** How an item reads to the reviewer and to assistive technology. */
type ItemMarks = {
  choice?: ItemChoice;
  /** Positions the reviewer left out when the proposal was accepted. */
  dropped?: readonly number[];
};

function isOut(index: number, { choice, dropped }: ItemMarks): boolean {
  return choice ? !choice.chosen.has(index) : (dropped ?? []).includes(index);
}

/** The checkbox in front of a pending item. */
function ItemMark({ index, label, marks }: { index: number; label: string; marks: ItemMarks }) {
  const t = useTranslations('backoffice.diplomaticProposals');
  if (!marks.choice) return null;
  const { chosen, onToggle } = marks.choice;
  return (
    <Checkbox
      checked={chosen.has(index)}
      onCheckedChange={() => onToggle(index)}
      aria-label={t('keepItem', { item: label })}
      className="self-center"
    />
  );
}

/** The mark after an item the reviewer left out, once the proposal is accepted. */
function LeftOut({ index, marks }: { index: number; marks: ItemMarks }) {
  const t = useTranslations('backoffice.diplomaticProposals');
  if (marks.choice || !isOut(index, marks)) return null;
  return (
    <Badge variant="outline" className="font-normal">
      {t('leftOutBadge')}
    </Badge>
  );
}

function EntitiesView({
  entities,
  text,
  marks,
}: {
  entities: ProposedEntity[];
  text: string | null;
  marks: ItemMarks;
}) {
  const t = useTranslations('backoffice.diplomaticProposals');
  const rank = (role: string) => (known(ROLES, role) ? ROLES.indexOf(role) : ROLES.length);
  // Shown by role, but chosen by position in the model's list, which is what
  // the backend records.
  const sorted = entities
    .map((entity, index) => ({ entity, index }))
    .sort((a, b) => rank(a.entity.role) - rank(b.entity.role));
  const roleLabel = (role: string) => (known(ROLES, role) ? t(`role.${role}`) : role);
  return (
    <ul className="divide-y rounded-md border">
      {sorted.map(({ entity, index }) => (
        <li
          key={index}
          className={cn(
            'flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2',
            isOut(index, marks) && 'opacity-60'
          )}
        >
          <ItemMark
            index={index}
            label={`${roleLabel(entity.role)}: ${entity.name}`}
            marks={marks}
          />
          <span className="w-24 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
            {roleLabel(entity.role)}
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
          <LeftOut index={index} marks={marks} />
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
  choice,
  dropped,
}: {
  pipeline: string;
  payload: DiplomaticPayload;
  /** The charter text, once loaded; null while it loads or when it is gone. */
  text: string | null;
  catalogueDate: string;
  /** Checkboxes for a pending list answer; omitted, the items are only shown. */
  choice?: ItemChoice;
  /** Positions left out when the proposal was accepted. */
  dropped?: readonly number[];
}) {
  const t = useTranslations('backoffice.diplomaticProposals');
  const marks: ItemMarks = { choice, dropped };
  const kindLabel = (kind: string) => (known(KINDS, kind) ? t(`kind.${kind}`) : kind);
  const predicateLabel = (predicate: string) =>
    known(PREDICATES, predicate) ? t(`predicate.${predicate}`) : predicate;

  switch (pipeline) {
    case 'W2.1':
      return <EntitiesView entities={payload.entities ?? []} text={text} marks={marks} />;

    case 'W2.2':
      return (
        <ul className="space-y-2">
          {(payload.formulae ?? []).map((formula, i) => (
            <li
              key={i}
              className={cn(
                'space-y-1 rounded-md border px-3 py-2',
                isOut(i, marks) && 'opacity-60'
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <ItemMark
                  index={i}
                  label={`${kindLabel(formula.kind)}: ${formula.label}`}
                  marks={marks}
                />
                <Badge variant="outline">{kindLabel(formula.kind)}</Badge>
                <span className="text-sm font-medium">{formula.label}</span>
                <LeftOut index={i} marks={marks} />
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
            <li
              key={i}
              className={cn(
                'flex flex-wrap items-baseline gap-x-2 gap-y-1 px-3 py-2 text-sm',
                isOut(i, marks) && 'opacity-60'
              )}
            >
              <ItemMark
                index={i}
                label={`${triple.subject} – ${predicateLabel(triple.predicate)} – ${triple.object}`}
                marks={marks}
              />
              <Quoted>{triple.subject}</Quoted>
              <QuoteCheck text={text} quote={triple.subject} compact />
              <Badge variant="outline" className="font-normal">
                {predicateLabel(triple.predicate)}
              </Badge>
              <Quoted>{triple.object}</Quoted>
              <QuoteCheck text={text} quote={triple.object} compact />
              <LeftOut index={i} marks={marks} />
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
