/**
 * `<ref>` site-resource serialization (TEI descriptions roadmap 4.1 + the pure
 * core of 3.2). Pure, React-free.
 *
 * A `<ref>` is a **self-contained inline construct, NOT** a member of the
 * linkable-element set (`LINKABLE_ELEMENTS` / `_TEI_LINKABLE`) — adding it there
 * would corrupt region-link positional `element_index` (findings §8.3). `@target`
 * is the authoritative href; `@type`/`@key` are identity/styling only.
 *
 * Serialization (roadmap §8.3), attribute order `type` → `key` → `target`,
 * escaped through the shared `escapeXmlAttr`/`escapeXmlText` emitters in
 * `lib/msdesc-fragments.ts` so every form round-trips through `parseFragment`:
 *   - External URL: `<ref target="https://…">text</ref>`
 *   - Person:       `<ref type="person" key="person_42" target="/scribes/42">text</ref>`
 *   - Place:        `<ref type="place" target="/search/{type}?keyword=…">text</ref>` (@target-only)
 *   - Manuscript:   `<ref type="manuscript" target="/manuscripts/{id}">text</ref>`
 *   - Search:       `<ref type="search" target="/search/{type}?keyword=…">text</ref>`
 *
 * Work refs are deferred to v2 (roadmap 0.1): the picker never builds one, but a
 * hand-authored `work_` key is TOLERATED — `parseRefMarkup` preserves it and
 * `targetForKey` resolves it exactly as the renderer does (no client-derivable
 * route → `null` → the renderer's plain-text + tooltip fallback). Such a ref
 * classifies into the `external` catch-all, so a bare `<ref key="work_790">`
 * round-trips byte-exact.
 *
 * PARSE SCOPE — `parseRefMarkup` is a reader for the shapes THIS module emits,
 * not a general `<ref>` editor: only `@type`/`@key`/`@target` survive a
 * parse→build cycle (an unrecognized `@type` classifies as `external`, whose
 * `typeForKind` is undefined, so `type="work"` is DROPPED on re-emit; `@n`,
 * `@cRef`, `@rend`, `@xml:id` … are dropped the same way) and inner markup is
 * flattened to its concatenated text (`John <hi>le</hi> Scot` → `John le Scot`).
 * Do not use it to round-trip hand-authored TEI.
 *
 * The `@key` ↔ route derivation is **shared with** `lib/tei-msdesc-render.ts`:
 * {@link targetForKey} delegates to its `resolveRefKeyHref`, and target safety
 * reuses its `sanitizeRefHref`, so the form/prose insertion paths and the
 * render path can never diverge (pinned by a test).
 *
 * The ODD-native variant of 3.2 ({@link stampKeyOnElement}/{@link unstampKey})
 * stamps `@key`(+`@target`) directly on a phrase-leaf element (author/title/
 * origPlace leaves) instead of wrapping a `<ref>`, preserving the leaf's inner
 * content byte-exact and never introducing a `<p>` (the no-`<p>` invariant).
 * It has no production caller yet — the shipped form path composes those leaves
 * from typed state; see the note on {@link stampKeyOnElement}.
 */

import {
  attrValue,
  el,
  escapeXmlAttr,
  innerXml,
  parseFragment,
  raw,
  serializeFragment,
  text,
  type BuildElement,
  type BuildNode,
  type XmlNode,
} from '@/lib/msdesc-fragments';
import { resolveRefKeyHref, sanitizeRefHref } from '@/lib/tei-msdesc-render';

// ── Descriptor ──────────────────────────────────────────────────────────

/** v1 resource kinds (roadmap 0.1): no Work tab — `work_` deferred to v2. */
export type ResourceKind = 'person' | 'place' | 'manuscript' | 'image' | 'search' | 'external';

/**
 * A resolved site-resource reference. `target` is the authoritative href (always
 * present for picker-built refs); `key` is the ODD authority key (person → and a
 * tolerated hand-authored `work_`); `id` is the parsed authority id when one is
 * derivable (person/manuscript), informational only — {@link buildRefMarkup}
 * emits from `key`/`target`, never re-derives from `id`.
 */
export interface ResourceRef {
  kind: ResourceKind;
  id?: string | number;
  key?: string;
  target: string;
  label: string;
}

// ── @key ↔ route derivation (3.2 pure core, shared with the renderer) ────

/**
 * The `@key` for a resource, or undefined. Only Person carries a key
 * (`person_{id}`); place/search/manuscript are `@target`-only (§8.3). An
 * explicit `key` already on the ref wins (so a parsed `person_42` — or a
 * tolerated `work_` on the external catch-all — round-trips verbatim).
 */
export function keyForResource(ref: ResourceRef): string | undefined {
  if (ref.kind === 'person') {
    if (ref.key) return ref.key;
    if (ref.id !== undefined && `${ref.id}` !== '') return `person_${ref.id}`;
    return undefined;
  }
  return ref.key;
}

