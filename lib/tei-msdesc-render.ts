/**
 * Block-aware msDesc renderer (TEI descriptions roadmap Phase 5.1 + the 4.4
 * render-time key fallback).
 *
 * Renders a stored `MsDescArea` TEI fragment (rooted at its area element —
 * `msIdentifier` / `msContents` / `physDesc` / `history`) as the PO's
 * structured field display: labelled rows for attribute fields
 * ("Form: codex", "Support: parchment"), dimensions as "103 × 75 mm",
 * extent measure sequences joined ("i + 1 + 228 (231) + 2 + i fol."),
 * section headings per container (Layout / Hands / Decoration / …), and
 * prose `<p>` leaves as paragraphs with inline TEI styled through the same
 * `tei-el tei-el-{name}` class hooks the charter viewer's `.tei-rich` CSS
 * uses (see `components/text/image-text-viewer.tsx` + `app/globals.css`).
 *
 * `<ref>` and `@key`/`@target`-bearing entity elements render as `<a>` per
 * roadmap 4.4: `@target` verbatim when present (http(s) or site-relative
 * only — never `javascript:` etc., defense in depth even though consumers
 * sanitize), else a `person_{id}` key falls back to `/scribes/{id}`, else a
 * plain `<span>` with an "unresolved reference" title tooltip.
 *
 * The renderer never throws on arbitrary well-formed fragments and never
 * drops text content: unknown elements render as generic labelled rows.
 *
 * Output is NOT sanitized here — consumers MUST pipe it through
 * `sanitizeHtml(html, { allowDataAttr: true })` (`lib/sanitize-html.ts`),
 * mirroring `image-text-viewer.tsx`. Only tags/attributes from that
 * allowlist are emitted: `div span p h4 h5 br a sup sub em strong` with
 * `class href target rel title` plus `data-tei-label` (which is why
 * `allowDataAttr: true` is required for the hover-pill labels to survive).
 *
 * Section/field labels resolve through an optional caller-supplied translate
 * function over next-intl `backoffice`-namespace keys
 * (`msdesc.areas.*`, `msdesc.render.*`, `msdesc.vocab.*` — see
 * `messages/en.json` / `messages/fr.json`); without one, labels default to
 * the key's last segment (so vocabulary values fall back to their canonical
 * TEI form, e.g. `perg`).
 */

import {
  MSDESC_AREAS,
  MSDESC_VOCABS,
  msdescAreaLabelKey,
  msdescVocabLabelKey,
} from '@/lib/msdesc-vocab';
import type { MsDescAreaId, MsDescVocabId, MsDescVocabValue } from '@/lib/msdesc-vocab';

// ── Public API ──────────────────────────────────────────────────────────

/** Translate a `backoffice`-namespace key (e.g. `useTranslations('backoffice')`). */
export type MsDescTranslate = (key: string) => string;

export interface RenderMsDescAreaOptions {
  /**
   * Label translator for section headings, field labels, vocabulary-value
   * glosses and the unresolved-reference tooltip. Defaults to the key's last
   * segment (`msdesc.render.fields.form` → "form").
   */
  t?: MsDescTranslate;
}

/**
 * Site route for a render-time `@key` fallback (roadmap 4.4): `person_{id}`
 * → `/scribes/{id}`. Other prefixes (`work_`, `place_`, …) have no
 * client-derivable route and return `null` (rendered as plain text + tooltip).
 */
export function resolveRefKeyHref(key: string): string | null {
  const match = /^person_(\d+)$/.exec(key.trim());
  return match ? `/scribes/${match[1]}` : null;
}

/**
 * Return `href` when it is safe to emit (http(s) absolute, or site-relative
 * starting with `/` or `#`), else `null`. Refuses `javascript:`/`data:`/…
 * schemes and protocol-relative `//host` URLs — defense in depth on top of
 * the consumer-side sanitize pass.
 */
export function sanitizeRefHref(raw: string): string | null {
  const href = raw.trim();
  if (!href) return null;
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('//')) return null;
  if (href.startsWith('/') || href.startsWith('#')) return href;
  return null;
}

