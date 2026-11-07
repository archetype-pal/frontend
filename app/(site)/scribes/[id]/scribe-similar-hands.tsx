/**
 * "Similar hands" on a scribe's page (AI programme W1.3): the hands near this
 * scribe's hands, from the backend's letter-by-letter comparison. Each match
 * says which of the scribe's hands it is near and at what rank, and the list
 * opens with where the scribe's own hands find each other, which is how far
 * the matches can be trusted.
 */

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { ScribeHandCompared, ScribeSimilarHands } from '@/services/hand-similarity';

type Match = ScribeSimilarHands['results'][number];

function OwnHands({
  compared,
  labels,
}: {
  compared: ScribeHandCompared[];
  labels: Map<number, string>;
}) {
  const t = useTranslations('scribe.similar');
  if (compared.length < 2) {
    return <p className="max-w-3xl text-sm text-muted-foreground">{t('checkOne')}</p>;
  }
  const found = compared.filter((hand) => hand.siblings.length > 0).length;
  return (
    <div className="space-y-1.5 rounded-lg border bg-muted/30 p-4 text-sm">
      <p>{t('checkIntro', { found, compared: compared.length })}</p>
      <ul className="space-y-0.5 text-muted-foreground" aria-label={t('checkLabel')}>
        {compared.map((hand) => {
          const [nearest] = hand.siblings;
          return (
            <li key={hand.id}>
              {nearest
                ? t('checkFound', {
                    hand: hand.item_part_display_label,
                    other: labels.get(nearest.hand) ?? String(nearest.hand),
                    rank: nearest.rank,
                  })
                : t('checkNone', { hand: hand.item_part_display_label })}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MatchRow({
  match,
  position,
  compared,
  labels,
}: {
  match: Match;
  position: number;
  compared: number;
  labels: Map<number, string>;
}) {
  const t = useTranslations('scribe.similar');
  const { hand, near } = match;
  const details = [hand.scribe?.name ?? t('noScribe'), hand.date, hand.place]
    .filter(Boolean)
    .join(' · ');
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <p className="flex items-baseline gap-2">
          <span className="text-sm tabular-nums text-muted-foreground">{position}.</span>
          <Link href={`/hands/${hand.id}`} className="font-medium text-primary hover:underline">
            {hand.item_part_display_label}
          </Link>
          <span className="text-sm text-muted-foreground">{hand.name}</span>
        </p>
        <p className="text-sm text-muted-foreground">{details}</p>
        <p className="text-xs text-muted-foreground">
          {t('nearCount', { count: near.length, compared })}
        </p>
        <ul className="flex flex-wrap gap-1.5" aria-label={t('nearLabel')}>
          {near.map((row) => {
            const label = labels.get(row.hand) ?? String(row.hand);
            return (
              <li
                key={row.hand}
                title={t('nearTitle', {
                  hand: label,
                  rank: row.rank,
                  similarity: row.similarity.toFixed(2),
                })}
                className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-xs"
              >
                {t('nearRank', { hand: label, rank: row.rank })}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="shrink-0 text-left sm:text-right" title={t('likenessTitle')}>
        <p className="text-lg font-semibold tabular-nums">{match.similarity.toFixed(2)}</p>
        <p className="text-xs text-muted-foreground">{t('likeness')}</p>
      </div>
    </li>
  );
}

export function ScribeSimilarHandsList({ similar }: { similar: ScribeSimilarHands }) {
  const t = useTranslations('scribe.similar');
  const labels = new Map(similar.hands.map((hand) => [hand.id, hand.item_part_display_label]));
  const compared = similar.hands.filter((hand) => hand.compared);
  return (
    <section className="space-y-4">
      <p className="max-w-3xl text-sm text-muted-foreground">{t('intro')}</p>
      <OwnHands compared={compared} labels={labels} />
      <ol className="divide-y divide-border rounded-lg border bg-card">
        {similar.results.map((match, index) => (
          <MatchRow
            key={match.hand.id}
            match={match}
            position={index + 1}
            compared={compared.length}
            labels={labels}
          />
        ))}
      </ol>
    </section>
  );
}
