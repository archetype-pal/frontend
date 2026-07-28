'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
// `@codemirror/view` is only a transitive dep; @uiw/react-codemirror (a direct
// dep) re-exports it, so the type comes from there.
import type { EditorView } from '@uiw/react-codemirror';
import { toast } from 'sonner';
import { Link2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { TeiRefPicker } from '@/components/backoffice/tei-ref-picker';
import { sourceInsertMarkup } from '@/lib/tei-ref-picker';
import { msdescFromFragment } from '@/lib/msdesc-form';
import type { MsDescAreaId } from '@/lib/msdesc-vocab';
import type { ResourceRef } from '@/lib/tei-ref';

/**
 * Source-mode msDesc editor (roadmap 4.3): the CodeMirror TEI source plus an
 * "Insert reference" affordance that dispatches a `<ref …>` at the cursor —
 * wrapping the current selection as the link text when there is one, otherwise
 * inserting the picked resource's label. The insert flows back through the
 * editor's own `onChange`, so it composes with the area's Save/validation.
 *
 * Two guards, because in Source mode the selection is RAW TEI and the cursor
 * can sit anywhere in the tree:
 *  1. the selection is spliced VERBATIM (never escaped — see
 *     `sourceInsertMarkup`), and an unbalanced selection (one that straddles a
 *     tag boundary) is refused rather than turned into malformed XML;
 *  2. an insert that would flip a form-representable area to non-representable
 *     is refused — `<ref>` is illegal inside phrase leaves such as `<author>`
 *     or `<settlement>`, and accepting it would silently and permanently remove
 *     the area's Form tab. Those leaves take an `@key` in the form instead.
 */

/**
 * True when replacing `current` with `next` would take an area that IS
 * form-representable to one that is not. `useMsDescArea` drops to
 * `formState === null` in that case and the area loses its structured Form tab
 * — permanently, since the rejection survives save + reload.
 */
export function insertBreaksForm(area: MsDescAreaId, current: string, next: string): boolean {
  return msdescFromFragment(area, current).ok && !msdescFromFragment(area, next).ok;
}

function TeiCodeMirrorLoading() {
  const t = useTranslations('backoffice');
  return (
    <div className="min-h-[200px] px-4 py-3 font-mono text-xs text-muted-foreground">
      {t('msdesc.editor.loading')}
    </div>
  );
}

const TeiCodeMirror = dynamic(() => import('@/components/backoffice/tei-codemirror'), {
  ssr: false,
  loading: TeiCodeMirrorLoading,
});

export function MsDescSourceEditor({
  area,
  value,
  onChange,
}: {
  area: MsDescAreaId;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations('backoffice');
  const viewRef = React.useRef<EditorView | null>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [seedText, setSeedText] = React.useState('');

  const openPicker = React.useCallback(() => {
    const view = viewRef.current;
    const { from, to } = view?.state.selection.main ?? { from: 0, to: 0 };
    // Seed the picker query from the selection, but only when it is plain text
    // — a slice carrying markup is not a search term.
    const selected = view ? view.state.sliceDoc(from, to) : '';
    setSeedText(/[<&]/.test(selected) ? '' : selected.trim());
    setPickerOpen(true);
  }, []);

  const handlePick = React.useCallback(
    (ref: ResourceRef) => {
      const view = viewRef.current;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      const selectedText = view.state.sliceDoc(from, to);
      let markup: string | null;
      try {
        markup = sourceInsertMarkup(ref, selectedText);
      } catch {
        // buildRefMarkup refuses an unsafe target — the picker sanitizes first,
        // so this is defensive; drop the insert rather than corrupt the source.
        markup = null;
      }
      if (markup === null) {
        toast.warning(t('msdesc.editor.refSelectionNotWrappable'));
        return;
      }
      const current = view.state.doc.toString();
      const next = current.slice(0, from) + markup + current.slice(to);
      if (insertBreaksForm(area, current, next)) {
        toast.warning(t('msdesc.editor.refBreaksForm'));
        return;
      }
      view.dispatch({
        changes: { from, to, insert: markup },
        selection: { anchor: from + markup.length },
        scrollIntoView: true,
      });
      view.focus();
    },
    [area, t]
  );

  return (
    <div>
      <div className="flex items-center justify-end border-b px-2 py-1.5">
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={openPicker}>
          <Link2 className="h-3 w-3" />
          {t('msdesc.editor.insertReference')}
        </Button>
      </div>
      <TeiCodeMirror
        value={value}
        onChange={onChange}
        onCreateEditor={(view) => {
          viewRef.current = view;
        }}
      />
      <TeiRefPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={handlePick}
        seedText={seedText}
      />
    </div>
  );
}
