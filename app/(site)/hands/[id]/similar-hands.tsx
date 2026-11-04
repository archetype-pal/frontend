/**
 * "Similar hands" (AI programme W1.3): the hands whose letters are shaped most
 * like this one's, from the backend's letter-by-letter comparison. Each match
 * shows the letters it rests on, so a reader can judge a match built on three
 * letters differently from one built on thirty.
 */

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { formatAllographLabel } from '@/lib/allograph-labels';
import { formsCompared, type SimilarHand, type SimilarHands } from '@/services/hand-similarity';

/** The letters shown before "+N more". */
const LETTERS_SHOWN = 8;

/** "a, with head" rather than "with head": an allograph's name alone does not say which letter. */
function letterLabel(letter: SimilarHand['letters'][number]): string {
  return (
    formatAllographLabel({
      name: letter.name ?? '',
      character_name: letter.character,
    }) || String(letter.allograph)
  );
}

function Match({ match }: { match: SimilarHand }) {
  const t = useTranslations('hand.similar');
  const { hand, letters } = match;
  const shown = letters.slice(0, LETTERS_SHOWN);
  const details = [hand.scribe?.name ?? t('noScribe'), hand.date, hand.place]
    .filter(Boolean)
    .join(' · ');
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <p className="flex items-baseline gap-2">
          <span className="text-sm tabular-nums text-muted-foreground">{match.rank}.</span>
          <Link href={`/hands/${hand.id}`} className="font-medium text-primary hover:underline">
            {hand.item_part_display_label}
          </Link>
          <span className="text-sm text-muted-foreground">{hand.name}</span>
        </p>
        <p className="text-sm text-muted-foreground">{details}</p>
        <p className="text-xs text-muted-foreground">
          {t('evidence', { letters: letters.length, forms: formsCompared(letters) })}
        </p>
        <ul className="flex flex-wrap gap-1.5" aria-label={t('lettersLabel')}>
          {shown.map((letter) => (
            <li
              key={letter.allograph}
              title={t('letterTitle', {
                letter: letterLabel(letter),
                similarity: letter.similarity.toFixed(2),
                here: letter.glyphs[0],
                there: letter.glyphs[1],
              })}
              className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-xs"
            >
              <span className="font-serif">{letterLabel(letter)}</span>{' '}
              <span className="tabular-nums text-muted-foreground">
                {letter.similarity.toFixed(2)}
              </span>
            </li>
          ))}
          {letters.length > shown.length && (
            <li className="px-1 py-0.5 text-xs text-muted-foreground">
              {t('moreLetters', { count: letters.length - shown.length })}
            </li>
          )}
        </ul>
      </div>
      <div className="shrink-0 text-left sm:text-right" title={t('likenessTitle')}>
        <p className="text-lg font-semibold tabular-nums">{match.similarity.toFixed(2)}</p>
        <p className="text-xs text-muted-foreground">{t('likeness')}</p>
      </div>
    </li>
  );
}

export function SimilarHandsList({ similar }: { similar: SimilarHands }) {
  const t = useTranslations('hand.similar');
  return (
    <section className="space-y-4">
      <p className="max-w-3xl text-sm text-muted-foreground">{t('intro')}</p>
      <ol className="divide-y divide-border rounded-lg border bg-card">
        {similar.results.map((match) => (
          <Match key={match.hand.id} match={match} />
        ))}
      </ol>
    </section>
  );
}
