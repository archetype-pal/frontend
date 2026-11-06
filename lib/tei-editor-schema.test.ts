/** @vitest-environment jsdom */
import { Editor } from '@tiptap/react';
import { afterEach, describe, expect, it } from 'vitest';

import { teiEditorSchema } from '@/lib/tei-editor-schema';
import { docToTei, type PMDoc } from '@/lib/tei-prosemirror';

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe('teiEditorSchema', () => {
  it('holds no mark but the TEI one, so what the editor shows is what it saves', () => {
    editor = new Editor({ element: document.createElement('div'), extensions: teiEditorSchema });

    expect(Object.keys(editor.schema.marks)).toEqual(['tei']);
  });

  it('drops a pasted link and underline instead of showing them unsaved', () => {
    editor = new Editor({
      element: document.createElement('div'),
      extensions: teiEditorSchema,
      content: '<p><a href="https://example.org">Melrose</a> and <u>Kelso</u></p>',
    });

    expect(JSON.stringify(editor.getJSON())).not.toMatch(/"link"|"underline"/);
    expect(docToTei(editor.getJSON() as unknown as PMDoc)).toBe('<p>Melrose and Kelso</p>');
  });
});
