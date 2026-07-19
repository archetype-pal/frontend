'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Loader2, Save } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Segmented } from '@/components/ui/segmented';
import { useAuth } from '@/contexts/auth-context';
import { useMsDescArea, type MsDescValidation } from '@/hooks/backoffice/use-msdesc-area';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import type { MsDescAreaStates } from '@/lib/msdesc-form';
import type { MsDescAreaId } from '@/lib/msdesc-vocab';
import { renderMsDescArea } from '@/lib/tei-msdesc-render';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { updateMsDescArea } from '@/services/backoffice/manuscripts';
import type { MsDescArea } from '@/types/backoffice';
import { HistoryForm } from './history-form';
import { MsContentsForm } from './ms-contents-form';
import { MsIdentifierForm } from './ms-identifier-form';
import { PhysDescForm } from './phys-desc-form';

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

type ViewMode = 'form' | 'source' | 'preview';

interface MsDescAreaPanelProps {
  historicalItemId: number;
  area: MsDescAreaId;
  row: MsDescArea;
}

/**
 * Single msDesc area editor (roadmap 2.2-UI / 2.3 / 2.4-UI / 6.1): typed Form
 * when the stored fragment is representable, Source (CodeMirror) + rendered
 * Preview always; one debounced well-formedness check on the composed
 * fragment gates Save. Unrepresentable fragments disable the Form view — the
 * stored string is only ever edited as source (data-safety contract).
 */
export function MsDescAreaPanel({ historicalItemId, area, row }: MsDescAreaPanelProps) {
  const t = useTranslations('backoffice');
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const editor = useMsDescArea({
    area,
    savedContent: row.content,
    savedPublished: row.is_published,
    token,
  });
  const formAvailable = editor.formState !== null;

  const [storedView, setStoredView] = React.useState<ViewMode>('form');
  // Derive the effective view instead of chasing state with effects: the Form
  // tab can become unavailable mid-edit (a Source edit the model can't hold).
  const view: ViewMode = storedView === 'form' && !formAvailable ? 'source' : storedView;

  const saveMut = useMutation({
    mutationFn: () =>
      updateMsDescArea(token!, row.id, {
        content: editor.content,
        is_published: editor.isPublished,
      }),
    onSuccess: () => {
      toast.success(t('msdesc.editor.toastSaved'));
      editor.markSaved();
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.manuscripts.detail(historicalItemId),
      });
    },
    onError: (err) => {
      toast.error(t('msdesc.editor.toastSaveFailed'), { description: formatApiError(err) });
    },
  });

  const previewHtml = React.useMemo(() => {
    if (view !== 'preview') return '';
    return sanitizeHtml(renderMsDescArea(area, editor.content, { t: (key) => t(key) }), {
      allowDataAttr: true,
    });
  }, [view, area, editor.content, t]);

  const publishedId = `msdesc-published-${row.id}`;
  const { validation } = editor;

  return (
    <div className="space-y-3">
      {/* Header: view switcher · validity · published · save */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Segmented<ViewMode>
          ariaLabel={t('msdesc.editor.viewSwitcherLabel')}
          value={view}
          onChange={setStoredView}
          options={[
            {
              value: 'form',
              label: t('msdesc.editor.tabForm'),
              disabled: !formAvailable,
              title: formAvailable ? undefined : t('msdesc.editor.unrepresentableTitle'),
            },
            { value: 'source', label: t('msdesc.editor.tabSource') },
            { value: 'preview', label: t('msdesc.editor.tabPreview') },
          ]}
        />

        <ValidityBadge validation={validation} t={t} />

        <div className="ml-auto flex items-center gap-3">
          {editor.dirty && (
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              {t('msdesc.editor.unsaved')}
            </span>
          )}
          <label
            htmlFor={publishedId}
            className="flex cursor-pointer items-center gap-1.5 text-xs font-medium"
          >
            <Checkbox
              id={publishedId}
              checked={editor.isPublished}
              onCheckedChange={(checked) => editor.setPublished(checked === true)}
            />
            {t('msdesc.editor.published')}
          </label>
          <Button
            size="sm"
            onClick={() => saveMut.mutate()}
            disabled={!editor.canSave || saveMut.isPending}
          >
            {saveMut.isPending ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1 h-3.5 w-3.5" />
            )}
            {t('msdesc.editor.save')}
          </Button>
        </div>
      </div>

      {/* Representability gate (data-safety contract) */}
      {!formAvailable && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('msdesc.editor.unrepresentableTitle')}</AlertTitle>
          <AlertDescription>
            {t('msdesc.editor.unrepresentableBody')}
            {editor.formUnavailableReason && (
              <code className="mt-1 block font-mono text-[11px] text-muted-foreground">
                {editor.formUnavailableReason}
              </code>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Validation errors (line/col), matching the TEI editor's presentation */}
      {validation.status === 'invalid' && validation.errors.length > 0 && (
        <ul className="space-y-0.5 text-[11px] font-medium text-destructive">
          {validation.errors.map((error, index) => (
            <li key={index}>
              {t('msdesc.editor.errorLine', {
                line: error.line,
                col: error.col,
                message: error.message,
              })}
            </li>
          ))}
        </ul>
      )}

      {view === 'form' && editor.formState !== null && (
        <AreaForm area={area} state={editor.formState} onChange={editor.applyFormState} />
      )}
      {view === 'source' && (
        <div className="rounded-md border">
          <TeiCodeMirror value={editor.content} onChange={editor.applySource} />
        </div>
      )}
      {view === 'preview' &&
        (previewHtml ? (
          <div
            className="msdesc-preview rounded-md border px-4 py-3 text-sm"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <p className="py-2 text-sm text-muted-foreground">{t('msdesc.editor.previewEmpty')}</p>
        ))}
    </div>
  );
}

/** Dispatch the typed form for one area (narrowed per area id). */
function AreaForm({
  area,
  state,
  onChange,
}: {
  area: MsDescAreaId;
  state: MsDescAreaStates[MsDescAreaId];
  onChange: (next: MsDescAreaStates[MsDescAreaId]) => void;
}) {
  switch (area) {
    case 'msIdentifier':
      return (
        <MsIdentifierForm state={state as MsDescAreaStates['msIdentifier']} onChange={onChange} />
      );
    case 'msContents':
      return <MsContentsForm state={state as MsDescAreaStates['msContents']} onChange={onChange} />;
    case 'physDesc':
      return <PhysDescForm state={state as MsDescAreaStates['physDesc']} onChange={onChange} />;
    case 'history':
      return <HistoryForm state={state as MsDescAreaStates['history']} onChange={onChange} />;
  }
}

function ValidityBadge({
  validation,
  t,
}: {
  validation: MsDescValidation;
  t: (key: string) => string;
}) {
  if (validation.status === 'idle') return null;
  if (validation.status === 'pending') {
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('msdesc.editor.validating')}
      </span>
    );
  }
  if (validation.status === 'valid') {
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" /> {t('msdesc.editor.valid')}
      </span>
    );
  }
  if (validation.status === 'invalid') {
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" /> {t('msdesc.editor.invalid')}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
      <AlertTriangle className="h-3.5 w-3.5" /> {t('msdesc.editor.validationUnavailable')}
    </span>
  );
}
