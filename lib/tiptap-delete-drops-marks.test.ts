/** @vitest-environment jsdom */
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import { Editor } from '@tiptap/react';
import { afterEach, describe, expect, it } from 'vitest';

import { teiEditorSchema } from '@/lib/tei-editor-schema';
import { docToTei, teiToDoc, type PMDoc } from '@/lib/tei-prosemirror';
import { DeleteDropsMarks } from '@/lib/tiptap-delete-drops-marks';

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

function press(key: 'Backspace' | 'Delete') {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  return editor!.view.someProp('handleKeyDown', (handler) => handler(editor!.view, event));
}

function selectText(text: string) {
  let from = -1;
  editor!.state.doc.descendants((node, pos) => {
    if (node.text === text) from = pos;
  });
  editor!.commands.setTextSelection({ from, to: from + text.length });
}

function replaceSelectedWith(key: 'Backspace' | 'Delete', text: string) {
  press(key);
  editor!.view.dispatch(editor!.state.tr.insertText(text));
}

describe.each(['Backspace', 'Delete'] as const)('deleting a selection with %s', (key) => {
  it('does not carry a TEI element and its region link into the next text', () => {
    editor = new Editor({
      element: document.createElement('div'),
      extensions: teiEditorSchema,
      content: teiToDoc('<p>Rex <persName corresp="#gid-5" ref="#p1">Malcolm</persName> dedit</p>'),
    });

    selectText('Malcolm');
    replaceSelectedWith(key, 'David');

    expect(docToTei(editor.getJSON() as unknown as PMDoc)).toBe('<p>Rex David dedit</p>');
  });

  it('does not carry a link into the next text', () => {
    editor = new Editor({
      element: document.createElement('div'),
      extensions: [StarterKit.configure({ link: false }), Link, DeleteDropsMarks],
      content: '<p>see <a href="https://x.test/">here</a> now</p>',
    });

    selectText('here');
    replaceSelectedWith(key, 'there');

    expect(editor.getHTML()).toBe('<p>see there now</p>');
  });
});

it('leaves deleting without a selection to the browser', () => {
  editor = new Editor({
    element: document.createElement('div'),
    extensions: teiEditorSchema,
    content: teiToDoc('<p>Rex</p>'),
  });

  editor.commands.setTextSelection(4);

  expect(press('Backspace')).toBeFalsy();
});