/** Render one stored msDesc area fragment as structured-field HTML. */
export function renderMsDescArea(
  area: MsDescAreaId,
  fragment: string,
  options: RenderMsDescAreaOptions = {}
): string {
  const t = options.t ?? defaultTranslate;
  const nodes = parseXmlFragment(fragment);
  const meaningful = nodes.filter((node) => node.kind === 'element' || node.raw.trim().length > 0);
  if (meaningful.length === 0) return '';

  // A fragment rooted at the area element contributes its children; anything
  // else (headless or foreign-rooted) renders as-is under the area wrapper.
  const single = meaningful.length === 1 ? meaningful[0] : null;
  const body =
    single && single.kind === 'element' && single.name === area
      ? renderBlockNodes(single.children, t)
      : renderBlockNodes(meaningful, t);

  const heading = `<h4 class="msdesc-heading">${escapeHtml(t(msdescAreaLabelKey(area)))}</h4>`;
  return `<div class="msdesc-area msdesc-area-${area}">${heading}${body}</div>`;
}

// ── Label keys ──────────────────────────────────────────────────────────

const fieldKey = (name: string): string => `msdesc.render.fields.${name}`;
const sectionKey = (name: string): string => `msdesc.render.sections.${name}`;
const UNRESOLVED_REF_KEY = 'msdesc.render.unresolvedRef';

/** Default label resolution: the key's last segment. */
function defaultTranslate(key: string): string {
  return key.slice(key.lastIndexOf('.') + 1);
}

// ── Element classification ──────────────────────────────────────────────

/** Containers that render a heading (nested sections use `<h5>`). */
const SECTION_ELEMENTS = new Set([
  'layoutDesc',
  'handDesc',
  'decoDesc',
  'bindingDesc',
  'additions',
  'origin',
  'msItem',
]);

/**
 * Transparent containers: no heading of their own — their known attributes
 * surface as field rows and their children render in block mode.
 */
const CONTAINER_ELEMENTS = new Set([
  'objectDesc',
  'supportDesc',
  'support',
  'layout',
  'handNote',
  'decoNote',
  'binding',
  'availability',
]);

/** Elements whose `@notBefore`/`@notAfter`/`@when` render as a Date row. */
const DATE_RANGE_ELEMENTS = new Set(['binding']);

/**
 * Known leaf fields — rendered as a labelled row (or a labelled block when
 * they hold `<p>` prose). Labels come from `msdesc.render.fields.{name}`.
 */
const FIELD_ELEMENTS = new Set([
  'country',
  'region',
  'settlement',
  'institution',
  'repository',
  'idno',
  'msName',
  'altIdentifier',
  'material',
  'measure',
  'foliation',
  'collation',
  'catchwords',
  'signatures',
  'condition',
  'accMat',
  'summary',
  'textLang',
  'locus',
  'author',
  'title',
  'rubric',
  'incipit',
  'explicit',
  'finalRubric',
  'note',
  'bibl',
  'origDate',
  'origPlace',
  'provenance',
  'acquisition',
]);

/** `idno/@type` values with a dedicated field label. */
const IDNO_TYPE_LABELS = new Set(['shelfmark', 'msID', 'collection', 'catalogue']);

interface AttrFieldSpec {
  attr: string;
  labelKey: string;
  vocab?: MsDescVocabId;
}

