'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, ExternalLink, PencilLine, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RelativeTime } from '@/components/backoffice/relative-time';
import { ProposalCropView } from '@/components/backoffice/annotation-proposals/proposal-crop-view';
import {
  ProposalCorrectionDialog,
  useAllographOptions,
} from '@/components/backoffice/annotation-proposals/proposal-correction-dialog';
import { toastApiError } from '@/lib/backoffice/format-api-error';
import { acceptBlocker } from '@/lib/backoffice/proposal-accept';
import {
  acceptAnnotationProposal,
  rejectAnnotationProposal,
} from '@/services/backoffice/annotation-proposals';
import type { GraphProposalItem } from '@/types/backoffice';

export function ProposalRow({
  proposal,
  selected,
  onToggleSelected,
  onDecided,
}: {
  proposal: GraphProposalItem;
  selected: boolean;
  onToggleSelected: () => void;
  onDecided: () => void;
}) {
  const t = useTranslations('backoffice');
  const [reason, setReason] = useState('');
  const [correcting, setCorrecting] = useState(false);
  const pending = proposal.status === 'pending';
  const blocker = acceptBlocker(proposal);
  const filed = proposal.proposed;
  const letterChanged = filed != null && filed.allograph !== proposal.allograph;
  const boxChanged =
    filed != null && JSON.stringify(filed.annotation) !== JSON.stringify(proposal.annotation);
  // The model's letter by name, from the list the correction picker loads anyway.
  const allographs = useAllographOptions(letterChanged && filed?.allograph != null);
  const filedLetter =
    filed?.allograph == null
      ? null
      : (allographs.data?.find((option) => option.value === String(filed.allograph))?.label ??
        `#${filed.allograph}`);

  const accept = useMutation({
    mutationFn: () => acceptAnnotationProposal(proposal.id),
    onSuccess: () => {
      toast.success(t('annotationProposals.toastAccepted'));
      onDecided();
    },
    onError: (err) => toastApiError(t('annotationProposals.toastAcceptFailed'), err),
  });
  const reject = useMutation({
    mutationFn: () => rejectAnnotationProposal(proposal.id, reason.trim()),
    onSuccess: () => {
      toast.success(t('annotationProposals.toastRejected'));
      setReason('');
      onDecided();
    },
    onError: (err) => toastApiError(t('annotationProposals.toastRejectFailed'), err),
  });
  const deciding = accept.isPending || reject.isPending;

  const cropLabel = proposal.allograph_name
    ? t('annotationProposals.cropAlt', {
        letter: proposal.allograph_name,
        page: proposal.image_display,
      })
    : t('annotationProposals.cropAltNoLetter', { page: proposal.image_display });

  return (
    <li className="flex flex-wrap items-start gap-4 rounded-lg border bg-card p-3 shadow-sm sm:flex-nowrap">
      {pending && (
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelected}
          aria-label={t('annotationProposals.selectAria', { id: proposal.id })}
          className="mt-1"
        />
      )}
      <ProposalCropView
        infoUrl={proposal.image_iiif}
        annotation={proposal.annotation}
        label={cropLabel}
      />

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {proposal.allograph_name ? (
            <Badge variant="outline" className="font-mono text-sm">
              {proposal.allograph_name}
            </Badge>
          ) : (
            <Badge variant="secondary">{t('annotationProposals.noAllographBadge')}</Badge>
          )}
          {proposal.confidence != null && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {t('annotationProposals.confidence', {
                value: Math.round(Math.min(1, Math.max(0, proposal.confidence)) * 100),
              })}
            </span>
          )}
          <span className="text-xs tabular-nums text-muted-foreground">#{proposal.id}</span>
        </div>

        <p className="text-sm">
          {proposal.hand_name
            ? t('annotationProposals.hand', { name: proposal.hand_name })
            : t('annotationProposals.handMissing')}
        </p>

        <p className="text-xs text-muted-foreground">
          <Link
            href={`/manuscripts/${proposal.historical_item}/images/${proposal.item_image}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {proposal.image_display}
            <ExternalLink className="h-3 w-3" aria-hidden />
            <span className="sr-only">{t('annotationProposals.opensInNewTab')}</span>
          </Link>
        </p>

        <p className="text-xs text-muted-foreground">
          {proposal.model_name
            ? t('annotationProposals.proposedBy', { model: proposal.model_name })
            : t('annotationProposals.proposedByUnknown')}{' '}
          · <RelativeTime iso={proposal.created} />
        </p>

        {filed && (
          <p className="text-xs text-muted-foreground">
            {t('annotationProposals.correctedBy', {
              name: proposal.corrected_by_username || t('annotationProposals.someone'),
            })}
            {letterChanged && (
              <>
                {' · '}
                {filedLetter
                  ? t('annotationProposals.modelProposedLetter', { letter: filedLetter })
                  : t('annotationProposals.modelProposedNoLetter')}
              </>
            )}
            {boxChanged && <> · {t('annotationProposals.boxRedrawn')}</>}
            {proposal.corrected && (
              <>
                {' '}
                · <RelativeTime iso={proposal.corrected} />
              </>
            )}
          </p>
        )}

        {pending && blocker && (
          <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {t(`annotationProposals.${blocker}`)}
          </p>
        )}

        {!pending && (
          <p className="text-xs text-muted-foreground">
            {proposal.status === 'accepted'
              ? t('annotationProposals.acceptedBy', {
                  name: proposal.reviewer_username || t('annotationProposals.someone'),
                })
              : t('annotationProposals.rejectedBy', {
                  name: proposal.reviewer_username || t('annotationProposals.someone'),
                })}
            {proposal.reviewed && (
              <>
                {' '}
                · <RelativeTime iso={proposal.reviewed} />
              </>
            )}
            {proposal.reason && <> · “{proposal.reason}”</>}
          </p>
        )}
      </div>

      {pending ? (
        <div className="flex w-full flex-col items-stretch gap-1.5 sm:w-56">
          <Button
            size="sm"
            className="h-8 gap-1"
            onClick={() => accept.mutate()}
            disabled={deciding || blocker != null}
          >
            <CheckCircle className="h-3.5 w-3.5" aria-hidden />
            {accept.isPending
              ? t('annotationProposals.accepting')
              : t('annotationProposals.accept')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1"
            onClick={() => setCorrecting(true)}
            disabled={deciding}
            aria-label={t('annotationProposals.correctAria', { id: proposal.id })}
          >
            <PencilLine className="h-3.5 w-3.5" aria-hidden />
            {t('annotationProposals.correct')}
          </Button>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={2000}
            placeholder={t('annotationProposals.reasonPlaceholder')}
            aria-label={t('annotationProposals.reasonLabel', { id: proposal.id })}
            className="h-8 rounded-md border bg-background px-2 text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1"
            onClick={() => reject.mutate()}
            disabled={deciding}
          >
            <XCircle className="h-3.5 w-3.5" aria-hidden />
            {reject.isPending
              ? t('annotationProposals.rejecting')
              : t('annotationProposals.reject')}
          </Button>
        </div>
      ) : (
        <Badge variant={proposal.status === 'accepted' ? 'default' : 'secondary'}>
          {proposal.status === 'accepted'
            ? t('annotationProposals.badgeAccepted')
            : t('annotationProposals.badgeRejected')}
        </Badge>
      )}
      {correcting && (
        <ProposalCorrectionDialog
          proposal={proposal}
          open={correcting}
          onOpenChange={setCorrecting}
          onCorrected={onDecided}
        />
      )}
    </li>
  );
}
