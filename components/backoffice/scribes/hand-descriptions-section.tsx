'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createHandDescription,
  updateHandDescription,
  deleteHandDescription,
} from '@/services/backoffice/scribes';
import { getSources } from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import type { HandDescription } from '@/types/backoffice';

const RichTextEditor = dynamic(
  () => import('@/components/backoffice/common/rich-text-editor').then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => <div className="h-[150px] rounded-md border animate-pulse bg-muted" />,
  }
);

type SourceOption = { id: number; name: string; label: string };

/** Dirty-tracking key for the not-yet-created draft row (real rows use their id). */
const DRAFT_ID = -1;

/** The editor's "empty" is `<p></p>`, which the API would accept as content. */
function isBlankHtml(html: string): boolean {
  return (
    html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim() === ''
  );
}

interface HandDescriptionsSectionProps {
  handId: number;
  descriptions: HandDescription[];
  /** Whether any row holds content edits not yet saved (rows save on their own). */
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * A Hand can have zero or more descriptions, each optionally citing a
 * source (archetype-pal/frontend#124) — replacing the old single mandatory
 * description field, which couldn't record multiple descriptions or where
 * any of them came from.
 */
export function HandDescriptionsSection({
  handId,
  descriptions,
  onDirtyChange,
}: HandDescriptionsSectionProps) {
  const { token } = useAuth();
  const t = useTranslations('backoffice');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  // "Add" opens a local draft; it is created only once it has content, because
  // the API rejects a description without any.
  const [drafting, setDrafting] = useState(false);
  const [dirtyIds, setDirtyIds] = useState<ReadonlySet<number>>(new Set());

  const setRowDirty = useCallback((id: number, dirty: boolean) => {
    setDirtyIds((prev) => {
      if (prev.has(id) === dirty) return prev;
      const next = new Set(prev);
      if (dirty) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const anyDirty = dirtyIds.size > 0;
  useEffect(() => {
    onDirtyChange?.(anyDirty);
  }, [anyDirty, onDirtyChange]);

  const { data: sources } = useQuery({
    queryKey: backofficeKeys.sources.all(),
    queryFn: () => getSources(),
    enabled: !!token,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: backofficeKeys.hands.detail(handId) });

  const createMut = useMutation({
    mutationFn: ({ source, content }: { source: number | null; content: string }) =>
      createHandDescription({ hand: handId, source, content }),
    onSuccess: () => {
      setDrafting(false);
      invalidate();
    },
    onError: (err) => {
      toast.error(t('handsDetail.descriptionAddFailed'), { description: formatApiError(err) });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      updateHandDescription(id, data),
    onSuccess: invalidate,
    onError: (err) => {
      toast.error(t('handsDetail.descriptionUpdateFailed'), { description: formatApiError(err) });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteHandDescription(id),
    onSuccess: () => {
      toast.success(t('handsDetail.descriptionRemoved'));
      setPendingDeleteId(null);
      invalidate();
    },
    onError: (err) => {
      toast.error(t('handsDetail.descriptionRemoveFailed'), { description: formatApiError(err) });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t('handsDetail.descriptionsLabel')}</h3>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => setDrafting(true)}
          disabled={drafting}
        >
          <Plus className="h-3 w-3" />
          {tCommon('add')}
        </Button>
      </div>

      {drafting && (
        <HandDescriptionDraft
          sources={sources ?? []}
          saving={createMut.isPending}
          onSave={(source, content) => createMut.mutate({ source, content })}
          onCancel={() => setDrafting(false)}
          onDirtyChange={setRowDirty}
        />
      )}

      {descriptions.length === 0 ? (
        !drafting && (
          <p className="text-sm text-muted-foreground py-2">{t('handsDetail.noDescriptions')}</p>
        )
      ) : (
        <div className="space-y-4">
          {descriptions.map((d) => (
            <HandDescriptionRow
              key={d.id}
              description={d}
              sources={sources ?? []}
              onChangeSource={(sourceId) =>
                updateMut.mutate({ id: d.id, data: { source: sourceId } })
              }
              onSaveContent={(content) => updateMut.mutate({ id: d.id, data: { content } })}
              onDirtyChange={setRowDirty}
              onDelete={() => setPendingDeleteId(d.id)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title={t('handsDetail.deleteDescriptionTitle')}
        description={t('handsDetail.deleteDescriptionBody')}
        confirmLabel={t('handsDetail.deleteConfirm')}
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (pendingDeleteId !== null) deleteMut.mutate(pendingDeleteId);
        }}
      />
    </div>
  );
}

function SourceSelect({
  value,
  sources,
  onChange,
}: {
  value: number | null;
  sources: SourceOption[];
  onChange: (sourceId: number | null) => void;
}) {
  const t = useTranslations('backoffice');
  return (
    <Select
      value={value != null ? String(value) : '__none'}
      onValueChange={(val) => onChange(val === '__none' ? null : Number(val))}
    >
      <SelectTrigger className="h-7 w-80 max-w-full text-xs">
        <SelectValue placeholder={t('handsDetail.sourceOptional')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">{t('handsDetail.sourceOptional')}</SelectItem>
        {sources.map((s) => (
          <SelectItem key={s.id} value={String(s.id)}>
            {s.name || s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function HandDescriptionDraft({
  sources,
  saving,
  onSave,
  onCancel,
  onDirtyChange,
}: {
  sources: SourceOption[];
  saving: boolean;
  onSave: (source: number | null, content: string) => void;
  onCancel: () => void;
  onDirtyChange: (id: number, dirty: boolean) => void;
}) {
  const t = useTranslations('backoffice');
  const tCommon = useTranslations('common');
  const [source, setSource] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const blank = isBlankHtml(content);
  const dirty = !blank || source != null;

  useEffect(() => {
    onDirtyChange(DRAFT_ID, dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(DRAFT_ID, false), [onDirtyChange]);

  return (
    <div className="rounded-md border border-dashed p-3 space-y-2">
      <div className="flex items-center gap-2">
        <SourceSelect value={source} sources={sources} onChange={setSource} />
        <Badge variant="outline" className="ml-auto text-[10px] text-amber-600 border-amber-300">
          {t('handsDetail.descriptionUnsaved')}
        </Badge>
      </div>
      <RichTextEditor
        content={content}
        onChange={setContent}
        placeholder={t('handsDetail.descriptionPlaceholder')}
        minimal
      />
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={() => onSave(source, content)}
          disabled={blank || saving}
        >
          {tCommon('save')}
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onCancel}>
          {tCommon('cancel')}
        </Button>
      </div>
    </div>
  );
}

function HandDescriptionRow({
  description,
  sources,
  onChangeSource,
  onSaveContent,
  onDirtyChange,
  onDelete,
}: {
  description: HandDescription;
  sources: SourceOption[];
  onChangeSource: (sourceId: number | null) => void;
  onSaveContent: (content: string) => void;
  onDirtyChange: (id: number, dirty: boolean) => void;
  onDelete: () => void;
}) {
  const t = useTranslations('backoffice');
  const tCommon = useTranslations('common');
  const [content, setContent] = useState(description.content);
  const dirty = content !== description.content;

  useEffect(() => {
    onDirtyChange(description.id, dirty);
  }, [description.id, dirty, onDirtyChange]);
  // A deleted row unmounts with whatever it held; it no longer counts.
  useEffect(() => () => onDirtyChange(description.id, false), [description.id, onDirtyChange]);

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <SourceSelect value={description.source} sources={sources} onChange={onChangeSource} />
        {dirty && (
          <Badge variant="outline" className="ml-auto text-[10px] text-amber-600 border-amber-300">
            {t('handsDetail.descriptionUnsaved')}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label={t('handsDetail.deleteDescriptionAria')}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <RichTextEditor
        content={content}
        onChange={setContent}
        placeholder={t('handsDetail.descriptionPlaceholder')}
        minimal
      />
      {dirty && (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => onSaveContent(content)}
            disabled={isBlankHtml(content)}
          >
            {tCommon('save')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setContent(description.content)}
          >
            {tCommon('cancel')}
          </Button>
        </div>
      )}
    </div>
  );
}
