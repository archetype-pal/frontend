import type { TextRange } from '@/lib/backoffice/quote-finder';

/** `text` with each range wrapped in a `<mark>`. Ranges must be sorted and must not overlap. */
export function HighlightedText({ text, ranges }: { text: string; ranges: TextRange[] }) {
  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const { start, end } of ranges) {
    if (start > at) parts.push(text.slice(at, start));
    parts.push(
      <mark
        key={start}
        className="rounded-sm bg-amber-200/70 px-0.5 text-foreground dark:bg-amber-500/30"
      >
        {text.slice(start, end)}
      </mark>
    );
    at = end;
  }
  if (at < text.length) parts.push(text.slice(at));
  return <>{parts}</>;
}