/** Attributes surfaced as labelled field rows, per element. */
const ATTR_FIELD_SPECS: Record<string, AttrFieldSpec[]> = {
  objectDesc: [{ attr: 'form', labelKey: fieldKey('form'), vocab: 'form' }],
  supportDesc: [{ attr: 'material', labelKey: fieldKey('support'), vocab: 'material' }],
  layout: [
    { attr: 'columns', labelKey: fieldKey('columns') },
    { attr: 'writtenLines', labelKey: fieldKey('writtenLines') },
    { attr: 'rulingMedium', labelKey: fieldKey('rulingMedium'), vocab: 'rulingMedium' },
    { attr: 'topLine', labelKey: fieldKey('topLine'), vocab: 'topLine' },
  ],
  handDesc: [{ attr: 'hands', labelKey: fieldKey('hands') }],
  handNote: [
    { attr: 'script', labelKey: fieldKey('script'), vocab: 'script' },
    { attr: 'execution', labelKey: fieldKey('execution'), vocab: 'execution' },
    { attr: 'scope', labelKey: fieldKey('scope') },
    { attr: 'medium', labelKey: fieldKey('medium') },
  ],
  decoNote: [{ attr: 'type', labelKey: fieldKey('type'), vocab: 'decoType' }],
  availability: [{ attr: 'status', labelKey: fieldKey('status'), vocab: 'availabilityStatus' }],
};

// ── Block rendering ─────────────────────────────────────────────────────

// "Never throws on arbitrary well-formed input" includes pathological nesting:
// past this depth both dispatchers stop recursing and fall back to the node's
// (iteratively collected) text content, so no content is ever dropped.
const MAX_RENDER_DEPTH = 64;
let renderDepth = 0;

function renderBlockNodes(nodes: XmlNode[], t: MsDescTranslate): string {
  return nodes.map((node) => renderBlockNode(node, t)).join('');
}

function renderBlockNode(node: XmlNode, t: MsDescTranslate): string {
  if (node.kind === 'text') {
    const text = emitText(node.raw).trim();
    return text ? `<p class="msdesc-text">${text}</p>` : '';
  }
  if (renderDepth >= MAX_RENDER_DEPTH) {
    const text = escapeHtml(collapseWs(textContent(node)).trim());
    return text ? `<p class="msdesc-text">${text}</p>` : '';
  }
  renderDepth++;
  try {
    return renderElementNode(node, t);
  } finally {
    renderDepth--;
  }
}

function renderElementNode(node: XmlElementNode, t: MsDescTranslate): string {
  const { name } = node;
  if (name === 'p') return renderParagraph(node, t);
  if (name === 'lb') return '<br>';
  if (name === 'extent') return renderExtent(node, t);
  if (name === 'dimensions') return renderDimensions(node, t);
  if (SECTION_ELEMENTS.has(name) || (MSDESC_AREAS as readonly string[]).includes(name)) {
    return renderSection(node, t);
  }
  if (CONTAINER_ELEMENTS.has(name)) return renderContainer(node, t);
  return renderField(node, t);
}

function renderParagraph(el: XmlElementNode, t: MsDescTranslate): string {
  const inner = renderInlineNodes(el.children, t).trim();
  return inner ? `<p>${inner}</p>` : '';
}

function renderSection(el: XmlElementNode, t: MsDescTranslate): string {
  const key = SECTION_ELEMENTS.has(el.name)
    ? sectionKey(el.name)
    : msdescAreaLabelKey(el.name as MsDescAreaId);
  const n = el.attrs['n'];
  const heading = escapeHtml(t(key) + (n ? ` ${n}` : ''));
  const body = renderAttrRows(el, t) + renderBlockNodes(el.children, t);
  return (
    `<div class="msdesc-section msdesc-section-${escapeHtml(el.name)}">` +
    `<h5 class="msdesc-heading">${heading}</h5>${body}</div>`
  );
}

function renderContainer(el: XmlElementNode, t: MsDescTranslate): string {
  const body = renderAttrRows(el, t) + renderBlockNodes(el.children, t);
  return `<div class="msdesc-entry msdesc-entry-${escapeHtml(el.name)}">${body}</div>`;
}

function renderAttrRows(el: XmlElementNode, t: MsDescTranslate): string {
  const rows: string[] = [];
  for (const spec of ATTR_FIELD_SPECS[el.name] ?? []) {
    const raw = el.attrs[spec.attr];
    if (!raw) continue;
    const display = spec.vocab ? vocabValueLabel(t, spec.vocab, raw) : raw;
    rows.push(fieldRow(escapeHtml(t(spec.labelKey)), escapeHtml(display)));
  }
  if (DATE_RANGE_ELEMENTS.has(el.name)) {
    const range = dateRangeText(el.attrs);
    if (range) rows.push(fieldRow(escapeHtml(t(fieldKey('date'))), escapeHtml(range)));
  }
  return rows.join('');
}

