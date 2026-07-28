/**
 * Pure helpers for the `<ref>` resource picker (roadmap 4.2/4.3) — the
 * React-free core the dialog and the three insertion paths share. It turns raw
 * search hits / saved searches / free-text input into a {@link ResourceRef}
 * (via `lib/tei-ref.ts`), and derives the artefacts each insertion surface
 * needs:
 *   - Source mode: {@link sourceInsertMarkup} → `buildRefMarkupRaw(...)` (the
 *     CodeMirror selection is raw TEI source, spliced verbatim, never escaped).
 *   - Rich mode:   {@link refAttrs} → the `wrapTei(editor, 'ref', attrs)` attr
 *     object (canonical order `type`→`key`→`target`, matching `buildRefMarkup`;
 *     pinned by a test that parses the built markup).
 *   - Form path:   {@link keyFromRef} → the `@key` stamped on a phrase leaf.
 *
 * All target derivation delegates to `lib/tei-ref.ts` (which itself delegates to
 * the renderer's `resolveRefKeyHref`/`sanitizeRefHref`), so the picker, the
 * serializer and the renderer never diverge.
 */

import { sanitizeRefHref } from '@/lib/tei-msdesc-render';
import {
  buildRefMarkup,
  buildRefMarkupRaw,
  isBalancedRefContent,
  keyForResource,
  targetForKey,
  type ResourceKind,
  type ResourceRef,
} from '@/lib/tei-ref';
import type { SavedSearch } from '@/lib/saved-searches';
import type { ItemPartHit, PlaceHit, ScribeHit } from '@/services/tei-ref-search';

/** The resource kinds backed by a public search index (the picker's query tabs). */
export type SearchableRefKind = 'person' | 'place' | 'manuscript';

/** The public search-index segment backing a searchable resource kind. */
export const REF_INDEX_SEGMENT: Record<SearchableRefKind, string> = {
  person: 'scribes',
  manuscript: 'item-parts',
  place: 'places',
};

/** Narrow a kind to one with a backing index (and therefore a placeholder key). */
export function isSearchableRefKind(kind: ResourceKind): kind is SearchableRefKind {
  return Object.hasOwn(REF_INDEX_SEGMENT, kind);
}

/** The five v1 resource tabs, in display order (no Work — deferred to v2). */
export const REF_PICKER_KINDS: readonly ResourceKind[] = [
  'person',
  'place',
  'manuscript',
  'search',
  'external',
];

/**
 * The result tab a place link lands on. The site has NO bare `/search/` route
 * (`app/(site)/search/` holds only `[type]/page.tsx`), so the type segment is
 * mandatory; `manuscripts` is the default landing tab used by the header search
 * and the not-found page.
 */
export const PLACE_SEARCH_RESULT_TYPE = 'manuscripts';

/**
 * A `@target`-only site-search link for a place name (`§8.3`: Place has no
 * model, so it links to a keyword search, not a detail route).
 *
 * The shape must match the site's own search URLs — `/search/{type}?keyword=…`
 * (`components/layout/header.tsx`, `components/search/search-keyword-bar.tsx`).
 * The search page reads `keyword`, never `q`, and a bare `/search/` 404s.
 */
export function placeSearchTarget(query: string): string {
  return `/search/${PLACE_SEARCH_RESULT_TYPE}?keyword=${encodeURIComponent(query.trim())}`;
}

/** A scribe hit → a Person ref (`person_{id}` → `/scribes/{id}`). */
export function personRefFromScribe(hit: ScribeHit): ResourceRef {
  const key = `person_${hit.id}`;
  return {
    kind: 'person',
    id: hit.id,
    key,
    target: targetForKey(key) ?? `/scribes/${hit.id}`,
    label: (hit.name ?? '').trim() || `#${hit.id}`,
  };
}

/** An item-part hit → a Manuscript ref (`/manuscripts/{id}`). */
export function manuscriptRefFromItemPart(hit: ItemPartHit): ResourceRef {
  const label = (hit.display_label ?? hit.shelfmark ?? '').trim() || `#${hit.id}`;
  return { kind: 'manuscript', id: hit.id, target: `/manuscripts/${hit.id}`, label };
}

