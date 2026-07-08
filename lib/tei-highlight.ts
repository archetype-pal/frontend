/**
 * Type-filtered highlighting for the Preview reader (the "Highlight" dropdown).
 *
 * The TEI→dpt-html translator (lib/tei-to-dpt-html.ts) stamps every rendered
 * span with `data-dpt` (its category) and, for typed elements, `data-dpt-type`
 * (its @type — e.g. `salutation`, `name`). This module turns that latent markup
 * into a user-controllable highlight:
 *   - `highlightableOptions` lists the distinct highlightable labels present in a
 *     document (in reading order) so the dropdown can offer exactly what's there.
 *   - `applyHighlightClasses` bakes a `tei-hl` class onto the spans whose label
 *     is selected. Baking into the HTML string (rather than mutating the DOM
 *     post-mount) mirrors the search-term `<mark>` approach in ImageTextViewer:
 *     React owns the markup, so it survives re-commits and is SSR/hydration-safe.
 *
 * Pure string ops only (no DOMParser), so it runs identically on server and
 * client — the default selection renders highlighted on first paint, no flicker.
 */

import { toDptHtml } from '@/lib/tei-to-dpt-html';

/** The two labels highlighted until the user chooses otherwise. */
export const HIGHLIGHT_DEFAULT = ['name', 'salutation'] as const;

/** localStorage key for the user's persisted highlight selection. */
export const HIGHLIGHT_STORAGE_KEY = 'archetype:tei-highlight-types';

/** Element-kind label for a highlightable span that carries no @type. */
const KIND_BY_DPT: Record<string, string> = {
  person: 'person',
  place: 'place',
  ex: 'expansion',
  supplied: 'supplied',
  clause: 'clause',
};

export interface HighlightOption {
  /** The label to match on (an @type like `salutation`, or an element kind). */
  value: string;
  /** Title-cased display name for the menu. */
  label: string;
  /** dpt category (person/place/ex/supplied/clause) — drives the menu colour dot. */
  category: string;
}

const SPAN_RE = /<span\b([^>]*)>/gi;
const ATTR_RE = /([\w:-]+)\s*=\s*"([^"]*)"/g;

function parseAttrs(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let match: RegExpExecArray | null;
  ATTR_RE.lastIndex = 0;
  while ((match = ATTR_RE.exec(attrString)) !== null) {
    attrs[match[1].toLowerCase()] = match[2];
  }
  return attrs;
}

/**
 * The highlight label + category for a span, or null when it isn't a
 * highlightable element (line breaks, non-TEI spans). A typed element keys on
 * its @type; an untyped named entity / editorial mark falls back to its kind.
 */
function labelOf(attrs: Record<string, string>): { value: string; category: string } | null {
  const dpt = attrs['data-dpt'];
  if (!dpt || dpt === 'lb') return null;
  const type = attrs['data-dpt-type']?.trim();
  if (type) return { value: type, category: dpt };
  const kind = KIND_BY_DPT[dpt];
  return kind ? { value: kind, category: dpt } : null;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * The distinct highlightable labels present in `content` (TEI or dpt-html), in
 * order of first appearance — so the dropdown lists exactly this document's
 * markup, reading top to bottom.
 */
export function highlightableOptions(content: string): HighlightOption[] {
  const html = toDptHtml(content);
  const seen = new Set<string>();
  const options: HighlightOption[] = [];
  let match: RegExpExecArray | null;
  SPAN_RE.lastIndex = 0;
  while ((match = SPAN_RE.exec(html)) !== null) {
    const label = labelOf(parseAttrs(match[1]));
    if (!label || seen.has(label.value)) continue;
    seen.add(label.value);
    options.push({ value: label.value, label: titleCase(label.value), category: label.category });
  }
  return options;
}

/**
 * Add the `tei-hl` class (and a `data-tei-label` for the hover pill) to every
 * span whose label is in `selected`. Returns the html unchanged when nothing is
 * selected. Operates on already-sanitised dpt-html — the class it adds is a
 * fixed literal, so it introduces no injection surface.
 */
export function applyHighlightClasses(html: string, selected: ReadonlySet<string>): string {
  if (selected.size === 0) return html;
  return html.replace(SPAN_RE, (full, attrString: string) => {
    const label = labelOf(parseAttrs(attrString));
    if (!label || !selected.has(label.value)) return full;
    let out = attrString;
    if (/\bclass\s*=\s*"/.test(out)) {
      out = out.replace(/\bclass\s*=\s*"([^"]*)"/, (_m, cls: string) => `class="${cls} tei-hl"`);
    } else {
      out = `${out} class="tei-hl"`;
    }
    if (!/\bdata-tei-label\s*=/.test(out)) {
      out = `${out} data-tei-label="${label.value}"`;
    }
    return `<span${out}>`;
  });
}
