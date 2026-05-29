/**
 * TEI XML ⇄ ProseMirror document model (Phase H.7 core).
 *
 * The TEI here has nested inline elements — including *nested same-type*
 * `<seg>` (an `address` clause containing an `intitulatio` clause). ProseMirror
 * marks are flat and can't nest the same type, so each text run instead carries
 * its full ancestor-element **stack** as a single `tei` mark. Serialization
 * walks the runs and diffs consecutive stacks to open/close tags, which
 * reconstructs arbitrary nesting. Per-instance `id`s distinguish two sibling
 * elements with identical attributes from one continued element.
 *
 * These functions are pure and mutually inverse (canonical round-trip — entity
 * spelling is normalised). They're the foundation the TipTap editor builds on;
 * a round-trip gate (docToTei(teiToDoc(x)) === x) keeps Rich mode from ever
 * losing data on documents it can't represent.
 */

export interface StackEntry {
  el: string;
  attrs: Record<string, string>;
  id: number;
}

type TeiMark = { type: 'tei'; attrs: { stack: StackEntry[] } };

export interface PMTextNode {
  type: 'text';
  text: string;
  marks?: TeiMark[];
}

// An element with no children (e.g. a pasted `<a name="…"></a>` anchor) can't
// be an ancestor of any text run, so it's kept as an inline leaf carrying its
// own element plus its ancestor stack.
export interface PMEmptyNode {
  type: 'teiEmpty';
  attrs: { el: string; elAttrs: Record<string, string>; selfClose: boolean };
  marks?: TeiMark[];
}

export type PMInline = PMTextNode | PMEmptyNode;

export interface PMParagraph {
  type: 'paragraph';
  attrs: { pAttrs: Record<string, string> };
  content: PMInline[];
}

export interface PMDoc {
  type: 'doc';
  content: PMParagraph[];
}

// ---------------------------------------------------------------------------
// Tokeniser
// ---------------------------------------------------------------------------

