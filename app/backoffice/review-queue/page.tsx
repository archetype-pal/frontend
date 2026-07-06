'use client';

/**
 * Phase G.1 — `/backoffice/review-queue` route.
 *
 * Staff-only feed of `ImageText` rows in `Review` status, oldest-first.
 * Each row shows the latest transition (who sent it, when, with what
 * note) so reviewers can triage without opening every entry.
 *
 * Approve → flips to `Live`. Send back → flips to `Draft` with a
 * required note. Both go through the same `transitionImageText`
 * service so the audit trail stays honest.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/contexts/auth-context';
import {
  fetchReviewQueue,
  transitionImageText,
  type QueueEntry,
} from '@/services/backoffice/review-queue';
import { Button } from '@/components/ui/button';

export default function ReviewQueuePage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const t = useTranslations('backoffice');

  const { data: queue = [], isLoading } = useQuery<QueueEntry[]>({
    queryKey: ['review-queue'],
    queryFn: () => fetchReviewQueue(token!),
    enabled: !!token,
    refetchInterval: 60_000,
  });

  if (!token) {
    return (
      <div className="px-6 py-8 text-sm text-muted-foreground">
        {t('reviewQueue.signInPrompt')}
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (queue.length === 0) {
    return (
      <div className="px-6 py-8 text-sm text-muted-foreground">{t('reviewQueue.emptyState')}</div>
    );
  }

  return (
    <div className="space-y-4 px-6 py-8">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {t('reviewQueue.pageTitle')}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t('reviewQueue.subtitle', { count: queue.length })}
        </p>
      </header>
      <ul className="space-y-2">
        {queue.map((row) => (
          <ReviewRow
            key={row.id}
            row={row}
            onTransitioned={() => queryClient.invalidateQueries({ queryKey: ['review-queue'] })}
            token={token}
          />
        ))}
      </ul>
    </div>
  );
}

function ReviewRow({
  row,
  token,
  onTransitioned,
}: {
  row: QueueEntry;
  token: string;
  onTransitioned: () => void;
}) {
  const [note, setNote] = useState('');
  const t = useTranslations('backoffice');
  const approve = useMutation({
    mutationFn: () => transitionImageText(token, row.id, { to_status: 'Live' }),
    onSuccess: () => {
      toast.success(t('reviewQueue.toastApproved'));
      onTransitioned();
    },
    onError: (err: Error) =>
      toast.error(t('reviewQueue.toastApproveFailed'), { description: err.message }),
  });
  const sendBack = useMutation({
    mutationFn: () => {
      if (!note.trim()) {
        return Promise.reject(new Error('Add a note explaining what needs changing.'));
      }
      return transitionImageText(token, row.id, { to_status: 'Draft', note });
    },
    onSuccess: () => {
      toast.success(t('reviewQueue.toastSentBack'));
      setNote('');
      onTransitioned();
    },
    onError: (err: Error) =>
      toast.error(t('reviewQueue.toastSendBackFailed'), { description: err.message }),
  });

  return (
    <li className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link href={`/backoffice/image-texts/${row.id}`} className="font-medium hover:underline">
            #{row.id} — {row.type} on image {row.item_image}
          </Link>
          {row.last_transition ? (
            <p className="text-xs text-muted-foreground">
              Sent for review by <strong>{row.last_transition.actor_username ?? 'unknown'}</strong>{' '}
              on {new Date(row.last_transition.created).toLocaleString()}
              {row.last_transition.note ? ` — “${row.last_transition.note}”` : ''}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">{t('reviewQueue.noTransitionHistory')}</p>
          )}
          {row.review_assignee_username ? (
            <p className="text-xs">
              Assigned to <strong>{row.review_assignee_username}</strong>
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
          <Button
            size="sm"
            onClick={() => approve.mutate()}
            disabled={approve.isPending}
            className="h-7"
          >
            {approve.isPending
              ? t('reviewQueue.approvingButton')
              : t('reviewQueue.approveButton')}
          </Button>
          <input
            type="text"
            placeholder={t('reviewQueue.notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="h-7 w-72 rounded-md border bg-background px-2 text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => sendBack.mutate()}
            disabled={sendBack.isPending}
            className="h-7"
          >
            {sendBack.isPending ? t('reviewQueue.sendingButton') : t('reviewQueue.sendBackButton')}
          </Button>
        </div>
      </div>
    </li>
  );
}
