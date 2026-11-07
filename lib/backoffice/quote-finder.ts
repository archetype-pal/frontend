/**
 * Where a model's quotations occur in the charter it read.
 *
 * A diplomatic proposal names things the charter supposedly says: a witness,
 * a formula's wording, a dating clause. The reviewer's first question is
 * whether the charter says it at all, so the review panel marks every
 * occurrence in the text and flags any quotation it cannot find, which is the
 * model inventing a reading.
 *
 * Matching ignores case and runs of whitespace (the pipelines strip TEI into
 * single spaces, and a model re-spaces what it quotes), and trims the
 * punctuation a model puts around a quotation. It does not normalise
 * spelling: a different spelling is a different reading.
 */

export interface TextRange {
  start: number;
  end: number;
}

const EDGE_PUNCTUATION = /^[\s.,;:!?'"“”‘’«»()[\]…-]+|[\s.,;:!?'"“”‘’«»()[\]…-]+$/g;

const APOSTROPHES = /['’‘ʼ`´]/;

/** Lowercased text with whitespace runs collapsed, and each character's index in the original. */
function normalise(text: string): { norm: string; map: number[] } {
  let norm = '';
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/\s/.test(ch)) {
      if (norm.length > 0 && !norm.endsWith(' ')) {
        norm += ' ';
        map.push(i);
      }
      continue;
    }
    // A model types a straight apostrophe where the edition has a curly one (`Malc'`, `Malc’`).
    norm += APOSTROPHES.test(ch) ? "'" : ch.toLowerCase();
    map.push(i);
  }
  return { norm, map };
}

function occurrences(norm: string, map: number[], target: string): TextRange[] {
  const ranges: TextRange[] = [];
  let from = 0;
  for (;;) {
    const at = norm.indexOf(target, from);
    if (at === -1) break;
    ranges.push({ start: map[at], end: map[at + target.length - 1] + 1 });
    from = at + target.length;
  }
  return ranges;
}

/**
 * Every place `needle` occurs in `text`, in original-text offsets. Empty
 * below two characters of substance.
 *
 * The quotation is looked for as given first, and only then with its edge
 * punctuation trimmed: in these charters a closing ’ is often the scribe's
 * abbreviation sign ("Golin’"), part of the reading rather than a quotation
 * mark the model added.
 */
export function findQuote(text: string, needle: string): TextRange[] {
  const trimmed = normalise(needle.replace(EDGE_PUNCTUATION, '')).norm.trim();
  if (trimmed.length < 2) return [];
  const exact = normalise(needle).norm.trim();
  const { norm, map } = normalise(text);
  const asGiven = occurrences(norm, map, exact);
  return asGiven.length > 0 || exact === trimmed ? asGiven : occurrences(norm, map, trimmed);
}

/**
 * The fragments of a model's `evidence` worth looking for: what it put in
 * quotation marks, or the whole of it when it quoted nothing.
 */
export function quotedFragments(evidence: string): string[] {
  const fragments = Array.from(evidence.matchAll(/["“«]([^"”»]+)["”»]/g), (m) => m[1].trim());
  const usable = fragments.filter((f) => f.length >= 2);
  if (usable.length > 0) return usable;
  return evidence.trim() ? [evidence.trim()] : [];
}

/** All occurrences of all needles, sorted and with overlaps merged, plus which needles were found. */
export function locateAll(
  text: string,
  needles: string[]
): { ranges: TextRange[]; found: boolean[] } {
  const all: TextRange[] = [];
  const found = needles.map((needle) => {
    const hits = findQuote(text, needle);
    all.push(...hits);
    return hits.length > 0;
  });
  all.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: TextRange[] = [];
  for (const range of all) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  return { ranges: merged, found };
}
