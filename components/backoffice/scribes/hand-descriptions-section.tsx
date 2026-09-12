'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface HandDescriptionsSectionProps {
  handId: number;
  descriptions: HandDescription[];
}

/**
 * A Hand can have zero or more descriptions, each optionally citing a
 * source (archetype-pal/frontend#124) — replacing the old single mandatory
 * description field, which couldn't record multiple descriptions or where
 * any of them came from.
 */
export function HandDescriptionsSection({ handId, descriptions }: HandDescriptionsSectionProps) {
  const { token } = useAuth();
  const t = useTranslations('backoffice');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();

  const { data: sources } = useQuery({
    queryKey: backofficeKeys.sources.all(),
    queryFn: () => getSources(token!),
    enabled: !!token,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: backofficeKeys.hands.detail(handId) });

  const createMut = useMutation({
    mutationFn: () => createHandDescription(token!, { hand: handId, source: null, content: '' }),
    onSuccess: () => {
      invalidate();
    },
    onError: (err) => {
      toast.error(t('handsDetail.descriptionAddFailed'), { description: formatApiError(err) });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      updateHandDescription(token!, id, data),
    onSuccess: invalidate,
    onError: (err) => {
      toast.error(t('handsDetail.descriptionUpdateFailed'), { description: formatApiError(err) });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteHandDescription(token!, id),
    onSuccess: () => {
      toast.success(t('handsDetail.descriptionRemoved'));
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
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending}
        >
          <Plus className="h-3 w-3" />
          {tCommon('add')}
        </Button>
      </div>

      {descriptions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">{t('handsDetail.noDescriptions')}</p>
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
              onDelete={() => deleteMut.mutate(d.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HandDescriptionRow({
  description,
  sources,
  onChangeSource,
  onSaveContent,
  onDelete,
}: {
  description: HandDescription;
  sources: { id: number; name: string; label: string }[];
  onChangeSource: (sourceId: number | null) => void;
  onSaveContent: (content: string) => void;
  onDelete: () => void;
}) {
  const t = useTranslations('backoffice');
  const tCommon = useTranslations('common');
  const [content, setContent] = useState(description.content);
  const dirty = content !== description.content;

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Select
          value={description.source != null ? String(description.source) : '__none'}
          onValueChange={(val) => onChangeSource(val === '__none' ? null : Number(val))}
        >
          <SelectTrigger className="h-7 w-56 text-xs">
            <SelectValue placeholder={t('handsDetail.sourceOptional')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">{t('handsDetail.sourceOptional')}</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.label || s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          <Button size="sm" className="h-7 text-xs" onClick={() => onSaveContent(content)}>
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