/**
 * The site route a `@key` resolves to, or `null` when none is client-derivable.
 * Delegates to the renderer's `resolveRefKeyHref` so the form/prose paths and
 * the render path stay in lockstep: `person_{id}` → `/scribes/{id}`; `work_` and
 * every other prefix → `null` (the renderer then falls back to plain text +
 * tooltip). This is the inverse the form path uses when stamping `@key`.
 */
export function targetForKey(key: string): string | null {
  return resolveRefKeyHref(key);
}

// ── build / parse ─────────────────────────────────────────────────────────

/** `@type` value for a kind — `external` carries none (its `@target` speaks). */
function typeForKind(kind: ResourceKind): string | undefined {
  return kind === 'external' ? undefined : kind;
}

/**
 * Serialize a `<ref>` for the prose path: `<ref …>innerText</ref>`. Attributes
 * are emitted in canonical order (`type`, `key`, `target`), escaped exactly like
 * the codebase's other TEI emitters; `@target` is present whenever the ref
 * carries one (always, for picker-built refs). Throws on an unsafe target
 * (`javascript:` / `data:` / protocol-relative …) as defense in depth — the
 * picker validates first, but a builder must never emit a hostile href.
 */
export function buildRefMarkup(ref: ResourceRef, innerText: string): string {
  return serializeFragment(refElement(ref, [text(innerText)]));
}

/**
 * Serialize a `<ref>` whose inner content is already XML — the Source-mode
 * wrap, where the selection is raw TEI source that frequently carries inline
 * markup (`<persName>`, `<hi>`, `<lb/>`). {@link buildRefMarkup} would escape
 * that into literal text and silently destroy the encoding, so the source path
 * must splice it verbatim.
 *
 * `innerXml` MUST be a balanced fragment; callers validate with
 * {@link isBalancedRefContent} first. Returns the same attribute spelling as
 * {@link buildRefMarkup} (identical for a markup-free inner string that needs
 * no escaping).
 */
export function buildRefMarkupRaw(ref: ResourceRef, innerXml: string): string {
  return serializeFragment(refElement(ref, [raw(innerXml)]));
}

/**
 * True when `xml` is a balanced fragment that can legally sit inside a `<ref>`
 * — i.e. every tag it opens it also closes. A selection that straddles a tag
 * boundary (`…<persName>John` …) is NOT balanced and must never be wrapped:
 * splicing it would emit malformed XML.
 */
export function isBalancedRefContent(xml: string): boolean {
  if (xml === '') return true;
  return parseFragment(`<ref>${xml}</ref>`).ok;
}

/** Shared `<ref>` element construction: canonical attr order + target safety. */
function refElement(ref: ResourceRef, children: BuildNode[]): BuildElement {
  const target = ref.target ?? '';
  if (target !== '' && sanitizeRefHref(target) === null) {
    throw new Error(`refusing to build a <ref> with an unsafe target: ${target}`);
  }
  return el(
    'ref',
    [
      ['type', typeForKind(ref.kind)],
      ['key', keyForResource(ref)],
      ['target', target === '' ? undefined : target],
    ],
    children
  );
}

/** Decoded concatenated descendant text of a parsed node (the ref's label). */
function decodedText(node: XmlNode): string {
  if (node.kind === 'text') return node.text;
  return node.children.map(decodedText).join('');
}

/** Classify by `@type`; absent or unknown (e.g. `work`) → the external bucket. */
function classifyKind(type: string | undefined): ResourceKind {
  switch (type) {
    case 'person':
    case 'place':
    case 'manuscript':
    case 'image':
    case 'search':
      return type;
    default:
      return 'external';
  }
}

/** The authority id, when one is derivable from the key or the target. */
function deriveId(kind: ResourceKind, key: string | undefined, target: string): string | undefined {
  if (kind === 'person') {
    const fromKey = key ? /^person_(\d+)$/.exec(key.trim()) : null;
    if (fromKey) return fromKey[1];
    const fromTarget = /^\/scribes\/(\d+)\b/.exec(target);
    return fromTarget ? fromTarget[1] : undefined;
  }
  // Before the manuscript branch, and matching the FULL path: the manuscript
  // regex ends in `\b`, so `/manuscripts/5/images/9` matches it too and would
  // report the part id as the image ref's id.
  if (kind === 'image') {
    const fromTarget = /^\/manuscripts\/\d+\/images\/(\d+)\b/.exec(target);
    return fromTarget ? fromTarget[1] : undefined;
  }
  if (kind === 'manuscript') {
    const fromTarget = /^\/manuscripts\/(\d+)\b/.exec(target);
    return fromTarget ? fromTarget[1] : undefined;
  }
  return undefined;
}

