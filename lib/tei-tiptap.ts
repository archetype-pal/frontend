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
      // The human label prefers the @type (e.g. "address", "name") and falls
      // back to the element name; surfaced as a hover pill via data-tei-label.
      const label = entry.attrs?.type || entry.el;
      const full = entry.attrs?.type ? `${entry.el}:${entry.attrs.type}` : entry.el;
      spec = [
        'span',
        {
          class: `tei-el tei-el-${entry.el}`,
          'data-tei-el': entry.el,
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

/** Wrap the selection in a new TEI element, nested at the shared depth. */
export function wrapTei(editor: Editor, el: string, attrs: Record<string, string> = {}): void {
  const segments = collectSegments(editor);
  if (segments.length === 0) return;
  const depth = commonDepth(segments);
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

/** Remove the innermost element shared by the whole selection. */
export function unwrapTei(editor: Editor): void {
  const segments = collectSegments(editor);
  const depth = commonDepth(segments);
  if (depth === 0) return;
  const removeId = segments[0].stack[depth - 1].id;
  const teiType = editor.state.schema.marks.tei;
  const tr = editor.state.tr;
  for (const seg of segments) {
    const newStack = seg.stack.filter((e) => e.id !== removeId);
    tr.removeMark(seg.from, seg.to, teiType);
    if (newStack.length > 0) tr.addMark(seg.from, seg.to, teiType.create({ stack: newStack }));
  }
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
