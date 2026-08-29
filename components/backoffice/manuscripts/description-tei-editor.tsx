'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

import { Segmented } from '@/components/ui/segmented';
import { renderPublicDescription } from '@/lib/description-public';
import { wrapTeiDescription } from '@/lib/tei-description';
import { MsDescLeafEditor } from './msdesc/msdesc-leaf-editor';

// Same treatment the msDesc source pane gets: CodeMirror is heavy and most
// cataloguers never open the Source tab.
const TeiCodeMirror = dynamic(() => import('@/components/backoffice/tei-codemirror'), {
  ssr: false,
});

type Mode = 'rich' | 'source' | 'preview';

const MODES: Mode[] = ['rich', 'source', 'preview'];

interface DescriptionTeiEditorProps {
  /** The `<p>`-sequence, wrapper already stripped by the caller. */
  value: string;
  onChange: (prose: string) => void;
  label: string;
}

/**
 * The three-mode editor for a linked catalogue description (docs/tei.md §4.5).
 *
 * Assembled rather than reused wholesale, because neither shipped editor fits
 * a description on its own:
 *
 * - `TeiTextEditor` has the three modes but **no `<ref>` picker** — its Rich
 *   toolbar wraps entities only — and its Preview runs the charter translator,
 *   which does not know `<ref>` and would show every link as plain text. For a
 *   feature whose entire point is live links, a preview that silently drops them
 *   is worse than no preview.
 * - `MsDescLeafEditor` has the picker and the byte-exact gate, but is a single
 *   always-rich surface with no tabs.
 *
 * So: Rich is the leaf editor (picker included), Preview runs the *public*
 * render pipeline so what the cataloguer sees is what a visitor sees, and Source
 * is raw TEI for the long tail. The value crossing this boundary is always the
 * bare `<p>`-sequence — the storage wrapper is the caller's, and must never
 * reach the editor model, which would eat it.
 */
export function DescriptionTeiEditor({ value, onChange, label }: DescriptionTeiEditorProps) {
  const t = useTranslations('backoffice');
  const [mode, setMode] = React.useState<Mode>('rich');

  // Wrapped before rendering: `renderPublicDescription` takes STORED content and
  // discriminates on the wrapper. Handing it bare prose sends it down the legacy
  // HTML branch, where sanitize strips every <ref> — a preview that silently
  // loses exactly what it is supposed to be showing.
  const preview = React.useMemo(
    () =>
      mode === 'preview'
        ? renderPublicDescription(wrapTeiDescription(value), (key) => t(key)).html
        : '',
    [mode, value, t]
  );

  return (
    <div className="space-y-2">
      <Segmented
        ariaLabel={t('manuscriptsDetail.descriptionEditorMode')}
        value={mode}
        onChange={setMode}
        options={MODES.map((m) => ({
          value: m,
          label: t(`manuscriptsDetail.descriptionMode.${m}`),
        }))}
      />

      {mode === 'rich' ? (
        <MsDescLeafEditor label={label} value={value} onChange={onChange} />
      ) : null}

      {mode === 'source' ? (
        <TeiCodeMirror value={value} onChange={onChange} placeholder="<p>…</p>" />
      ) : null}

      {mode === 'preview' ? (
        <div className="rounded-md border bg-background p-3">
          {preview.trim() ? (
            <div
              className="tei-linked-prose font-serif text-sm leading-relaxed [&_p]:m-0 [&_p+p]:mt-3"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('manuscriptsDetail.descriptionPreviewEmpty')}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
