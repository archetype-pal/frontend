'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReviewers } from '@/hooks/backoffice/use-lookups';
import type { TransitionPayload } from '@/services/backoffice/review-queue';
import type { ImageTextStatus } from '@/types/image-text';
import type { UserListItem } from '@/types/backoffice';

export const IMAGE_TEXT_STATUSES: ImageTextStatus[] = ['Draft', 'Review', 'Live', 'Reviewed'];

// The default target is the next forward step, so the common path
// (Draft → Review → Live → Reviewed) is one click.
const NEXT: Record<ImageTextStatus, ImageTextStatus> = {
  Draft: 'Review',
  Review: 'Live',
  Live: 'Reviewed',
  Reviewed: 'Live',
};

const NO_REVIEWER = '__none';

function reviewerName(user: UserListItem): string {
  const fullName = `${user.first_name} ${user.last_name}`.trim();
  return fullName ? `${fullName} (${user.username})` : user.username;
}

/**
 * Moves a text, or a selection of texts when there is no `currentStatus`, to
 * another status, with an optional note for the history. Sending to Review can
 * name the reviewer, which the review queue shows. Closes once `onTransition`
 * resolves; a rejection (which the caller reports) leaves it open with the
 * note and the reviewer kept.
 */
export function TransitionPopover({
  currentStatus,
  label,
  compact = false,
  onTransition,
}: {
  currentStatus?: ImageTextStatus;
  label: string;
  /** The smaller trigger of a table row. */
  compact?: boolean;
  onTransition: (payload: TransitionPayload) => Promise<unknown>;
}) {
  const t = useTranslations('backoffice');
  const [open, setOpen] = useState(false);
  const firstTarget = currentStatus ? NEXT[currentStatus] : 'Review';
  const [target, setTarget] = useState<ImageTextStatus>(firstTarget);
  const [note, setNote] = useState('');
  const [reviewer, setReviewer] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const toReview = target === 'Review';
  const reviewers = useReviewers(open && toReview);

  async function apply() {
    setPending(true);
    try {
      await onTransition({
        to_status: target,
        note: note.trim() || undefined,
        ...(toReview && reviewer !== null ? { assignee: reviewer } : {}),
      });
      setOpen(false);
    } catch {
      // Reported by the caller; stay open so the note is not lost.
    } finally {
      setPending(false);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setTarget(firstTarget);
          setNote('');
          setReviewer(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={compact ? 'h-7 text-xs' : undefined}>
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        {currentStatus && (
          <div className="text-xs">
            <p className="text-muted-foreground">{t('imageTexts.transitionCurrent')}</p>
            <p className="font-medium">{currentStatus}</p>
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs">{t('imageTexts.transitionTargetLabel')}</Label>
          <Select value={target} onValueChange={(v) => setTarget(v as ImageTextStatus)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_TEXT_STATUSES.filter((s) => s !== currentStatus).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {toReview && (
          <div className="space-y-1.5">
            <Label htmlFor="transition-reviewer" className="text-xs">
              {t('imageTexts.transitionReviewerLabel')}
            </Label>
            <Select
              value={reviewer === null ? NO_REVIEWER : String(reviewer)}
              onValueChange={(v) => setReviewer(v === NO_REVIEWER ? null : Number(v))}
              disabled={!reviewers.data}
            >
              <SelectTrigger
                id="transition-reviewer"
                className="h-8 text-xs"
                aria-describedby="transition-reviewer-hint"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_REVIEWER}>
                  {t('imageTexts.transitionReviewerNone')}
                </SelectItem>
                {(reviewers.data ?? []).map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {reviewerName(user)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p id="transition-reviewer-hint" className="text-[11px] text-muted-foreground">
              {reviewers.isError
                ? t('imageTexts.transitionReviewersFailed')
                : t('imageTexts.transitionReviewerHint')}
            </p>
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs">{t('imageTexts.transitionNoteLabel')}</Label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('imageTexts.transitionNotePlaceholder')}
            className="h-8 text-xs"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>
            {t('imageTexts.transitionCancel')}
          </Button>
          <Button size="sm" className="h-7 text-xs" disabled={pending} onClick={() => void apply()}>
            {pending
              ? t('imageTexts.transitionSaving')
              : t('imageTexts.transitionApply', { target })}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