function renderField(el: XmlElementNode, t: MsDescTranslate): string {
  const known = FIELD_ELEMENTS.has(el.name);
  const label = known ? escapeHtml(t(fieldLabelKey(el))) : escapeHtml(el.name);
  const unknownClass = known ? '' : ' msdesc-field-unknown';

  if (hasBlockContent(el)) {
    const body = renderBlockNodes(el.children, t);
    return (
      `<div class="msdesc-field msdesc-field-block${unknownClass}">` +
      `<div class="msdesc-field-label">${label}:</div>` +
      `<div class="msdesc-field-value">${body}</div></div>`
    );
  }

  let value = renderInlineNodes(el.children, t).trim();
  if (!value) value = escapeHtml(fieldFallbackText(el));
  if (isLinkBearing(el)) {
    value = renderLinkEl(el, value || escapeHtml(el.attrs['key'] ?? el.attrs['target'] ?? ''), t);
  }
  if (!value) return '';
  return fieldRow(label, value, unknownClass);
}

/** Attribute-derived display for fields whose element content is empty. */
function fieldFallbackText(el: XmlElementNode): string {
  if (el.name === 'origDate') return dateRangeText(el.attrs);
  if (el.name === 'textLang') return el.attrs['mainLang'] ?? '';
  if (el.name === 'measure') return el.attrs['quantity'] ?? '';
  return '';
}

function fieldLabelKey(el: XmlElementNode): string {
  if (el.name === 'idno') {
    const type = el.attrs['type'];
    if (type && IDNO_TYPE_LABELS.has(type)) return fieldKey(type);
  }
  return fieldKey(el.name);
}

function fieldRow(labelHtml: string, valueHtml: string, extraClass = ''): string {
  return (
    `<div class="msdesc-field${extraClass}">` +
    `<span class="msdesc-field-label">${labelHtml}:</span> ` +
    `<span class="msdesc-field-value">${valueHtml}</span></div>`
  );
}

/** True when the element carries block structure (prose `<p>`s or containers). */
function hasBlockContent(el: XmlElementNode): boolean {
  return el.children.some(
    (child) =>
      child.kind === 'element' &&
      (child.name === 'p' ||
        child.name === 'extent' ||
        child.name === 'dimensions' ||
        SECTION_ELEMENTS.has(child.name) ||
        CONTAINER_ELEMENTS.has(child.name))
  );
}

// ── extent / dimensions ─────────────────────────────────────────────────

/**
 * `<extent>`: `<measure>` texts join with " + " into one Extent row
 * ("i + 1 + 228 (231) + 2 + i fol."); each `<dimensions>` gets its own row;
 * stray text / other inline children are appended so nothing is dropped.
 */
function renderExtent(el: XmlElementNode, t: MsDescTranslate): string {
  const measures: string[] = [];
  const dimensionRows: string[] = [];
  const restInline: string[] = [];
  for (const child of el.children) {
    if (child.kind === 'element' && child.name === 'measure') {
      const text =
        renderInlineNodes(child.children, t).trim() || escapeHtml(child.attrs['quantity'] ?? '');
      if (text) measures.push(text);
    } else if (child.kind === 'element' && child.name === 'dimensions') {
      dimensionRows.push(renderDimensions(child, t));
    } else {
      restInline.push(child.kind === 'text' ? emitText(child.raw) : renderInlineNode(child, t));
    }
  }
  const rest = restInline.join('').trim();
  const value = [measures.join(' + '), rest].filter(Boolean).join(' ');
  const extentRow = value ? fieldRow(escapeHtml(t(fieldKey('extent'))), value) : '';
  return extentRow + dimensionRows.join('');
}

