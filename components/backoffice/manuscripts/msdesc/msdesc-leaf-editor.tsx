'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { toast } from 'sonner';
import { Link2, Unlink } from 'lucide-react';

import { docToTei, teiToDoc, type PMDoc } from '@/lib/tei-prosemirror';
import {
  currentElement,
  currentStack,
  teiEditorExtensions,
  unwrapTei,
  wrapTei,
} from '@/lib/tei-tiptap';
import { refAttrs } from '@/lib/tei-ref-picker';
import type { ResourceRef } from '@/lib/tei-ref';
import { TeiRefPicker } from '@/components/backoffice/tei-ref-picker';
import { cn } from '@/lib/utils';
import { MsProseTextarea } from './fields';

/**
 * Compact rich editor for a `<p>`-rooted TEI prose leaf (roadmap 3.1). It edits
 * the leaf's inner `<p>`-sequence as WYSIWYG TEI — inline entities (persName,
 * ref, …) render as styled spans via `.tei-rich` rather than raw angle brackets
 * — while guaranteeing zero data loss. A drop-in for {@link MsProseTextarea}.
 *
 * DATA-SAFETY CONTRACT:
 *  - Rich editing is offered ONLY when the value passes the byte-exact gate
 *    (`'' || docToTei(teiToDoc(value)) === value`). When it fails, we fall back
 *    to {@link MsProseTextarea} — a plain textarea that round-trips the raw
 *    string verbatim — so the markup is still editable without loss.
 *  - On edit the editor emits `docToTei(getJSON())` (its own canonical form);
 *    no other normalization is applied.
 *  - An untouched/emptied leaf stays `''` — the editor never spuriously emits
 *    `<p></p>` on mount or focus (see {@link normalizeLeafEmit}).
 *
 * It deliberately does NOT reuse `tei-text-editor.tsx` (runs a per-value
 * `validate-tei` server call the roadmap forbids per-leaf — area-level
 * validation in `msdesc-area-panel` covers it) nor `tei-rich-editor.tsx` (ships
 * the charter clause/`seg`-type toolbar, wrong for msDesc prose). It builds
 * directly on the shared `teiEditorExtensions` + `teiToDoc`/`docToTei` with
 * compact, toolbar-free chrome.
 *
 * Phase 4 adds two controls: link (open the shared {@link TeiRefPicker} and
 * wrap the selection in a `<ref>` via the element-generic `wrapTei`) and
 * unlink (`unwrapTei` on the `<ref>` under the caret). `<ref>` is deliberately
 * NOT added to `LINKABLE_ELEMENTS` — it carries no geometry, and adding it
 * would shift the positional `element_index` of every shipped region link.
 */

// The canonical TEI a single empty ProseMirror paragraph serialises to. TipTap's
// schema keeps at least one paragraph, so an emptied editor emits this; we map
// it back to '' so an untouched/emptied leaf stays empty (never dirties).
const EMPTY_LEAF_TEI = '<p></p>';

/**
 * Byte-exact representability gate (data-safety contract): rich editing is only
 * offered when the leaf's inner XML survives the shared model unchanged. `''` is
 * always representable (an empty leaf). Anything that throws or fails to
 * round-trip is NOT mounted on the rich path.
 */
export function leafIsRichRepresentable(value: string): boolean {
  if (value === '') return true;
  try {
    return docToTei(teiToDoc(value)) === value;
  } catch {
    return false;
  }
}

/**
 * Normalise an editor emit: a bare empty paragraph collapses to `''` so an
 * untouched/emptied leaf never emits `<p></p>` (which would dirty every empty
 * leaf and can break the area composer). A paragraph carrying attributes, or any
 * real content, is emitted verbatim from `docToTei`.
 */
export function normalizeLeafEmit(tei: string): string {
  return tei === EMPTY_LEAF_TEI ? '' : tei;
}

/** True when any element covering the selection/caret is a `<ref>`. */
export function isInsideRef(editor: Editor): boolean {
  return currentStack(editor).some((entry) => entry.el.toLowerCase() === 'ref');
}

/**
 * True when the INNERMOST element under the caret is a `<ref>` — the only case
 * in which `unwrapTei` (which removes the innermost element) removes the link.
 * A caret inside `<ref><persName>x</persName></ref>` reports false, so unlink
 * can never silently delete an unrelated inner entity.
 */
export function refIsInnermost(editor: Editor): boolean {
  const element = currentElement(editor);
  return element !== null && element.el.toLowerCase() === 'ref';
}

