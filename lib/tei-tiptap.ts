/**
 * TipTap schema extensions for the rendered TEI editor (Phase H.7, step 2).
 *
 * These mirror the doc model in `tei-prosemirror.ts`: a `tei` mark holds a
 * run's ancestor-element stack (rendered as nested styled spans), a `teiEmpty`
 * inline atom represents childless/void elements, and a global `pAttrs`
 * attribute preserves `<p>` attributes. Content is loaded as ProseMirror JSON
 * (via teiToDoc) and saved via docToTei(getJSON()) — never through HTML — so
 * parseHTML is intentionally a no-op.
 */

import { Extension, Mark, Node, type Editor } from '@tiptap/react';

import type { StackEntry } from '@/lib/tei-prosemirror';

/**
 * Reader-friendly name for a marked element, shown as the always-styled hover
 * label. Entities read by role ("Person"/"Place"); clauses read by their @type
 * (e.g. "Salutation"); anything else falls back to the element (with @type).
 */
export function teiElementLabel(el: string, type?: string): string {
  const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  switch (el) {
    case 'persName':
      return 'Person';
    case 'placeName':
      return 'Place';
    case 'ex':
      return 'Expansion';
    case 'supplied':
      return 'Supplied';
    case 'seg':
      return type ? cap(type) : 'Clause';
    default:
      return type ? `${el}: ${type}` : el;
  }
}

export const TeiMark = Mark.create({
  name: 'tei',

  addAttributes() {
    return {
      // The full ancestor element stack for the run. Kept in the document
      // model/JSON, not emitted as a single DOM attribute.
      stack: { default: [] as StackEntry[], rendered: false },
    };
  },

  parseHTML() {
    return [];
  },

  renderHTML({ mark }) {
    const stack = (mark.attrs.stack as StackEntry[]) ?? [];
    if (stack.length === 0) return ['span', {}, 0];
    // Build nested spans inside-out so the run's text sits in the deepest hole.
    let spec: unknown = 0;
    for (let i = stack.length - 1; i >= 0; i--) {
      const entry = stack[i];
      const type = entry.attrs?.type;
      const label = teiElementLabel(entry.el, type);
      const full = type ? `${entry.el}: ${type}` : entry.el;
      spec = [
        'span',
        {
          // tei-el-<element> drives the category colour; data-tei-type lets the
          // styling (and future theming) distinguish clause types.
          class: `tei-el tei-el-${entry.el}`,
          'data-tei-el': entry.el,
          ...(type ? { 'data-tei-type': type } : {}),
          'data-tei-label': label,
          title: full,
        },
        spec,
      ];
    }
    return spec as ['span', Record<string, string>, 0];
  },
});

export const TeiEmpty = Node.create({
  name: 'teiEmpty',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      el: { default: 'br', rendered: false },
      elAttrs: { default: {} as Record<string, string>, rendered: false },
      selfClose: { default: true, rendered: false },
    };
  },

  parseHTML() {
    return [];
  },

  renderHTML({ node }) {
    const el = node.attrs.el as string;
    return [
      'span',
      { class: 'tei-empty', 'data-tei-el': el, title: el },
      el === 'br' ? '↵' : `⟨${el}⟩`,
    ];
  },
});

export const ParagraphPAttrs = Extension.create({
  name: 'paragraphPAttrs',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: { pAttrs: { default: {} as Record<string, string>, rendered: false } },
      },
    ];
  },
});

export const teiEditorExtensions = [TeiMark, TeiEmpty, ParagraphPAttrs];

// ---------------------------------------------------------------------------
// Authoring commands — wrap/unwrap a TEI element on the current selection by
// editing the stack-mark. Implemented as plain functions over the editor to
// avoid TipTap command-type plumbing.
// ---------------------------------------------------------------------------

// Seeded high so generated instance ids never collide with the small
// sequential ids teiToDoc mints when parsing.
let instanceId = Date.now();
const nextId = () => ++instanceId;

interface Segment {
  from: number;
  to: number;
  stack: StackEntry[];
}

function collectSegments(editor: Editor): Segment[] {
  const { state } = editor;
  const { from, to } = state.selection;
  const segments: Segment[] = [];
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.isText || node.type.name === 'teiEmpty') {
      const start = Math.max(pos, from);
      const end = Math.min(pos + node.nodeSize, to);
      if (end > start) {
        const mark = node.marks.find((m) => m.type.name === 'tei');
        segments.push({ from: start, to: end, stack: (mark?.attrs.stack as StackEntry[]) ?? [] });
      }
      return false;
    }
    return true;
  });
  return segments;
}

/** Deepest ancestor element shared by every segment (by instance id). */
function commonDepth(segments: Segment[]): number {
  if (segments.length === 0) return 0;
  let depth = segments[0].stack.length;
  for (const seg of segments) {
    let k = 0;
    while (k < depth && k < seg.stack.length && seg.stack[k].id === segments[0].stack[k].id) k++;
    depth = k;
  }
  return depth;
}

