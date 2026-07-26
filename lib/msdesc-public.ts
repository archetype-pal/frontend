/**
 * Public-site msDesc rendering pipeline (TEI descriptions roadmap 5.2).
 *
 * Turns the `msdesc_areas` the public item-part detail endpoint returns into
 * sanitized, canonically-ordered HTML blocks for the manuscript page's
 * structured-description section.
 *
 * The pipeline is deliberately identical to the backoffice Preview tab
 * (`components/backoffice/manuscripts/msdesc/msdesc-area-panel.tsx`) and to the
 * charter viewer (`components/text/image-text-viewer.tsx`):
 * `sanitizeHtml(renderMsDescArea(...), { allowDataAttr: true })`. The renderer
 * is NOT a sanitizer — non-TEI markup in a stored fragment passes through it
 * verbatim — so the sanitize pass is mandatory and lives here, in one place,
 * rather than at each call site. The one deliberate difference is the heading
 * level (see `PUBLIC_AREA_HEADING_LEVEL`), because the two surfaces nest the
 * block under different headings.
 *
 * Pure string work only: no DOM or browser globals, so it runs unchanged during
 * the server render of the public page.
 */

import { MSDESC_AREAS, type MsDescAreaId } from '@/lib/msdesc-vocab';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { renderMsDescArea, type MsDescTranslate } from '@/lib/tei-msdesc-render';
import type { PublicMsDescArea } from '@/types/manuscript';

export interface RenderedMsDescArea {
  area: MsDescAreaId;
  /** Sanitized structured-field HTML, safe for `dangerouslySetInnerHTML`. */
  html: string;
}

/** Canonical msDesc reading order (unknown ids are filtered out before sorting). */
function areaRank(area: MsDescAreaId): number {
  return MSDESC_AREAS.indexOf(area);
}

/**
 * Heading level for an area title on the public page. The section heads itself
 * with an `<h2>` (`SectionHeading`), so areas are `<h3>` and the renderer's
 * nested group headings (Layout / Hands / …) follow at `<h4>` — no gap in the
 * document outline for screen-reader heading navigation (WCAG 1.3.1). The
 * backoffice Preview tab keeps the renderer's `h4`/`h5` default, which is
 * gapless under *its* `<h3>` panel title.
 */
const PUBLIC_AREA_HEADING_LEVEL = 3;

/**
 * The envelope `renderMsDescArea` always emits:
 * `<div class="msdesc-area …"><hN class="msdesc-heading">Label</hN>{body}</div>`,
 * where N is the caller's `headingLevel` (see above).
 */
const AREA_ENVELOPE_RE =
  /^\s*<div class="msdesc-area[^"]*">\s*<h([2-6]) class="msdesc-heading">[^<]*<\/h\1>([\s\S]*)<\/div>\s*$/;

/**
 * True when a rendered area carries more than its own heading.
 *
 * A published-but-blank area — a seeded skeleton nobody filled in — renders as
 * that envelope with an empty body, which on the public page would read as a
 * lone title under a section rule. Matching the documented envelope is cheaper
 * and SSR-safer than parsing the string back into a DOM; an unrecognised shape
 * falls back to "keep it", so a renderer change can never silently hide content.
 */
function hasRenderedBody(html: string): boolean {
  const match = AREA_ENVELOPE_RE.exec(html);
  return (match ? match[2] : html).trim().length > 0;
}

/**
 * Render every published area of one item part, in msDesc canonical order
 * (msIdentifier → msContents → physDesc → history).
 *
 * Areas that are explicitly unpublished, carry an unknown area id, or render to
 * nothing but their own heading (an empty or unfilled fragment) are dropped, so
 * a caller can treat an empty result as "show no section at all".
 *
 * @param areas  `msdesc_areas` from the public item-part detail response.
 * @param t      Label translator over the `backoffice` next-intl namespace —
 *               the namespace the renderer's `msdesc.*` label keys live in
 *               (shared with the backoffice editor; see `lib/msdesc-vocab.ts`).
 */
export function renderPublicMsDescAreas(
  areas: PublicMsDescArea[] | undefined | null,
  t: MsDescTranslate
): RenderedMsDescArea[] {
  if (!areas || areas.length === 0) return [];
  return areas
    .filter((entry) => entry.is_published !== false)
    .filter((entry) => (MSDESC_AREAS as readonly string[]).includes(entry.area))
    .slice()
    .sort((a, b) => areaRank(a.area) - areaRank(b.area))
    .map((entry) => ({
      area: entry.area,
      html: sanitizeHtml(
        renderMsDescArea(entry.area, entry.content ?? '', {
          t,
          headingLevel: PUBLIC_AREA_HEADING_LEVEL,
        }),
        { allowDataAttr: true }
      ),
    }))
    .filter((rendered) => hasRenderedBody(rendered.html));
}