/** Outcome of {@link insertRefIntoLeaf} — the caller maps it to a hint. */
export type RefInsertResult = 'ok' | 'nested' | 'refused';

/**
 * Wrap the current selection in a `<ref>`, inserting the resource's label first
 * when the selection is empty. Extracted from the component so the insertion
 * contract is directly testable against a real editor.
 *
 *  - `'nested'` — the selection already sits inside a `<ref>`. Nesting would
 *    emit `<ref …>J<ref …>oh</ref>n</ref>`, which the byte-exact gate happily
 *    accepts and the renderer then has to degrade (nested `<a>` is invalid
 *    HTML). Refuse instead.
 *  - `'refused'` — nothing to wrap, or `wrapTei` declined a selection that only
 *    partially covers an element (wrapping it would split that element).
 */
export function insertRefIntoLeaf(editor: Editor, ref: ResourceRef): RefInsertResult {
  if (isInsideRef(editor)) return 'nested';
  const { from, to } = editor.state.selection;
  if (from === to) {
    if (ref.label === '') return 'refused';
    // Insert the label as a PLAIN TEXT node. `insertContent(string)` HTML-parses
    // its argument, so a label carrying `<a>`/`<u>`/block markup would insert a
    // different number of characters than `label.length` — and the follow-up
    // selection would then overshoot into the surrounding prose and swallow it
    // into the link. `tr.insertText` inserts exactly `label.length` characters
    // and inherits the marks at the caret, so a label dropped inside an existing
    // element stays inside it instead of splitting it.
    editor.view.dispatch(editor.state.tr.insertText(ref.label, from));
    editor.commands.setTextSelection({ from, to: from + ref.label.length });
  }
  return wrapTei(editor, 'ref', refAttrs(ref)) ? 'ok' : 'refused';
}

// ProseMirror's `doc` requires `block+` content; an empty leaf parses to zero
// paragraphs, so seed a single empty paragraph the editor schema can hold.
const EMPTY_DOC: PMDoc = {
  type: 'doc',
  content: [{ type: 'paragraph', attrs: { pAttrs: {} }, content: [] }],
};

function toLeafContent(value: string): Record<string, unknown> {
  const doc = teiToDoc(value);
  return (doc.content.length > 0 ? doc : EMPTY_DOC) as unknown as Record<string, unknown>;
}

/**
 * One entity button. The caller supplies already-translated strings, so this
 * component stays i18n-agnostic about a palette it does not own.
 *
 * `attrs` is usually empty. Do NOT stamp `type="name"` the way the charter
 * toolbar does: the renderer's hover pill reads `attrs['type'] ?? name`
 * (`tei-msdesc-render.ts`), so every person would be labelled "name".
 */
export interface TeiEntityTool {
  el: string;
  attrs?: Record<string, string>;
  label: string;
  title: string;
}

interface MsDescLeafEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /**
   * Entity buttons to offer beside Link/Unlink. Omitted by the msDesc area
   * panels, which deliberately keep prose leaves to linking only; supplied by
   * the catalogue-description editor, whose palette is fixed by the project ODD.
   */
  entityTools?: readonly TeiEntityTool[];
}

/**
 * Gate + dispatcher. Renders the compact rich editor when the leaf is
 * representable, otherwise the verbatim-preserving textarea fallback. A mounted
 * rich editor only ever emits `docToTei` output (which round-trips), so it never
 * flips itself to the fallback mid-edit; only an externally-supplied
 * non-representable value routes to the textarea.
 */
export function MsDescLeafEditor(props: MsDescLeafEditorProps) {
  const t = useTranslations('backoffice');
  if (!leafIsRichRepresentable(props.value)) {
    return (
      <MsProseTextarea
        label={props.label}
        value={props.value}
        onChange={props.onChange}
        placeholder={props.placeholder}
        disabled={props.disabled}
        hint={t('msdesc.editor.leafNotRepresentable')}
        className={props.className}
      />
    );
  }
  return <RichLeaf {...props} />;
}