/** Full document extent {from,to} of every element instance, keyed by id. */
function elementExtents(editor: Editor): Map<number, { from: number; to: number }> {
  const extents = new Map<number, { from: number; to: number }>();
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText && node.type.name !== 'teiEmpty') return;
    const mark = node.marks.find((m) => m.type.name === 'tei');
    if (!mark) return;
    const end = pos + node.nodeSize;
    for (const e of mark.attrs.stack as StackEntry[]) {
      const cur = extents.get(e.id);
      if (!cur) extents.set(e.id, { from: pos, to: end });
      else extents.set(e.id, { from: Math.min(cur.from, pos), to: Math.max(cur.to, end) });
    }
  });
  return extents;
}

/**
 * Wrap the selection in a new TEI element, nested at the shared depth. No-op
 * when there is no selection or it straddles an element boundary — only
 * partially covering an element at/below the insertion depth — since that would
 * split the element into overlapping fragments.
 */
export function wrapTei(editor: Editor, el: string, attrs: Record<string, string> = {}): void {
  const segments = collectSegments(editor);
  if (segments.length === 0) return;
  const depth = commonDepth(segments);
  const { from, to } = editor.state.selection;
  const extents = elementExtents(editor);
  for (const seg of segments) {
    for (let i = depth; i < seg.stack.length; i++) {
      const ext = extents.get(seg.stack[i].id);
      if (ext && (ext.from < from || ext.to > to)) return; // straddles → refuse
    }
  }
  const entry: StackEntry = { el, attrs, id: nextId() };
  const teiType = editor.state.schema.marks.tei;
  const tr = editor.state.tr;
  for (const seg of segments) {
    const newStack = [...seg.stack.slice(0, depth), entry, ...seg.stack.slice(depth)];
    tr.removeMark(seg.from, seg.to, teiType);
    tr.addMark(seg.from, seg.to, teiType.create({ stack: newStack }));
  }
  editor.view.dispatch(tr);
  editor.commands.focus();
}

/**
 * Remove the innermost element covering the selection — entirely, across every
 * run it spans (not just the selected ones), so a partial selection unwraps the
 * whole element instead of splitting it into fragments.
 */
export function unwrapTei(editor: Editor): void {
  const target = currentElement(editor);
  if (!target) return;
  const teiType = editor.state.schema.marks.tei;
  const tr = editor.state.tr;
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText && node.type.name !== 'teiEmpty') return;
    const mark = node.marks.find((m) => m.type.name === 'tei');
    if (!mark) return;
    const stack = mark.attrs.stack as StackEntry[];
    if (!stack.some((e) => e.id === target.id)) return;
    const newStack = stack.filter((e) => e.id !== target.id);
    tr.removeMark(pos, pos + node.nodeSize, teiType);
    if (newStack.length > 0)
      tr.addMark(pos, pos + node.nodeSize, teiType.create({ stack: newStack }));
  });
  editor.view.dispatch(tr);
  editor.commands.focus();
}

/**
 * The element stack shared by the whole selection (outermost → innermost). For a
 * collapsed cursor this reads the marks at the caret, so the breadcrumb and the
 * retype/unwrap actions work from a click inside an element — not just a drag.
 */
export function currentStack(editor: Editor): StackEntry[] {
  const segments = collectSegments(editor);
  if (segments.length > 0) {
    const depth = commonDepth(segments);
    return segments[0].stack.slice(0, depth);
  }
  const tei = editor.state.selection.$from.marks().find((m) => m.type.name === 'tei');
  return tei ? ((tei.attrs.stack as StackEntry[]) ?? []) : [];
}

/** The innermost element covering the current selection (or caret), or null. */
export function currentElement(editor: Editor): StackEntry | null {
  const stack = currentStack(editor);
  return stack.length > 0 ? stack[stack.length - 1] : null;
}

/** Change the @type of the innermost element covering the selection. */
export function retypeTei(editor: Editor, newType: string): void {
  const target = currentElement(editor);
  if (!target) return;
  const teiType = editor.state.schema.marks.tei;
  const tr = editor.state.tr;
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText && node.type.name !== 'teiEmpty') return;
    const mark = node.marks.find((m) => m.type.name === 'tei');
    if (!mark) return;
    const stack = mark.attrs.stack as StackEntry[];
    const idx = stack.findIndex((e) => e.id === target.id);
    if (idx === -1) return;
    const newStack = stack.map((e, i) =>
      i === idx ? { ...e, attrs: { ...e.attrs, type: newType } } : e
    );
    tr.removeMark(pos, pos + node.nodeSize, teiType);
    tr.addMark(pos, pos + node.nodeSize, teiType.create({ stack: newStack }));
  });
  editor.view.dispatch(tr);
  editor.commands.focus();
}

export const SEG_TYPES = [
  'address',
  'intitulatio',
  'salutation',
  'arenga',
  'notification',
  'disposition',
  'holding',
  'warrandice',
  'sealing',
  'dating',
  'witnesses',
  'boundaries',
  'narration',
  'injunction',
  'prohibition',
] as const;
