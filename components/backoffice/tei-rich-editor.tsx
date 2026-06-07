'use client';

import * as React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Brackets,
  ChevronDown,
  MapPin,
  Parentheses,
  Pilcrow,
  Replace,
  Ungroup,
  User,
  type LucideIcon,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SEG_TYPES,
  currentStack,
  retypeTei,
  teiEditorExtensions,
  teiElementLabel,
  unwrapTei,
  wrapTei,
} from '@/lib/tei-tiptap';
import { docToTei, teiToDoc, type PMDoc, type StackEntry } from '@/lib/tei-prosemirror';
import { cn } from '@/lib/utils';

interface TeiRichEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// The four inline entities, each tied to its highlight colour via `tone`.
const ENTITY_TOOLS: Array<{
  el: string;
  attrs: Record<string, string>;
  label: string;
  icon: LucideIcon;
  tone: string;
  hint: string;
}> = [
  {
    el: 'persName',
    attrs: { type: 'name' },
    label: 'Person',
    icon: User,
    tone: 'person',
    hint: 'Mark the selection as a person name',
  },
  {
    el: 'placeName',
    attrs: { type: 'name' },
    label: 'Place',
    icon: MapPin,
    tone: 'place',
    hint: 'Mark the selection as a place name',
  },
  {
    el: 'ex',
    attrs: {},
    label: 'Expansion',
    icon: Parentheses,
    tone: 'ex',
    hint: 'Mark the selection as an editorial expansion',
  },
  {
    el: 'supplied',
    attrs: {},
    label: 'Supplied',
    icon: Brackets,
    tone: 'supplied',
    hint: 'Mark the selection as editorially supplied text',
  },
];

function ToolButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  title,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  tone?: string;
}) {
  return (
    <button
      type="button"
      // Keep focus (and the text selection) in the editor when pressed.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      data-tone={tone}
      className={cn(
        'tei-tool inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
        'text-foreground/80 transition-colors hover:bg-accent hover:text-foreground',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'
      )}
    >
      <Icon className="tei-tool-icon h-3.5 w-3.5" />
      {label}
    </button>
  );
}

/**
 * Rendered (WYSIWYG) TEI editor. Loads content as ProseMirror JSON via teiToDoc
 * and emits TEI via docToTei(getJSON()). The toolbar wraps/unwraps/retypes TEI
 * elements on the current selection; every marked element shows an always-on
 * colour-coded highlight (see globals.css .tei-rich), and a "you are inside"
 * breadcrumb makes the markup legible while editing.
 */
