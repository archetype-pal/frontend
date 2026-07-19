/**
 * msDesc fragment utilities (TEI descriptions roadmap 2.2b) — an exact,
 * dependency-free XML layer for the per-area TEI element fragments stored in
 * `MsDescArea.content`.
 *
 * This is deliberately NOT `lib/tei-prosemirror.ts`: that model serves inline
 * charter content and flattens block containers. Here the unit of work is a
 * whole element fragment (rooted at `msIdentifier`/`msContents`/`physDesc`/
 * `history`) and the contract is the roadmap's data-safety rule: a fragment is
 * either representable by the typed form model (`lib/msdesc-form.ts`) or it is
 * edited as source — never round-tripped through a lossy path. To honour that,
 * this module:
 *
 *   - parses a fragment with a small exact tokenizer that records source
 *     offsets, so a leaf element's inner XML (its `<p>`-sequence) can be
 *     extracted and replaced **byte-exactly** without disturbing siblings;
 *   - rejects (rather than drops) everything the model cannot carry —
 *     comments, processing instructions, CDATA, DOCTYPEs, unknown entities;
 *   - checks representability against a declared {@link ElementShape};
 *   - serializes canonically: attributes in the given (source) order, empty
 *     elements self-closed, element-only content block-indented two spaces,
 *     text / verbatim-XML content inline.
 *
 * Error/reason strings are diagnostic (for logs and dev surfaces), not
 * user-facing copy — the form UI renders its own localized messaging.
 */

// ── Parsed-tree types ───────────────────────────────────────────────────

export interface XmlAttribute {
  name: string;
  /** Decoded value (entities resolved). */
  value: string;
}

export interface XmlElementNode {
  kind: 'element';
  name: string;
  /** Attributes in source order. */
  attrs: XmlAttribute[];
  children: XmlNode[];
  selfClosing: boolean;
  /** Offset of `<` in the parsed source. */
  start: number;
  /** Offset just past the closing `>` in the parsed source. */
  end: number;
  /** Offsets of the element's inner content (equal when self-closing). */
  innerStart: number;
  innerEnd: number;
}

export interface XmlTextNode {
  kind: 'text';
  /** Decoded text (entities resolved). */
  text: string;
  start: number;
  end: number;
}

export type XmlNode = XmlElementNode | XmlTextNode;

export type FragmentParseResult =
  { ok: true; root: XmlElementNode; source: string } | { ok: false; error: string };

// ── Parser ──────────────────────────────────────────────────────────────

const NAME_START = /[A-Za-z_]/;
const NAME_CHAR = /[A-Za-z0-9._:-]/;

class FragmentParseError extends Error {}

interface ParserState {
  src: string;
  pos: number;
}

function parseError(message: string, pos: number): never {
  throw new FragmentParseError(`${message} (offset ${pos})`);
}

function skipWhitespace(p: ParserState): void {
  while (p.pos < p.src.length && /\s/.test(p.src[p.pos])) p.pos += 1;
}