/**
 * Parse a `<ref …>text</ref>` fragment back into a descriptor — the inverse of
 * {@link buildRefMarkup}. Returns `null` for anything that is not a well-formed
 * single `<ref>` element, or whose `@target` is unsafe (mirrors the renderer's
 * `sanitizeRefHref` guard). Tolerates a hand-authored `work_` key (preserved on
 * the descriptor; classified into the `external` bucket).
 */
export function parseRefMarkup(markup: string): ResourceRef | null {
  const parsed = parseFragment(markup);
  if (!parsed.ok || parsed.root.name !== 'ref') return null;
  const root = parsed.root;
  const rawTarget = attrValue(root, 'target');
  if (rawTarget !== undefined && rawTarget !== '' && sanitizeRefHref(rawTarget) === null) {
    return null;
  }
  const key = attrValue(root, 'key');
  const target = rawTarget ?? '';
  const kind = classifyKind(attrValue(root, 'type'));
  return {
    kind,
    id: deriveId(kind, key, target),
    key,
    target,
    label: root.children.map(decodedText).join(''),
  };
}

// ── ODD-native `@key` stamp / unstamp (3.2 pure core) ─────────────────────

/**
 * `undefined` = leave the attribute exactly as it is; `null` = remove it; a
 * string = set it. The distinction matters: a caller stamping only a `@key`
 * must not silently destroy an unrelated `@target` already on the element.
 */
export type StampAttrValue = string | null | undefined;

const STAMPABLE = ['key', 'target'] as const;

/**
 * Rebuild a phrase-leaf element with `key`/`target` applied per
 * {@link StampAttrValue}. Every other attribute is carried through in its
 * source POSITION, and an updated `key`/`target` is rewritten in place (only a
 * newly-added one is appended). The inner content is byte-exact and no `<p>` is
 * ever introduced. Returns `null` when the value is not a well-formed single
 * element.
 *
 * Attribute VALUES survive semantically, not byte-exactly: they are re-emitted
 * through {@link escapeXmlAttr}, so entity spelling (`&apos;` → `&#x27;`) and
 * quote style (`role='x'` → `role="x"`) are normalized to the canonical form
 * the rest of the codebase emits.
 */
function rebuildPhraseLeaf(
  value: string,
  next: { key?: StampAttrValue; target?: StampAttrValue }
): string | null {
  const parsed = parseFragment(value);
  if (!parsed.ok) return null;
  const root = parsed.root;
  const attrs: Array<[string, string]> = [];
  for (const attr of root.attrs) {
    const replacement = attr.name === 'key' || attr.name === 'target' ? next[attr.name] : undefined;
    if (replacement === undefined) attrs.push([attr.name, attr.value]);
    else if (replacement !== null) attrs.push([attr.name, replacement]);
    // `null` → the attribute is dropped.
  }
  for (const name of STAMPABLE) {
    const incoming = next[name];
    if (incoming === undefined || incoming === null) continue;
    if (root.attrs.some((a) => a.name === name)) continue; // already rewritten in place
    attrs.push([name, incoming]);
  }
  const attrStr = attrs.map(([n, v]) => ` ${n}="${escapeXmlAttr(v)}"`).join('');
  if (root.selfClosing) return `<${root.name}${attrStr}/>`;
  const inner = innerXml(parsed.source, root);
  return `<${root.name}${attrStr}>${inner}</${root.name}>`;
}

/**
 * Stamp `@key` (and, for the ODD-native person variant, `@target`) onto a
 * phrase-leaf element (`<author>`/`<title>`/`<country>`/`<region>`/
 * `<settlement>` …) — the ODD-native alternative to wrapping a `<ref>`.
 *
 * Omitting a field leaves that attribute untouched; passing `null` removes it
 * (see {@link StampAttrValue}). Inner content is preserved byte-exact and no
 * `<p>` is ever introduced. Returns `null` on a malformed leaf or an unsafe
 * `@target`.
 *
 * NOTE — no production caller today: the shipped msDesc **form** path composes
 * `<author key="…">` from typed state (`lib/msdesc-form.ts` `textLeaf`), so it
 * never does element-string surgery. These two functions are the string-level
 * primitives for the non-typed paths (Source mode, a future ODD-native picker);
 * roadmap 3.2's "shared by Phase 4's picker" is not yet true.
 */
export function stampKeyOnElement(
  value: string,
  attrs: { key?: StampAttrValue; target?: StampAttrValue }
): string | null {
  const target = attrs.target;
  if (typeof target === 'string' && target !== '' && sanitizeRefHref(target) === null) {
    return null;
  }
  return rebuildPhraseLeaf(value, attrs);
}

/**
 * Remove the authority `@key` and `@target` from a phrase-leaf element, leaving
 * all other attributes in place and the inner content byte-exact. The inverse of
 * {@link stampKeyOnElement}. Returns `null` on a malformed leaf.
 */
export function unstampKey(value: string): string | null {
  return rebuildPhraseLeaf(value, { key: null, target: null });
}
