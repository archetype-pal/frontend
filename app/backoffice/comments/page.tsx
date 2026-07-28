'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { MessageSquare, CheckCircle, XCircle, Trash2, Clock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { BackofficeErrorState } from '@/components/backoffice/common/query-state';
import { approveComment, rejectComment, deleteComment } from '@/services/backoffice/publications';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { runBulkAction } from '@/lib/backoffice/bulk-action';
import { walkPaginated } from '@/lib/backoffice/walk-paginated';
import { authFetch } from '@/lib/api-fetch';
import type { CommentItem } from '@/types/backoffice';

export default function CommentsPage() {
  const t = useTranslations('backoffice');
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [deleteTarget, setDeleteTarget] = useState<CommentItem | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | 'delete' | null>(null);

  // Walk all pages so the moderation queue shows every matching comment.
  // The earlier `getComments(token, ...)` returned only the first DRF page
  // (20), and the page has no pagination control — pending comments past
  // the 20th would be invisible to moderators until earlier ones cleared.
  const { data, isError, refetch } = useQuery({
    queryKey: backofficeKeys.comments.list(filter),
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100' });
      if (filter !== 'all') params.set('is_approved', String(filter === 'approved'));
      return walkPaginated<CommentItem>(
        `/api/v1/media/management/comments/?${params.toString()}`,
        (path) => authFetch(path, token!)
      );
    },
    enabled: !!token,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: backofficeKeys.comments.all() });
    setSelected(new Set());
  };

  const approveMut = useMutation({
    mutationFn: (id: number) => approveComment(token!, id),
    onSuccess: () => {
      toast.success(t('comments.toastApproved'));
      invalidate();
    },
    onError: (err) => {
      toast.error(t('comments.toastFailedApprove'), {
        description: formatApiError(err),
      });
    },
  });

  const rejectMut = useMutation({
    mutationFn: (id: number) => rejectComment(token!, id),
    onSuccess: () => {
      toast.success(t('comments.toastRejected'));
      invalidate();
    },
    onError: (err) => {
      toast.error(t('comments.toastFailedReject'), {
        description: formatApiError(err),
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteComment(token!, id),
    onSuccess: () => {
      toast.success(t('comments.toastDeleted'));
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(t('comments.toastFailedDelete'), {
        description: formatApiError(err),
      });
    },
  });

  const comments = data ?? [];

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === comments.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(comments.map((c) => c.id)));
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selected.size === 0) return;
    const ids = Array.from(selected);
    const opts = {
      approve: { action: (id: number) => approveComment(token!, id), pastTense: 'approved' },
      reject: { action: (id: number) => rejectComment(token!, id), pastTense: 'rejected' },
      delete: { action: (id: number) => deleteComment(token!, id), pastTense: 'deleted' },
    }[bulkAction];
    await runBulkAction({
      ids,
      action: opts.action,
      invalidate,
      pastTense: opts.pastTense,
      noun: 'comment',
    });
    setBulkConfirmOpen(false);
    setBulkAction(null);
  };

  const openBulkConfirm = (action: 'approve' | 'reject' | 'delete') => {
    setBulkAction(action);
    setBulkConfirmOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('comments.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('comments.subtitle', { count: data?.length ?? 0 })}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(['all', 'pending', 'approved'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setFilter(f);
              setSelected(new Set());
            }}
            className="capitalize"
          >
            {
              {
                all: t('comments.filterAll'),
                pending: t('comments.filterPending'),
                approved: t('comments.filterApproved'),
              }[f]
            }
          </Button>
        ))}
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">
            {t('comments.selectedCount', { count: selected.size })}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 text-green-600 hover:text-green-700"
              onClick={() => openBulkConfirm('approve')}
            >
              <CheckCircle className="h-3 w-3" />
              {t('comments.approveAll')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 text-amber-600 hover:text-amber-700"
              onClick={() => openBulkConfirm('reject')}
            >
              <XCircle className="h-3 w-3" />
              {t('comments.rejectAll')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => openBulkConfirm('delete')}
            >
              <Trash2 className="h-3 w-3" />
              {t('comments.deleteAll')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelected(new Set())}
            >
              {t('comments.clear')}
            </Button>
          </div>
        </div>
      )}

      {/* Comment list */}
      <div className="space-y-2">
        {comments.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              checked={
                selected.size === comments.length && comments.length > 0
                  ? true
                  : selected.size > 0
                    ? 'indeterminate'
                    : false
              }
              onCheckedChange={toggleSelectAll}
              aria-label={t('comments.selectAllAria')}
            />
            <span className="text-xs text-muted-foreground">
              {t('comments.selectAll', { count: comments.length })}
            </span>
          </div>
        )}
        {isError ? (
          <BackofficeErrorState message={t('comments.failedLoad')} onRetry={() => refetch()} />
        ) : comments.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <p className="text-sm">{t('comments.noComments')}</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selected.has(comment.id)}
                    onCheckedChange={() => toggleSelect(comment.id)}
                    aria-label={t('comments.selectAriaLabel', { name: comment.author_name })}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{comment.author_name}</span>
                      <span className="text-xs text-muted-foreground">{comment.author_email}</span>
                      {comment.is_approved ? (
                        <Badge variant="default" className="text-[10px] gap-0.5">
                          <CheckCircle className="h-3 w-3" />
                          {t('comments.badgeApproved')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] gap-0.5">
                          <Clock className="h-3 w-3" />
                          {t('comments.badgePending')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      on &ldquo;{comment.post_title}&rdquo; &middot;{' '}
                      {new Date(comment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!comment.is_approved && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-green-600 hover:text-green-700"
                      onClick={() => approveMut.mutate(comment.id)}
                      disabled={approveMut.isPending}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      {t('comments.approveButton')}
                    </Button>
                  )}
                  {comment.is_approved && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-amber-600 hover:text-amber-700"
                      onClick={() => rejectMut.mutate(comment.id)}
                      disabled={rejectMut.isPending}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      {t('comments.rejectButton')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(comment)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap pl-8">{comment.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Single delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('comments.singleDeleteTitle')}
        description={t('comments.singleDeleteDesc', { name: deleteTarget?.author_name ?? '' })}
        confirmLabel={t('comments.singleDeleteConfirm')}
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />

      {/* Bulk action confirmation */}
      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBulkConfirmOpen(false);
            setBulkAction(null);
          }
        }}
        title={t('comments.bulkConfirmTitle', {
          action:
            bulkAction === 'delete' ? 'Delete' : bulkAction === 'approve' ? 'Approve' : 'Reject',
          count: selected.size,
        })}
        description={
          bulkAction === 'delete'
            ? t('comments.bulkConfirmDescDelete', { count: selected.size })
            : t('comments.bulkConfirmDescAction', {
                count: selected.size,
                action: bulkAction === 'approve' ? 'approved' : 'rejected',
              })
        }
        confirmLabel={
          bulkAction === 'delete'
            ? t('comments.bulkDeleteConfirm')
            : bulkAction === 'approve'
              ? t('comments.bulkApproveConfirm')
              : t('comments.bulkRejectConfirm')
        }
        onConfirm={handleBulkAction}
      />
    </div>
  );
}
