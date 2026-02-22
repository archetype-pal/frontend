'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { MessageSquare, CheckCircle, XCircle, Trash2, Clock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import {
  getComments,
  approveComment,
  rejectComment,
  deleteComment,
} from '@/services/backoffice/publications';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import type { CommentItem } from '@/types/backoffice';

export default function CommentsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [deleteTarget, setDeleteTarget] = useState<CommentItem | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | 'delete' | null>(null);

  const { data } = useQuery({
    queryKey: backofficeKeys.comments.list(filter),
    queryFn: () =>
      getComments(token!, filter === 'all' ? undefined : { is_approved: filter === 'approved' }),
    enabled: !!token,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: backofficeKeys.comments.all() });
    setSelected(new Set());
  };

  const approveMut = useMutation({
    mutationFn: (id: number) => approveComment(token!, id),
    onSuccess: () => {
      toast.success('Comment approved');
      invalidate();
    },
    onError: (err) => {
      toast.error('Failed to approve comment', {
        description: formatApiError(err),
      });
    },
  });

  const rejectMut = useMutation({
    mutationFn: (id: number) => rejectComment(token!, id),
    onSuccess: () => {
      toast.success('Comment rejected');
      invalidate();
    },
    onError: (err) => {
      toast.error('Failed to reject comment', {
        description: formatApiError(err),
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteComment(token!, id),
    onSuccess: () => {
      toast.success('Comment deleted');
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error('Failed to delete comment', {
        description: formatApiError(err),
      });
    },
  });

  const comments = data?.results ?? [];

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
    try {
      if (bulkAction === 'approve') {
        await Promise.all(ids.map((id) => approveComment(token!, id)));
        toast.success(`${ids.length} comment(s) approved`);
      } else if (bulkAction === 'reject') {
        await Promise.all(ids.map((id) => rejectComment(token!, id)));
        toast.success(`${ids.length} comment(s) rejected`);
      } else if (bulkAction === 'delete') {
        await Promise.all(ids.map((id) => deleteComment(token!, id)));
        toast.success(`${ids.length} comment(s) deleted`);
      }
      invalidate();
    } catch {
      toast.error(`Failed to ${bulkAction} some comments`);
    }
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
          <h1 className="text-2xl font-semibold tracking-tight">Comment Moderation</h1>
          <p className="text-sm text-muted-foreground">{data?.count ?? '...'} comments</p>
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
            {f}
          </Button>
        ))}
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 text-green-600 hover:text-green-700"
              onClick={() => openBulkConfirm('approve')}
            >
              <CheckCircle className="h-3 w-3" />
              Approve All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 text-amber-600 hover:text-amber-700"
              onClick={() => openBulkConfirm('reject')}
            >
              <XCircle className="h-3 w-3" />
              Reject All
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => openBulkConfirm('delete')}
            >
              <Trash2 className="h-3 w-3" />
              Delete All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelected(new Set())}
            >
              Clear
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
              aria-label="Select all"
            />
            <span className="text-xs text-muted-foreground">Select all ({comments.length})</span>
          </div>
        )}
        {comments.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <p className="text-sm">No comments to show.</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selected.has(comment.id)}
                    onCheckedChange={() => toggleSelect(comment.id)}
                    aria-label={`Select comment by ${comment.author_name}`}
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{comment.author_name}</span>
                      <span className="text-xs text-muted-foreground">{comment.author_email}</span>
                      {comment.is_approved ? (
                        <Badge variant="default" className="text-[10px] gap-0.5">
                          <CheckCircle className="h-3 w-3" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] gap-0.5">
                          <Clock className="h-3 w-3" />
                          Pending
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
                      Approve
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
                      Reject
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
        title="Delete this comment?"
        description={`Comment by "${deleteTarget?.author_name}" will be permanently deleted.`}
        confirmLabel="Delete"
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
        title={`${bulkAction === 'delete' ? 'Delete' : bulkAction === 'approve' ? 'Approve' : 'Reject'} ${selected.size} comment(s)?`}
        description={
          bulkAction === 'delete'
            ? `${selected.size} comment(s) will be permanently deleted.`
            : `${selected.size} comment(s) will be ${bulkAction === 'approve' ? 'approved' : 'rejected'}.`
        }
        confirmLabel={
          bulkAction === 'delete'
            ? 'Delete All'
            : bulkAction === 'approve'
              ? 'Approve All'
              : 'Reject All'
        }
        onConfirm={handleBulkAction}
      />
    </div>
  );
}
