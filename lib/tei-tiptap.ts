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

import { Extension, Mark, Node } from '@tiptap/react';

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
      const type = entry.attrs?.type ? `:${entry.attrs.type}` : '';
      spec = [
        'span',
        {
          class: `tei-el tei-el-${entry.el}`,
          'data-tei-el': entry.el,
          title: `${entry.el}${type}`,
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