export default function TeiRichEditor({ value, onChange }: TeiRichEditorProps) {
  const lastEmitted = React.useRef<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
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
      }),
      ...teiEditorExtensions,
    ],
    content: teiToDoc(value) as unknown as Record<string, unknown>,
    editorProps: {
      attributes: {
        class:
          'tei-rich prose prose-sm dark:prose-invert max-w-none min-h-[260px] px-4 py-3 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const tei = docToTei(editor.getJSON() as unknown as PMDoc);
      lastEmitted.current = tei;
      onChange(tei);
    },
  });

  React.useEffect(() => {
    if (!editor) return;
    if (value === lastEmitted.current) return;
    editor.commands.setContent(teiToDoc(value) as unknown as Record<string, unknown>, {
      emitUpdate: false,
    });
    lastEmitted.current = value;
  }, [editor, value]);

  // Live selection context: the element stack the caret/selection sits in, the
  // innermost element (for retype/unwrap), and whether anything is selected.
  const [stack, setStack] = React.useState<StackEntry[]>([]);
  const [selectionEmpty, setSelectionEmpty] = React.useState(true);
  React.useEffect(() => {
    if (!editor) return;
    const update = () => {
      setStack(currentStack(editor));
      setSelectionEmpty(editor.state.selection.empty);
    };
    update();
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  if (!editor) return null;

  const innermost = stack.length > 0 ? stack[stack.length - 1] : null;
  const inClause = innermost?.el === 'seg';
  const noSelection = selectionEmpty;

  // Spoken equivalent of the visual breadcrumb for screen readers: announces the
  // caret's element context and which modify actions just became available.
  const contextLabel =
    stack.length > 0
      ? `Inside ${stack.map((e) => teiElementLabel(e.el, e.attrs?.type)).join(', then ')}.` +
        `${innermost ? ' Unwrap available.' : ''}${inClause ? ' Retype available.' : ''}`
      : noSelection
        ? 'No markup at the caret. Select text to mark it up.'
        : 'Selection ready. Choose a markup.';

  const wrap = (el: string, attrs: Record<string, string>) => {
    wrapTei(editor, el, attrs);
  };

  return (
    <div className="tei-editor">
      <div className="tei-toolbar flex flex-wrap items-center gap-x-1 gap-y-1.5 border-b bg-muted/40 px-2 py-1.5">
        {/* Group 1 — wrap the selection in an inline entity */}
        <div className="flex items-center gap-0.5">
          {ENTITY_TOOLS.map((t) => (
            <ToolButton
              key={t.el}
              icon={t.icon}
              label={t.label}
              tone={t.tone}
              disabled={noSelection}
              title={noSelection ? 'Select text first' : t.hint}
              onClick={() => wrap(t.el, t.attrs)}
            />
          ))}
        </div>

        <div className="mx-1 h-5 w-px shrink-0 self-center bg-border" aria-hidden />

        {/* Group 2 — wrap the selection in a clause (seg @type) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={noSelection}
              title={noSelection ? 'Select text first' : 'Wrap the selection in a clause'}
              className={cn(
                'tei-tool inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
                'text-foreground/80 transition-colors hover:bg-accent hover:text-foreground',
                'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'
              )}
            >
              <Pilcrow className="h-3.5 w-3.5" />
              Clause
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-72 overflow-auto"
            onCloseAutoFocus={(e) => {
              // Return focus (and the visible caret/selection) to the editor
              // instead of Radix's default refocus of the trigger button.
              e.preventDefault();
              editor.commands.focus();
            }}
          >
            {SEG_TYPES.map((t) => (
              <DropdownMenuItem key={t} onSelect={() => wrap('seg', { type: t })}>
                {cap(t)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="mx-1 h-5 w-px shrink-0 self-center bg-border" aria-hidden />

        {/* Group 3 — modify the element the caret sits in */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={!inClause}
              title={
                inClause
                  ? 'Change the type of this clause'
                  : 'Put the caret inside a clause to change its type'
              }
              className={cn(
                'tei-tool inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
                'text-foreground/80 transition-colors hover:bg-accent hover:text-foreground',
                'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'
              )}
            >
              <Replace className="h-3.5 w-3.5" />
              {inClause && innermost?.attrs?.type ? cap(innermost.attrs.type) : 'Retype'}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-72 overflow-auto"
            onCloseAutoFocus={(e) => {
              // Return focus (and the visible caret/selection) to the editor
              // instead of Radix's default refocus of the trigger button.
              e.preventDefault();
              editor.commands.focus();
            }}
          >
            {SEG_TYPES.map((t) => (
              <DropdownMenuItem key={t} onSelect={() => retypeTei(editor, t)}>
                {cap(t)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolButton
          icon={Ungroup}
          label="Unwrap"
          disabled={!innermost}
          title={
            innermost
              ? `Remove the ${teiElementLabel(innermost.el, innermost.attrs?.type)} markup here`
              : 'Put the caret inside a marked element to remove it'
          }
          onClick={() => unwrapTei(editor)}
        />

        {/* Selection context — what the caret is currently inside (decorative;
            the spoken equivalent is the aria-live region below). */}
        <div className="ml-auto flex min-w-0 items-center gap-1 pl-1" aria-hidden>
          {stack.length > 0 ? (
            <>
              <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Inside
              </span>
              <span className="flex min-w-0 flex-wrap items-center gap-1">
                {stack.map((e, i) => (
                  <span
                    key={`${e.id}-${i}`}
                    className={cn('tei-crumb', `tei-crumb-${e.el}`)}
                    data-tone={
                      e.el === 'persName'
                        ? 'person'
                        : e.el === 'placeName'
                          ? 'place'
                          : e.el === 'ex'
                            ? 'ex'
                            : e.el === 'supplied'
                              ? 'supplied'
                              : 'seg'
                    }
                  >
                    {teiElementLabel(e.el, e.attrs?.type)}
                  </span>
                ))}
              </span>
            </>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              {noSelection ? 'Select text, then mark it up' : 'Ready — choose a markup'}
            </span>
          )}
        </div>
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {contextLabel}
      </span>

      <EditorContent editor={editor} />
    </div>
  );
}
