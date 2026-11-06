import { Extension, type Editor } from '@tiptap/react';

function deleteDroppingMarks(editor: Editor) {
  if (editor.state.selection.empty) return false;
  return editor.commands.command(({ tr, dispatch }) => {
    if (dispatch) tr.deleteSelection().setStoredMarks(null);
    return true;
  });
}

/**
 * Tiptap 3.32.1's deleteSelection keeps the deleted text's marks for whatever is
 * typed next. Replacing a linked or TEI-tagged phrase would then silently keep
 * its URL or element, region link included, so deleting a selection drops them.
 */
export const DeleteDropsMarks = Extension.create({
  name: 'deleteDropsMarks',
  priority: 1000,
  addKeyboardShortcuts() {
    const shortcut = () => deleteDroppingMarks(this.editor);
    return {
      Backspace: shortcut,
      Delete: shortcut,
      'Mod-Backspace': shortcut,
      'Mod-Delete': shortcut,
      'Shift-Backspace': shortcut,
    };
  },
});
