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
  /** dpt category (person/place/ex/supplied/clause). */
  category: string;
}

/**
 * Per-label highlight colour as `[hue, saturation%, lightness%]`. Each markup
 * type gets a distinct, hand-tuned hue so several enabled types stay visually
 * separable — the point of a per-type filter (keying on the dpt *category*, as
 * an earlier version did, made every clause type the same indigo). Stable per
 * label, so a type is the same colour in every document; element kinds mirror
 * their family. `name`/`person` keep the persName green shared with Rich mode.
 */
const HIGHLIGHT_STYLE: Record<string, readonly [number, number, number]> = {
  name: [145, 55, 42],
  // seg @types (the clause vocabulary), spread around the wheel
  address: [0, 72, 56],
  intitulatio: [210, 72, 52],
  salutation: [32, 85, 48],
  arenga: [280, 48, 56],
  notification: [172, 60, 38],
  disposition: [322, 60, 55],
  holding: [55, 78, 44],
  warrandice: [240, 55, 60],
  sealing: [128, 50, 40],
  dating: [300, 48, 54],
  witnesses: [192, 70, 44],
  boundaries: [20, 78, 52],
  narration: [255, 55, 60],
  injunction: [100, 52, 38],
  prohibition: [348, 62, 56],
  // element kinds (untyped highlightables)
  person: [145, 55, 42],
  place: [178, 60, 38],
  expansion: [36, 85, 48],
  supplied: [282, 48, 54],
};

const FALLBACK_STYLE: readonly [number, number, number] = [220, 12, 50];

function styleOf(value: string): readonly [number, number, number] {
  return HIGHLIGHT_STYLE[value] ?? FALLBACK_STYLE;
}

/** Opaque `hsl(...)` for a label — used for the dropdown's colour dot. */
export function highlightHsl(value: string): string {
  const [h, s, l] = styleOf(value);
  return `hsl(${h} ${s}% ${l}%)`;
}

/** The inline CSS custom properties the `.tei-hl` rule reads to colour a span. */
function highlightCssVars(value: string): string {
  const [h, s, l] = styleOf(value);
  return `--hl-h:${h};--hl-s:${s}%;--hl-l:${l}%;--hl-lu:${Math.max(0, l - 8)}%`;
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
 * Add the `tei-hl` class, its per-type colour (as inline `--hl-*` custom
 * properties the `.tei-hl` CSS rule reads), and a `data-tei-label` for the hover
 * pill, to every span whose label is in `selected`. Returns the html unchanged
 * when nothing is selected. Operates on already-sanitised dpt-html; everything
 * it adds is a fixed literal or a number from the palette (never the raw @type),
 * so it introduces no injection surface.
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
    const vars = highlightCssVars(label.value);
    if (/\bstyle\s*=\s*"/.test(out)) {
      out = out.replace(/\bstyle\s*=\s*"([^"]*)"/, (_m, css: string) => `style="${css};${vars}"`);
    } else {
      out = `${out} style="${vars}"`;
    }
    if (!/\bdata-tei-label\s*=/.test(out)) {
      out = `${out} data-tei-label="${label.value}"`;
    }
    return `<span${out}>`;
  });
}