function readName(p: ParserState): string {
  const start = p.pos;
  if (p.pos >= p.src.length || !NAME_START.test(p.src[p.pos])) {
    parseError('expected a name', p.pos);
  }
  p.pos += 1;
  while (p.pos < p.src.length && NAME_CHAR.test(p.src[p.pos])) p.pos += 1;
  return p.src.slice(start, p.pos);
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

/** Decode one entity starting at `&`; returns the decoded char + end offset. */
function decodeEntity(src: string, pos: number): { value: string; end: number } {
  const semi = src.indexOf(';', pos + 1);
  if (semi === -1 || semi - pos > 12) parseError('bare "&" is not a valid entity', pos);
  const body = src.slice(pos + 1, semi);
  if (body.startsWith('#')) {
    const isHex = body[1] === 'x' || body[1] === 'X';
    const digits = body.slice(isHex ? 2 : 1);
    if (!digits || !(isHex ? /^[0-9A-Fa-f]+$/ : /^[0-9]+$/).test(digits)) {
      parseError(`invalid character reference "&${body};"`, pos);
    }
    const code = Number.parseInt(digits, isHex ? 16 : 10);
    try {
      return { value: String.fromCodePoint(code), end: semi + 1 };
    } catch {
      parseError(`character reference out of range "&${body};"`, pos);
    }
  }
  const named = NAMED_ENTITIES[body];
  if (named === undefined) parseError(`unknown entity "&${body};"`, pos);
  return { value: named, end: semi + 1 };
}

/** Decode a raw run (text or attribute value) that contains no `<`. */
function decodeRun(src: string, start: number, end: number): string {
  let out = '';
  let pos = start;
  while (pos < end) {
    const amp = src.indexOf('&', pos);
    if (amp === -1 || amp >= end) {
      out += src.slice(pos, end);
      break;
    }
    out += src.slice(pos, amp);
    const entity = decodeEntity(src, amp);
    if (entity.end > end) parseError('entity crosses a value boundary', amp);
    out += entity.value;
    pos = entity.end;
  }
  return out;
}

function parseAttributes(p: ParserState, elementName: string): XmlAttribute[] {
  const attrs: XmlAttribute[] = [];
  const seen = new Set<string>();
  for (;;) {
    skipWhitespace(p);
    const ch = p.src[p.pos];
    if (ch === undefined) parseError(`unclosed tag <${elementName}>`, p.pos);
    if (ch === '>' || ch === '/') return attrs;
    const name = readName(p);
    if (seen.has(name)) parseError(`duplicate attribute "${name}" on <${elementName}>`, p.pos);
    seen.add(name);
    skipWhitespace(p);
    if (p.src[p.pos] !== '=') parseError(`attribute "${name}" is missing "="`, p.pos);
    p.pos += 1;
    skipWhitespace(p);
    const quote = p.src[p.pos];
    if (quote !== '"' && quote !== "'") {
      parseError(`attribute "${name}" value must be quoted`, p.pos);
    }
    p.pos += 1;
    const valueStart = p.pos;
    const valueEnd = p.src.indexOf(quote, valueStart);
    if (valueEnd === -1) parseError(`unterminated value for attribute "${name}"`, valueStart);
    const rawValue = p.src.slice(valueStart, valueEnd);
    if (rawValue.includes('<')) parseError(`"<" in value of attribute "${name}"`, valueStart);
    attrs.push({ name, value: decodeRun(p.src, valueStart, valueEnd) });
    p.pos = valueEnd + 1;
  }
}

function parseElement(p: ParserState): XmlElementNode {
  const start = p.pos;
  if (p.src[p.pos] !== '<') parseError('expected an element', p.pos);
  p.pos += 1;
  const next = p.src[p.pos];
  if (next === '!' || next === '?') {
    parseError('comments, CDATA, DOCTYPEs and processing instructions are not supported', start);
  }
  const name = readName(p);
  const attrs = parseAttributes(p, name);
  if (p.src[p.pos] === '/') {
    if (p.src[p.pos + 1] !== '>') parseError(`malformed self-closing tag <${name}>`, p.pos);
    p.pos += 2;
    return {
      kind: 'element',
      name,
      attrs,
      children: [],
      selfClosing: true,
      start,
      end: p.pos,
      innerStart: p.pos,
      innerEnd: p.pos,
    };
  }
  p.pos += 1; // consume '>'
  const innerStart = p.pos;
  const children: XmlNode[] = [];
  for (;;) {
    if (p.pos >= p.src.length) parseError(`unclosed element <${name}>`, start);
    if (p.src[p.pos] === '<') {
      if (p.src[p.pos + 1] === '/') {
        const innerEnd = p.pos;
        p.pos += 2;
        const closeName = readName(p);
        if (closeName !== name) {
          parseError(`mismatched closing tag </${closeName}> for <${name}>`, innerEnd);
        }
        skipWhitespace(p);
        if (p.src[p.pos] !== '>') parseError(`malformed closing tag </${name}>`, p.pos);
        p.pos += 1;
        return {
          kind: 'element',
          name,
          attrs,
          children,
          selfClosing: false,
          start,
          end: p.pos,
          innerStart,
          innerEnd,
        };
      }
      children.push(parseElement(p));
    } else {
      const textStart = p.pos;
      let textEnd = p.src.indexOf('<', textStart);
      if (textEnd === -1) textEnd = p.src.length;
      children.push({
        kind: 'text',
        text: decodeRun(p.src, textStart, textEnd),
        start: textStart,
        end: textEnd,
      });
      p.pos = textEnd;
    }
  }
}

/**
 * Parse a TEI element fragment (exactly one root element, optionally padded
 * with whitespace). Constructs the model cannot re-serialize losslessly
 * (comments, PIs, CDATA, DOCTYPEs, unknown entities) are parse errors — the
 * caller falls back to source editing rather than dropping them.
 */
export function parseFragment(input: string): FragmentParseResult {
  const source = input.trim();
  if (!source) return { ok: false, error: 'empty fragment' };
  try {
    const p: ParserState = { src: source, pos: 0 };
    const root = parseElement(p);
    skipWhitespace(p);
    if (p.pos !== source.length) parseError('content after the root element', p.pos);
    return { ok: true, root, source };
  } catch (error) {
    if (error instanceof FragmentParseError) return { ok: false, error: error.message };
    throw error;
  }
}

// ── Tree accessors ──────────────────────────────────────────────────────

/** The element children of `element` (text nodes skipped). */
export function childElements(element: XmlElementNode): XmlElementNode[] {
  return element.children.filter((c): c is XmlElementNode => c.kind === 'element');
}

/** True when `element` has a non-whitespace text child. */
export function hasNonWhitespaceText(element: XmlElementNode): boolean {
  return element.children.some((c) => c.kind === 'text' && c.text.trim() !== '');
}

/**
 * The decoded text content of a text-only element ('' when empty), or `null`
 * when the element has element children (i.e. is not a plain text leaf).
 */
export function elementText(element: XmlElementNode): string | null {
  if (childElements(element).length > 0) return null;
  return element.children.map((c) => (c.kind === 'text' ? c.text : '')).join('');
}

/** The decoded value of the named attribute, or undefined when absent. */
export function attrValue(element: XmlElementNode, name: string): string | undefined {
  return element.attrs.find((a) => a.name === name)?.value;
}

// ── Inner-XML extraction / replacement (the <p>-sequence contract) ─────

/** The element's inner XML, byte-exact from the parsed source. */
export function innerXml(source: string, element: XmlElementNode): string {
  if (element.selfClosing) return '';
  return source.slice(element.innerStart, element.innerEnd);
}

/**
 * Replace the element's inner XML in `source`, leaving every byte outside the
 * element's content span untouched. A self-closing element is expanded to an
 * open/close pair when given non-empty content.
 */
export function replaceInnerXml(source: string, element: XmlElementNode, inner: string): string {
  if (!element.selfClosing) {
    return source.slice(0, element.innerStart) + inner + source.slice(element.innerEnd);
  }
  if (inner === '') return source;
  const rawTag = source.slice(element.start, element.end);
  const openTag = rawTag.replace(/\s*\/>$/, '>');
  return (
    source.slice(0, element.start) +
    openTag +
    inner +
    `</${element.name}>` +
    source.slice(element.end)
  );
}

/**
 * Resolve a descendant by a path of child-element steps; a step is a name
 * (first match) or a `[name, index]` pair. Returns null when absent.
 */
export function resolvePath(
  root: XmlElementNode,
  path: ReadonlyArray<string | readonly [string, number]>
): XmlElementNode | null {
  let current = root;
  for (const step of path) {
    const [name, index] = typeof step === 'string' ? [step, 0] : step;
    const next = childElements(current).filter((c) => c.name === name)[index];
    if (!next) return null;
    current = next;
  }
  return current;
}

// ── Representability shapes ─────────────────────────────────────────────

/**
 * Content policy of a shape node:
 *   - `elements`: element-only content (whitespace between elements allowed);
 *   - `text`: text-only content (no element children);
 *   - `inner-xml`: a verbatim prose leaf — any inner content is representable
 *     because it is carried byte-exact, never reshaped.
 */
export type ShapeContent = 'elements' | 'text' | 'inner-xml';

export interface ElementShape {
  content: ShapeContent;
  /** Permitted attribute names (none when omitted). */
  attrs?: readonly string[];
  /** Permitted child elements by name (content 'elements' only). */
  children?: Readonly<Record<string, ElementShape>>;
}

export type ShapeResult = { ok: true } | { ok: false; reason: string };

/**
 * Check a parsed element against a declared shape. Anything outside the shape
 * — unknown elements, unknown attributes, text where none is modelled — makes
 * the fragment unrepresentable; nothing is ever skipped or dropped.
 */
export function checkShape(
  element: XmlElementNode,
  shape: ElementShape,
  path = `<${element.name}>`
): ShapeResult {
  const allowedAttrs = shape.attrs ?? [];
  for (const attr of element.attrs) {
    if (!allowedAttrs.includes(attr.name)) {
      return { ok: false, reason: `unknown attribute "${attr.name}" on ${path}` };
    }
  }
  if (shape.content === 'inner-xml') return { ok: true };
  if (shape.content === 'text') {
    if (childElements(element).length > 0) {
      return { ok: false, reason: `unexpected child element inside ${path}` };
    }
    return { ok: true };
  }
  if (hasNonWhitespaceText(element)) {
    return { ok: false, reason: `unexpected text content inside ${path}` };
  }
  const children = shape.children ?? {};
  for (const child of childElements(element)) {
    const childShape = children[child.name];
    if (!childShape) {
      return { ok: false, reason: `unknown element <${child.name}> inside ${path}` };
    }
    const result = checkShape(child, childShape, `${path} > <${child.name}>`);
    if (!result.ok) return result;
  }
  return { ok: true };
}

// ── Canonical serialization ─────────────────────────────────────────────

export interface BuildAttr {
  name: string;
  value: string;
}

export interface BuildElement {
  kind: 'element';
  name: string;
  attrs: BuildAttr[];
  children: BuildNode[];
}

export interface BuildText {
  kind: 'text';
  text: string;
}

/** Verbatim XML spliced into the output exactly as given. */
export interface BuildRaw {
  kind: 'raw';
  xml: string;
}

export type BuildNode = BuildElement | BuildText | BuildRaw;

/**
 * Build an element node; attributes are `[name, value]` pairs in canonical
 * order — pairs whose value is undefined are omitted (absent attribute).
 */
export function el(
  name: string,
  attrs: ReadonlyArray<readonly [string, string | undefined]> = [],
  children: BuildNode[] = []
): BuildElement {
  return {
    kind: 'element',
    name,
    attrs: attrs.flatMap(([n, v]) => (v === undefined ? [] : [{ name: n, value: v }])),
    children,
  };
}

export function text(value: string): BuildText {
  return { kind: 'text', text: value };
}

export function raw(xml: string): BuildRaw {
  return { kind: 'raw', xml };
}

export function escapeXmlText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function escapeXmlAttr(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
}

function serializeAttrs(attrs: BuildAttr[]): string {
  return attrs.map((a) => ` ${a.name}="${escapeXmlAttr(a.value)}"`).join('');
}

function serializeInline(node: BuildNode): string {
  if (node.kind === 'text') return escapeXmlText(node.text);
  if (node.kind === 'raw') return node.xml;
  const attrs = serializeAttrs(node.attrs);
  if (node.children.length === 0) return `<${node.name}${attrs}/>`;
  const inner = node.children.map(serializeInline).join('');
  return `<${node.name}${attrs}>${inner}</${node.name}>`;
}

function serializeElement(node: BuildElement, depth: number, indent: string): string {
  const pad = indent.repeat(depth);
  const attrs = serializeAttrs(node.attrs);
  if (node.children.length === 0) return `${pad}<${node.name}${attrs}/>`;
  if (node.children.every((c) => c.kind === 'element')) {
    const body = node.children
      .map((c) => serializeElement(c as BuildElement, depth + 1, indent))
      .join('\n');
    return `${pad}<${node.name}${attrs}>\n${body}\n${pad}</${node.name}>`;
  }
  const inner = node.children.map(serializeInline).join('');
  return `${pad}<${node.name}${attrs}>${inner}</${node.name}>`;
}

/**
 * Canonical pretty-printer: element-only content is block-indented (two
 * spaces per level), content with text or verbatim XML is inline, empty
 * elements self-close. No trailing newline.
 */
export function serializeFragment(root: BuildElement, indent = '  '): string {
  return serializeElement(root, 0, indent);
}

function elementToBuild(element: XmlElementNode, source: string): BuildElement {
  const attrs = element.attrs.map((a) => [a.name, a.value] as const);
  if (hasNonWhitespaceText(element)) {
    // Mixed / textual content: carried verbatim so prose is never reshaped.
    return el(element.name, attrs, [raw(innerXml(source, element))]);
  }
  const children = childElements(element).map((c) => elementToBuild(c, source));
  return el(element.name, attrs, children);
}

export type CanonicalizeResult = { ok: true; xml: string } | { ok: false; error: string };

/**
 * Parse + re-serialize a fragment canonically: attribute order preserved from
 * source, empty elements self-closed, container indentation normalized, and
 * any element carrying text kept byte-verbatim inside. Idempotent.
 */
export function canonicalizeFragment(input: string): CanonicalizeResult {
  const parsed = parseFragment(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  return { ok: true, xml: serializeFragment(elementToBuild(parsed.root, parsed.source)) };
}