/** A place name → a Place ref (search-link target, no `@key`). */
export function placeRef(name: string): ResourceRef {
  const label = name.trim();
  return { kind: 'place', target: placeSearchTarget(label), label };
}

/**
 * De-duplicate place hits by name (the `places` index holds one document per
 * mention, so a name recurs) and map each to a Place ref, capped at `limit`.
 */
export function placeRefsFromHits(hits: PlaceHit[], limit = 12): ResourceRef[] {
  const seen = new Set<string>();
  const out: ResourceRef[] = [];
  for (const hit of hits) {
    const name = (hit.name ?? '').trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push(placeRef(name));
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Normalize a stored saved-search url into a safe href (site-relative or
 * http(s)), or `null` when it cannot be made safe. Saved urls are usually
 * `/search/…`; a leading slash is added when one is missing.
 */
export function safeInternalTarget(raw: string): string | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;
  const direct = sanitizeRefHref(trimmed);
  if (direct) return direct;
  // Repair only a stored path that is MISSING its leading slash. Never a
  // scheme'd URL (`javascript:` / `data:` / …), which prefixing would silently
  // launder — and never one that already starts with `/` or `\`: those are the
  // authority forms `sanitizeRefHref` just rejected (`//evil.com`,
  // `/\evil.com`), and re-prefixing would rewrite an attack into a plausible
  // but wrong internal path instead of refusing it.
  if (/^[/\\]/.test(trimmed)) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
  return sanitizeRefHref(`/${trimmed}`);
}

/** A saved search → a Search ref, or `null` when its stored url is unsafe. */
export function savedSearchRef(saved: SavedSearch): ResourceRef | null {
  const target = safeInternalTarget(saved.url);
  if (!target) return null;
  const label = saved.label.trim() || saved.keyword.trim() || saved.resultType;
  return { kind: 'search', target, label };
}

/** A free-text URL + link text → an External ref, or `null` when the URL is unsafe. */
export function externalRef(url: string, label: string): ResourceRef | null {
  const target = sanitizeRefHref(url);
  if (!target) return null;
  return { kind: 'external', target, label: label.trim() || target };
}

/**
 * The `wrapTei(editor, 'ref', …)` attribute object for Rich-mode insertion —
 * canonical order `type` → `key` → `target`, `external` carrying no `@type`.
 * Values are RAW (unescaped): `docToTei` escapes on serialize. Kept byte-for-
 * byte consistent with {@link buildRefMarkup} by a test that parses its output.
 */
export function refAttrs(ref: ResourceRef): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (ref.kind !== 'external') attrs.type = ref.kind;
  const key = keyForResource(ref);
  if (key) attrs.key = key;
  if (ref.target) attrs.target = ref.target;
  return attrs;
}

/**
 * Source-mode markup: a `<ref>` wrapping the current selection when there is
 * one, else the ref's own label.
 *
 * The selection is RAW TEI SOURCE, so it is spliced verbatim
 * ({@link buildRefMarkupRaw}) — escaping it would turn a wrapped
 * `<persName>John</persName>` into literal text and silently destroy the
 * encoding, and the result would still parse, so nothing downstream would
 * catch it. Only the empty-selection label fallback is escaped (it is plain
 * text from the picker, not source).
 *
 * Returns `null` when the selection is not a balanced fragment (it straddles a
 * tag boundary) — the caller must refuse the insert rather than emit malformed
 * XML.
 */
export function sourceInsertMarkup(ref: ResourceRef, selectedText: string): string | null {
  if (selectedText.trim() === '') return buildRefMarkup(ref, ref.label);
  if (!isBalancedRefContent(selectedText)) return null;
  return buildRefMarkupRaw(ref, selectedText);
}

/**
 * The `@key` a picked resource stamps onto an author/title/origPlace phrase
 * leaf (form path). Only Person yields a client-resolvable key in v1
 * (`person_{id}`); other kinds have no key (→ undefined, no-op stamp).
 */
export function keyFromRef(ref: ResourceRef): string | undefined {
  return keyForResource(ref);
}
