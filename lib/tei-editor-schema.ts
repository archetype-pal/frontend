import StarterKit from '@tiptap/starter-kit';

import { teiEditorExtensions } from '@/lib/tei-tiptap';

/**
 * The schema both TEI rich editors share (the charter text editor and the
 * msDesc leaf editor): StarterKit's document, paragraph and text and nothing
 * else of it, plus the TEI stack-mark.
 *
 * `docToTei` reads only the `tei` mark, so any other mark would show while
 * editing and vanish on save. That includes `link` and `underline`, which
 * StarterKit turns on and pasted HTML brings in; TEI links are `<ref>`.
 *
 * Kept apart from `tei-tiptap` so the viewer, which imports that module for
 * its link helpers, does not pull StarterKit into its bundle.
 */
export const teiEditorSchema = [
  StarterKit.configure({
    bold: false,
    italic: false,
    strike: false,
    code: false,
    codeBlock: false,
    heading: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    blockquote: false,
    horizontalRule: false,
    hardBreak: false,
    link: false,
    underline: false,
  }),
  ...teiEditorExtensions,
];