/** `<dimensions type="leaf" unit="mm">` → "Dimensions (leaf): 103 × 75 mm". */
function renderDimensions(el: XmlElementNode, t: MsDescTranslate): string {
  const DIM_NAMES = ['height', 'width', 'depth'];
  const type = el.attrs['type'];
  const unit = el.attrs['unit'];
  const byName = (name: string): string =>
    el.children
      .filter((child): child is XmlElementNode => child.kind === 'element' && child.name === name)
      .map((child) => collapseWs(textContent(child)).trim())
      .filter(Boolean)
      .join(' ');
  const values = DIM_NAMES.map(byName).filter(Boolean);
  // Anything besides the named dimension children (stray text, `<dim>`, …)
  // is appended after the formatted value so no content is dropped.
  const rest = el.children
    .filter((child) => !(child.kind === 'element' && DIM_NAMES.includes(child.name)))
    .map((child) => (child.kind === 'text' ? emitText(child.raw) : renderInlineNode(child, t)))
    .join('')
    .trim();
  const label = escapeHtml(t(fieldKey('dimensions'))) + (type ? ` (${escapeHtml(type)})` : '');
  const joined = values.map(escapeHtml).join(' × ');
  const withUnit = joined && unit ? `${joined} ${escapeHtml(unit)}` : joined;
  const value = [withUnit, rest].filter(Boolean).join(' ');
  return value ? fieldRow(label, value) : '';
}

// ── Inline rendering (prose leaves + phrase content) ────────────────────

/** `hi/@rend` values with a semantic HTML mapping (all allowlist tags). */
const HI_REND_TAGS: Record<string, string> = {
  superscript: 'sup',
  subscript: 'sub',
  italic: 'em',
  bold: 'strong',
};

function renderInlineNodes(nodes: XmlNode[], t: MsDescTranslate): string {
  return nodes.map((node) => renderInlineNode(node, t)).join('');
}

function renderInlineNode(node: XmlNode, t: MsDescTranslate): string {
  if (node.kind === 'text') return emitText(node.raw);
  if (node.name === 'lb') return '<br>';
  if (renderDepth >= MAX_RENDER_DEPTH) return escapeHtml(textContent(node));
  renderDepth++;
  try {
    return renderInlineElement(node, t);
  } finally {
    renderDepth--;
  }
}

function renderInlineElement(node: XmlElementNode, t: MsDescTranslate): string {
  const inner = renderInlineNodes(node.children, t);
  if (node.name === 'hi') {
    const tag = HI_REND_TAGS[node.attrs['rend'] ?? ''];
    if (tag) return `<${tag}>${inner}</${tag}>`;
  }
  if (isLinkBearing(node)) return renderLinkEl(node, inner, t);
  return (
    `<span class="tei-el tei-el-${escapeHtml(node.name)}"` +
    ` data-tei-label="${escapeHtml(node.attrs['type'] ?? node.name)}">${inner}</span>`
  );
}

// ── `<ref>` / `@key` link rendering (roadmap 4.4) ───────────────────────

function isLinkBearing(el: XmlElementNode): boolean {
  return el.name === 'ref' || el.attrs['key'] !== undefined || el.attrs['target'] !== undefined;
}

function renderLinkEl(el: XmlElementNode, innerHtml: string, t: MsDescTranslate): string {
  const baseClass = `tei-el tei-el-${escapeHtml(el.name)}`;
  const labelAttr = `data-tei-label="${escapeHtml(el.attrs['type'] ?? el.name)}"`;
  const target = el.attrs['target'];
  const key = el.attrs['key'];
  const href =
    (target !== undefined ? sanitizeRefHref(target) : null) ??
    (key ? resolveRefKeyHref(key) : null);
  if (href) {
    const external = /^https?:/i.test(href);
    const externalAttrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${escapeHtml(href)}" class="${baseClass}" ${labelAttr}${externalAttrs}>${innerHtml}</a>`;
  }
  const tooltip = escapeHtml(t(UNRESOLVED_REF_KEY));
  return `<span class="${baseClass} msdesc-unresolved" title="${tooltip}" ${labelAttr}>${innerHtml}</span>`;
}

// ── Vocabulary / date helpers ───────────────────────────────────────────

