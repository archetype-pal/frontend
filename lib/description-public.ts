/**
 * Public rendering of a catalogue description, in either format (docs/tei.md §4.5).
 *
 * `HistoricalItemDescription.content` holds legacy catalogue HTML or TEI prose,
 * discriminated by the storage-owned wrapper. One function decides which, so no
 * call site has to — and so the two sanitize policies cannot drift apart:
 *
 *   legacy HTML → `sanitizeHtml(content)`                       (as it always was)
 *   TEI prose   → `sanitizeHtml(renderTeiProse(...), { allowDataAttr: true })`
 *
 * `allowDataAttr` is required on the TEI path and must stay off the legacy one.
 * The renderer emits `data-tei-label` for entity hover pills and `data-ref-*`
 * for a future hover card; stripping those would silently flatten the markup.
 * Legacy HTML has no such attributes to preserve and is arbitrary third-party
 * markup, so it keeps the tighter policy.
 *
 * Pure string work — no DOM or browser globals, so it runs unchanged in the
 * server render of the public page.
 */

import { sanitizeHtml } from '@/lib/sanitize-html';
import { teiDescriptionProse } from '@/lib/tei-description';
import { renderTeiProse, type MsDescTranslate } from '@/lib/tei-msdesc-render';

export interface RenderedDescription {
  /** Sanitized HTML, safe for `dangerouslySetInnerHTML`. */
  html: string;
  /** True when this row is linked TEI prose rather than legacy catalogue HTML. */
  isTei: boolean;
}

/**
 * `t` is optional: it feeds one string, the unresolved-ref tooltip. A surface
 * with no translator (a server component, a teaser) gets the renderer's own
 * last-segment fallback rather than being forced to invent one.
 */
export function renderPublicDescription(
  content: string | null | undefined,
  t?: MsDescTranslate
): RenderedDescription {
  const raw = content ?? '';
  const prose = teiDescriptionProse(raw);

  if (prose === null) return { html: sanitizeHtml(raw), isTei: false };

  return {
    html: sanitizeHtml(renderTeiProse(prose, { t }), { allowDataAttr: true }),
    isTei: true,
  };
}