const TAG_RE =
  /<(\/?)([a-zA-Z][\w:.-]*)((?:\s+[\w:.-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>/g;
const ATTR_RE = /([\w:.-]+)\s*=\s*"([^"]*)"|([\w:.-]+)\s*=\s*'([^']*)'/g;

type Token =
  | { kind: 'open'; el: string; attrs: Record<string, string>; selfClose: boolean }
  | { kind: 'close'; el: string }
  | { kind: 'text'; text: string };

function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (whole, body: string) => {
    switch (body) {
      case 'amp':
        return '&';
      case 'lt':
        return '<';
      case 'gt':
        return '>';
      case 'quot':
        return '"';
      case 'apos':
        return "'";
      default:
        if (body[0] === '#') {
          const code =
            body[1] === 'x' || body[1] === 'X'
              ? parseInt(body.slice(2), 16)
              : parseInt(body.slice(1), 10);
          return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
        }
        return whole;
    }
  });
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(value: string): string {
  // Mirrors the backend's html.escape(quote=True), which produced the stored
  // TEI — so attribute values round-trip (incl. &#x27; in pasted style attrs).
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let m: RegExpExecArray | null;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(raw)) !== null) {
    if (m[1] !== undefined) attrs[m[1]] = decodeEntities(m[2]);
    else attrs[m[3]] = decodeEntities(m[4]);
  }
  return attrs;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(input)) !== null) {
    if (m.index > last) {
      tokens.push({ kind: 'text', text: decodeEntities(input.slice(last, m.index)) });
    }
    const [, slash, el, attrStr, selfClose] = m;
    if (slash) tokens.push({ kind: 'close', el });
    else tokens.push({ kind: 'open', el, attrs: parseAttrs(attrStr), selfClose: !!selfClose });
    last = m.index + m[0].length;
  }
  if (last < input.length) {
    tokens.push({ kind: 'text', text: decodeEntities(input.slice(last)) });
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// TEI → ProseMirror doc
// ---------------------------------------------------------------------------

function snapshotMark(stack: StackEntry[]): TeiMark[] | undefined {
  if (stack.length === 0) return undefined;
  return [{ type: 'tei', attrs: { stack: stack.map((e) => ({ ...e, attrs: { ...e.attrs } })) } }];
}

export function teiToDoc(tei: string): PMDoc {
  const tokens = tokenize(tei || '');
  const paragraphs: PMParagraph[] = [];

  let runs: PMInline[] = [];
  let stack: (StackEntry & { emitAtOpen: number })[] = [];
  let idCounter = 0;
  let emitCount = 0;
  let inParagraph = false;
  let pAttrs: Record<string, string> = {};

  const flushParagraph = () => {
    paragraphs.push({ type: 'paragraph', attrs: { pAttrs }, content: runs });
    runs = [];
    stack = [];
    pAttrs = {};
  };

  for (const token of tokens) {
    if (token.kind === 'open' && token.el === 'p') {
      if (inParagraph) flushParagraph();
      inParagraph = true;
      runs = [];
      stack = [];
      pAttrs = token.attrs;
      continue;
    }
    if (token.kind === 'close' && token.el === 'p') {
      flushParagraph();
      inParagraph = false;
      continue;
    }
    if (token.kind === 'open') {
      if (token.selfClose) {
        // Void element — a leaf with the current ancestor stack.
        runs.push({
          type: 'teiEmpty',
          attrs: { el: token.el, elAttrs: token.attrs, selfClose: true },
          marks: snapshotMark(stack),
        });
        emitCount++;
      } else {
        stack.push({ el: token.el, attrs: token.attrs, id: ++idCounter, emitAtOpen: emitCount });
      }
      continue;
    }
    if (token.kind === 'close') {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].el === token.el) {
          const [removed] = stack.splice(i, 1);
          if (emitCount === removed.emitAtOpen) {
            // Nothing was emitted while it was open → a childless element.
            runs.push({
              type: 'teiEmpty',
              attrs: { el: removed.el, elAttrs: removed.attrs, selfClose: false },
              marks: snapshotMark(stack),
            });
            emitCount++;
          }
          break;
        }
      }
      continue;
    }
    // text
    if (token.text.length === 0) continue;
    const node: PMTextNode = { type: 'text', text: token.text };
    const mark = snapshotMark(stack);
    if (mark) node.marks = mark;
    runs.push(node);
    emitCount++;
  }

  if (inParagraph || runs.length > 0) flushParagraph();
  return { type: 'doc', content: paragraphs };
}

// ---------------------------------------------------------------------------
// ProseMirror doc → TEI XML
// ---------------------------------------------------------------------------

function renderOpenTag(entry: StackEntry): string {
  const attrs = Object.entries(entry.attrs)
    .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
    .join('');
  return `<${entry.el}${attrs}>`;
}

function stackOf(node: PMInline): StackEntry[] {
  return node.marks?.find((m) => m.type === 'tei')?.attrs.stack ?? [];
}

function commonPrefix(a: StackEntry[], b: StackEntry[]): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i].id === b[i].id) i++;
  return i;
}

export function docToTei(doc: PMDoc): string {
  const out: string[] = [];
  for (const para of doc.content) {
    const pAttrs = Object.entries(para.attrs?.pAttrs ?? {})
      .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
      .join('');
    out.push(`<p${pAttrs}>`);
    let open: StackEntry[] = [];
    for (const node of para.content ?? []) {
      const next = stackOf(node);
      const common = commonPrefix(open, next);
      for (let i = open.length - 1; i >= common; i--) out.push(`</${open[i].el}>`);
      for (let i = common; i < next.length; i++) out.push(renderOpenTag(next[i]));
      if (node.type === 'text') {
        out.push(escapeText(node.text));
      } else if (node.type === 'teiEmpty' && node.attrs?.elAttrs) {
        const attrs = Object.entries(node.attrs.elAttrs)
          .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
          .join('');
        out.push(
          node.attrs.selfClose
            ? `<${node.attrs.el}${attrs}/>`
            : `<${node.attrs.el}${attrs}></${node.attrs.el}>`
        );
      }
      // Any other node type (defensively — the editor schema forbids them) is
      // skipped rather than crashing on a missing `elAttrs`.
      open = next;
    }
    for (let i = open.length - 1; i >= 0; i--) out.push(`</${open[i].el}>`);
    out.push('</p>');
  }
  return out.join('');
}