/** Gloss a closed-vocab attribute value via its i18n key; pass through open values. */
function vocabValueLabel<V extends MsDescVocabId>(
  t: MsDescTranslate,
  vocab: V,
  raw: string
): string {
  const values = MSDESC_VOCABS[vocab] as readonly string[];
  if (!values.includes(raw)) return raw;
  return t(msdescVocabLabelKey(vocab, raw as MsDescVocabValue<V>));
}

/** "@when" verbatim, else "notBefore–notAfter" (one side may be open). */
function dateRangeText(attrs: Record<string, string>): string {
  if (attrs['when']) return attrs['when'];
  const notBefore = attrs['notBefore'];
  const notAfter = attrs['notAfter'];
  if (!notBefore && !notAfter) return '';
  return `${notBefore ?? ''}–${notAfter ?? ''}`;
}

// ── Minimal tolerant XML parsing (never throws) ─────────────────────────

interface XmlElementNode {
  kind: 'element';
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
}

interface XmlTextNode {
  kind: 'text';
  /** Raw source text — entity references preserved for verbatim re-emission. */
  raw: string;
}

type XmlNode = XmlElementNode | XmlTextNode;

// Attribute values are quoted, so `<`/`>` inside quotes are tolerated; the
// trailing-slash group is kept out of the (lazy) attribute body.
const TAG_RE = /<(\/?)([A-Za-z_][\w:.-]*)((?:"[^"]*"|'[^']*'|[^<>"'])*?)\s*(\/?)>/g;
const ATTR_RE = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

function parseXmlFragment(source: string): XmlNode[] {
  // Comments/PIs/doctype cannot round-trip the editor model (findings §8.1)
  // and have no display value — strip them; unwrap CDATA into escaped text.
  const cleaned = source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, inner: string) => escapeHtml(inner))
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '');

  const roots: XmlNode[] = [];
  const stack: XmlElementNode[] = [];
  const append = (node: XmlNode): void => {
    (stack.length > 0 ? stack[stack.length - 1].children : roots).push(node);
  };

  TAG_RE.lastIndex = 0;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_RE.exec(cleaned)) !== null) {
    if (match.index > cursor) append({ kind: 'text', raw: cleaned.slice(cursor, match.index) });
    cursor = TAG_RE.lastIndex;
    const [, closing, name, attrString, selfClosing] = match;
    if (closing) {
      // Tolerant close: pop to the nearest matching open element; ignore strays.
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].name === name) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    const el: XmlElementNode = {
      kind: 'element',
      name,
      attrs: parseAttrs(attrString),
      children: [],
    };
    append(el);
    if (!selfClosing) stack.push(el);
  }
  if (cursor < cleaned.length) append({ kind: 'text', raw: cleaned.slice(cursor) });
  return roots;
}

function parseAttrs(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTR_RE.exec(attrString)) !== null) {
    attrs[match[1]] = decodeEntities(match[2] ?? match[3] ?? '');
  }
  return attrs;
}

/** Decoded, concatenated descendant text (for value formatting, not re-emission). */
// Iterative on purpose: this is the depth-cap fallback for pathological nesting,
// so it must not itself recurse.
function textContent(el: XmlElementNode): string {
  const parts: string[] = [];
  const stack: XmlNode[] = [...el.children].reverse();
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.kind === 'text') parts.push(decodeEntities(node.raw));
    else for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]);
  }
  return parts.join('');
}

function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (full, body: string) => {
    if (body.startsWith('#')) {
      const hex = body[1] === 'x' || body[1] === 'X';
      const code = Number.parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : full;
    }
    const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    return named[body.toLowerCase()] ?? full;
  });
}

/**
 * Emit a raw (still entity-encoded) text node: collapse pretty-print
 * whitespace and neutralize stray angle brackets (real tags were already
 * consumed by the tokenizer, so any `<` left in text is malformed input).
 */
function emitText(raw: string): string {
  return collapseWs(raw).replace(/</g, '&lt;');
}

function collapseWs(text: string): string {
  return text.replace(/\s+/g, ' ');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
