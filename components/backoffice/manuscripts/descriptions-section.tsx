'use client';

import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
const RichTextEditor = dynamic(
  () => import('@/components/backoffice/common/rich-text-editor').then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => <div className="h-[200px] rounded-md border animate-pulse bg-muted" />,
  }
);
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getSources } from '@/services/backoffice/manuscripts';
import {
  createDescription,
  updateDescription,
  deleteDescription,
} from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { sanitizeHtml } from '@/lib/sanitize-html';
import type { HistoricalItemDescription } from '@/types/backoffice';

interface DescriptionsSectionProps {
  historicalItemId: number;
  descriptions: HistoricalItemDescription[];
}

export function DescriptionsSection({ historicalItemId, descriptions }: DescriptionsSectionProps) {
  const { token } = useAuth();
  const t = useTranslations('backoffice');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newSource, setNewSource] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editingSourceId, setEditingSourceId] = useState<number | null>(null);
  const [editSourceValue, setEditSourceValue] = useState('');

  const { data: sources } = useQuery({
    queryKey: backofficeKeys.sources.all(),
    queryFn: () => getSources(token!),
    enabled: !!token,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: backofficeKeys.manuscripts.detail(historicalItemId),
    });

  const createMut = useMutation({
    mutationFn: () =>
      createDescription(token!, {
        historical_item: historicalItemId,
        source: Number(newSource),
        content: newContent,
      }),
    onSuccess: () => {
      toast.success(t('manuscriptsDetail.descriptionAdded'));
      invalidate();
      setAdding(false);
      setNewSource('');
      setNewContent('');
    },
    onError: (err) => {
      toast.error(t('manuscriptsDetail.descriptionAddFailed'), {
        description: formatApiError(err),
      });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      updateDescription(token!, id, data),
    onSuccess: () => {
      toast.success(t('manuscriptsDetail.descriptionUpdated'));
      invalidate();
      setEditingId(null);
      setEditingSourceId(null);
    },
    onError: (err) => {
      toast.error(t('manuscriptsDetail.descriptionUpdateFailed'), {
        description: formatApiError(err),
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteDescription(token!, id),
    onSuccess: () => {
      toast.success(t('manuscriptsDetail.descriptionRemoved'));
      invalidate();
    },
    onError: (err) => {
      toast.error(t('manuscriptsDetail.descriptionRemoveFailed'), {
        description: formatApiError(err),
      });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t('manuscriptsDetail.descriptions')}</h3>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-3 w-3" />
          {tCommon('add')}
        </Button>
      </div>

      {descriptions.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground py-2">
          {t('manuscriptsDetail.noDescriptions')}
        </p>
      ) : (
        <div className="space-y-2">
          {descriptions.map((desc) => (
            <div key={desc.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between mb-2">
                {/* Source – click-to-edit dropdown */}
                {editingSourceId === desc.id ? (
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={editSourceValue}
                      onValueChange={(val) => {
                        setEditSourceValue(val);
                        updateMut.mutate({
                          id: desc.id,
                          data: { source: Number(val) },
                        });
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(sources ?? []).map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.label || s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setEditingSourceId(null)}
                      aria-label={t('manuscriptsDetail.cancelSourceEditAria')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="group inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
                    onClick={() => {
                      setEditingSourceId(desc.id);
                      setEditSourceValue(String(desc.source));
                    }}
                  >
                    {desc.source_label}
                    <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                  </button>
                )}

                <div className="flex gap-1">
                  {editingId === desc.id ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() =>
                          updateMut.mutate({
                            id: desc.id,
                            data: { content: editContent },
                          })
                        }
                        aria-label={t('manuscriptsDetail.saveDescriptionAria')}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setEditingId(null)}
                        aria-label={t('manuscriptsDetail.cancelDescriptionEditAria')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setEditingId(desc.id);
                          setEditContent(desc.content);
                        }}
                        aria-label={t('manuscriptsDetail.editDescriptionAria')}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMut.mutate(desc.id)}
                        aria-label={t('manuscriptsDetail.deleteDescriptionAria')}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {editingId === desc.id ? (
                <RichTextEditor
                  content={editContent}
                  onChange={(html) => setEditContent(html)}
                  placeholder={t('manuscriptsDetail.enterDescriptionPlaceholder')}
                  minimal
                />
              ) : (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(desc.content) }}
                />
              )}
            </div>
          ))}

          {adding && (
            <div className="rounded-md border p-3 space-y-2">
              <Select value={newSource} onValueChange={setNewSource}>
                <SelectTrigger className="h-8 text-sm w-48">
                  <SelectValue placeholder={t('manuscriptsDetail.selectSourcePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {(sources ?? []).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.label || s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <RichTextEditor
                content={newContent}
                onChange={(html) => setNewContent(html)}
                placeholder={t('manuscriptsDetail.enterDescriptionPlaceholder')}
                minimal
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => createMut.mutate()}
                  disabled={!newSource || !newContent.trim() || createMut.isPending}
                >
                  {tCommon('save')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAdding(false)}>
                  {tCommon('cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