function RichLeaf({
  label,
  value,
  onChange,
  disabled,
  className,
  entityTools,
}: MsDescLeafEditorProps) {
  const t = useTranslations('backoffice');
  // Guard the controlled-value effect against the editor's own emits so
  // reflecting `value` back never steals the caret (mirrors tei-rich-editor).
  const lastEmitted = React.useRef<string | null>(null);
  // Always-current `value` for onUpdate (its closure captures the mount value).
  // TipTap fires one onUpdate on mount; for representable content its emit equals
  // the current value's canonical form, so the onUpdate guard swallows that no-op
  // — keeping an untouched leaf from ever calling onChange. Both '' and a stored
  // '<p></p>' (whose canonical emit is '') stay put with zero churn.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
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
        // `docToTei` only reads the `tei` mark, so a `link`/`underline` mark
        // (e.g. from pasted HTML) renders in the editor and is then silently
        // dropped on serialize. Keeping them out of the schema makes the
        // WYSIWYG surface match exactly what is saved; TEI links are `<ref>`.
        link: false,
        underline: false,
      }),
      ...teiEditorExtensions,
    ],
    content: toLeafContent(value),
    editorProps: {
      attributes: {
        class:
          'tei-rich prose prose-sm dark:prose-invert max-w-none min-h-16 px-3 py-2 text-sm focus:outline-none',
        'aria-label': label,
        role: 'textbox',
        'aria-multiline': 'true',
      },
    },
    onUpdate: ({ editor }) => {
      const emitted = normalizeLeafEmit(docToTei(editor.getJSON() as unknown as PMDoc));
      // Skip a no-op emit (the mount-time onUpdate, or an echo of our own
      // setContent): it would only churn the parent, never change the data.
      // Compare against the CANONICAL form of the current value, not its raw
      // bytes: `valueRef.current` is always rich-representable, so its canonical
      // emit is `normalizeLeafEmit(valueRef.current)`. This also swallows the
      // mount emit for a stored '<p></p>' leaf (canonical ''), which the raw-byte
      // check missed — it would fire onChange('') on mere mount and silently drop
      // the empty paragraph. A genuine user clear of non-empty content still
      // differs from its canonical form, so real edits propagate unchanged.
      if (emitted === valueRef.current || emitted === normalizeLeafEmit(valueRef.current)) return;
      lastEmitted.current = emitted;
      onChange(emitted);
    },
  });

  // Reflect controlled-value changes (async hydration, external resets) without
  // stealing the caret: skip when the incoming value is exactly what we last
  // emitted, otherwise re-seed the doc without firing onChange.
  React.useEffect(() => {
    if (!editor) return;
    if (value === lastEmitted.current) return;
    editor.commands.setContent(toLeafContent(value), { emitUpdate: false });
    lastEmitted.current = value;
  }, [editor, value]);

  React.useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [seedText, setSeedText] = React.useState('');

  // Re-render when the caret moves so the unlink control tracks the selection.
  const canUnlink = useEditorState({
    editor,
    selector: ({ editor }) => (editor ? refIsInnermost(editor) : false),
  });

  const openPicker = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    setSeedText(from === to ? '' : editor.state.doc.textBetween(from, to));
    setPickerOpen(true);
  };

  // Insert a <ref> over the selection via the shared, element-generic wrapTei —
  // <ref> is NOT a linkable element, so this never touches the region-link sets.
  // With an empty selection, insert the ref's label text and wrap that.
  const handlePick = (ref: ResourceRef) => {
    if (!editor) return;
    const result = insertRefIntoLeaf(editor, ref);
    if (result === 'nested') toast.warning(t('msdesc.editor.refAlreadyLinked'));
    else if (result === 'refused') toast.warning(t('msdesc.editor.refNotInserted'));
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs font-medium text-muted-foreground">{label}</label>
        <div className="flex items-center gap-0.5">
          {entityTools?.map((tool) => (
            <button
              key={tool.el}
              type="button"
              onClick={() => editor && wrapTei(editor, tool.el, tool.attrs ?? {})}
              disabled={disabled || !editor}
              title={tool.title}
              className="inline-flex h-6 items-center justify-center rounded px-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              {tool.label}
            </button>
          ))}
          {entityTools?.length ? (
            <span className="mx-0.5 h-4 w-px shrink-0 self-center bg-border" aria-hidden />
          ) : null}
          <button
            type="button"
            onClick={openPicker}
            disabled={disabled}
            aria-label={t('msdesc.editor.linkResource')}
            title={t('msdesc.editor.linkResource')}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Link2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor && unwrapTei(editor)}
            disabled={disabled || !canUnlink}
            aria-label={t('msdesc.editor.unlinkResource')}
            title={t('msdesc.editor.unlinkResource')}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Unlink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div
        className={cn(
          'rounded-md border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {editor ? <EditorContent editor={editor} /> : <div className="min-h-16 px-3 py-2" />}
      </div>
      <TeiRefPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={handlePick}
        seedText={seedText}
      />
    </div>
  );
}
