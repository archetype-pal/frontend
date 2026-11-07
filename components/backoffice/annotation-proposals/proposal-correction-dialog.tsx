'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CheckCircle, ImageOff, Loader2, RotateCcw, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Skeleton } from '@/components/ui/skeleton';
import { ProposalBoxEditor } from '@/components/backoffice/annotation-proposals/proposal-box-editor';
import { acceptBlocker } from '@/lib/backoffice/proposal-accept';
import { formatAllographLabel } from '@/lib/allograph-labels';
import { toastApiError } from '@/lib/backoffice/format-api-error';
import {
  annotationFromBox,
  boxFromAnnotation,
  editorRegion,
  sameBox,
  type PageBox,
} from '@/lib/backoffice/proposal-box';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import {
  acceptAnnotationProposal,
  correctAnnotationProposal,
  type ProposalCorrection,
} from '@/services/backoffice/annotation-proposals';
import { getHands } from '@/services/backoffice/scribes';
import { fetchAllographSummaries } from '@/services/manuscripts';
import type { GraphProposalItem } from '@/types/backoffice';
import { fetchIiifImageInfo, type IIIFImageInfo } from '@/utils/iiif';

/** Every allograph, labelled as the viewer labels them. One small list, loaded once. */
export function useAllographOptions(enabled = true) {
  return useQuery({
    queryKey: backofficeKeys.allographs.summaries(),
    queryFn: fetchAllographSummaries,
    staleTime: Infinity,
    enabled,
    select: (allographs) =>
      allographs
        .map((allograph) => ({
          value: String(allograph.id),
          label: formatAllographLabel(allograph),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
  });
}

/** The page's size, which the flip between the stored box and the picture needs. */
function usePageSize(infoUrl: string | null) {
  const [page, setPage] = useState<{ url: string; info: IIIFImageInfo | null } | null>(null);
  useEffect(() => {
    if (!infoUrl) return;
    let cancelled = false;
    void fetchIiifImageInfo(infoUrl).then((info) => {
      if (!cancelled) setPage({ url: infoUrl, info });
    });
    return () => {
      cancelled = true;
    };
  }, [infoUrl]);
  if (!infoUrl) return { loading: false, info: null };
  return page?.url === infoUrl
    ? { loading: false, info: page.info }
    : { loading: true, info: null };
}

/**
 * Correct a pending proposal's letter, hand or box, then save it back to the
 * queue or accept it as corrected.
 *
 * Only what changed is sent. The proposal stays pending after a save: it
 * becomes an annotation only when someone accepts it, and the queue keeps what
 * the model first proposed.
 */
export function ProposalCorrectionDialog({
  proposal,
  open,
  onOpenChange,
  onCorrected,
}: {
  proposal: GraphProposalItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCorrected: () => void;
}) {
  const t = useTranslations('backoffice.annotationProposals');
  const page = usePageSize(proposal.image_iiif);
  const filedBox = useMemo(
    () => (page.info ? boxFromAnnotation(proposal.annotation, page.info.height) : null),
    [page.info, proposal.annotation]
  );
  const region = useMemo(
    () => (filedBox && page.info ? editorRegion(filedBox, page.info) : null),
    [filedBox, page.info]
  );
  const [edited, setEdited] = useState<PageBox | null>(null);
  const box = edited ?? filedBox;
  const [allograph, setAllograph] = useState<string | null>(
    proposal.allograph == null ? null : String(proposal.allograph)
  );
  const [hand, setHand] = useState<string | null>(
    proposal.hand == null ? null : String(proposal.hand)
  );

  const allographs = useAllographOptions();
  const hands = useQuery({
    queryKey: backofficeKeys.hands.list({ item_part: proposal.item_part }),
    queryFn: () => getHands({ item_part: proposal.item_part, limit: 200 }),
    select: (reply) => reply.results.map((h) => ({ value: String(h.id), label: h.name })),
  });

  const changes: ProposalCorrection = {};
  if (allograph != null && Number(allograph) !== proposal.allograph) {
    changes.allograph = Number(allograph);
  }
  if (hand != null && Number(hand) !== proposal.hand) changes.hand = Number(hand);
  if (box && filedBox && page.info && !sameBox(box, filedBox)) {
    changes.annotation = annotationFromBox(box, page.info.height);
  }
  const changed = Object.keys(changes).length > 0;
  const blocker = acceptBlocker({
    annotation_type: proposal.annotation_type,
    allograph: allograph == null ? null : Number(allograph),
    hand: hand == null ? null : Number(hand),
  });

  const save = useMutation({
    mutationFn: async (andAccept: boolean) => {
      if (changed) await correctAnnotationProposal(proposal.id, changes);
      if (andAccept) await acceptAnnotationProposal(proposal.id);
      return andAccept;
    },
    onSuccess: (accepted) => {
      toast.success(accepted ? t('toastCorrectedAccepted') : t('toastCorrected'));
      onOpenChange(false);
    },
    onError: (err) => toastApiError(t('toastCorrectFailed'), err),
    // A correction saved before an accept failed is still saved: show it.
    onSettled: onCorrected,
  });

  const label = t('cropAltNoLetter', { page: proposal.image_display });
  return (
    <Dialog open={open} onOpenChange={(next) => !save.isPending && onOpenChange(next)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('correctTitle', { id: proposal.id })}</DialogTitle>
          <DialogDescription>{t('correctIntro')}</DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3">
          {page.loading ? (
            <Skeleton className="mx-auto h-[360px] w-[360px] rounded-md" />
          ) : proposal.image_iiif && region && box ? (
            <div className="space-y-1.5">
              <ProposalBoxEditor
                infoUrl={proposal.image_iiif}
                region={region}
                box={box}
                onChange={setEdited}
                label={label}
              />
              {/* Always rendered: appearing on the first change would grow the
                  centred dialog and shift the page under the pointer mid-drag. */}
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setEdited(null)}
                  disabled={!changes.annotation}
                >
                  <RotateCcw className="h-3 w-3" aria-hidden />
                  {t('resetBox')}
                </Button>
              </div>
            </div>
          ) : (
            <p className="flex items-center justify-center gap-2 rounded-md border bg-muted p-6 text-sm text-muted-foreground">
              <ImageOff className="h-4 w-4" aria-hidden />
              {t('boxUnavailable')}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`proposal-${proposal.id}-allograph`}>{t('allographLabel')}</Label>
              <SearchableSelect
                id={`proposal-${proposal.id}-allograph`}
                options={allographs.data ?? []}
                value={allograph}
                onValueChange={(value) => value != null && setAllograph(value)}
                placeholder={
                  allographs.isPending
                    ? t('loadingOptions')
                    : allographs.isError
                      ? t('optionsFailed')
                      : t('allographPlaceholder')
                }
                searchPlaceholder={t('allographSearch')}
                emptyText={t('noMatches')}
                disabled={allographs.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`proposal-${proposal.id}-hand`}>{t('handLabel')}</Label>
              <SearchableSelect
                id={`proposal-${proposal.id}-hand`}
                options={hands.data ?? []}
                value={hand}
                onValueChange={(value) => value != null && setHand(value)}
                placeholder={
                  hands.isPending
                    ? t('loadingOptions')
                    : hands.isError
                      ? t('optionsFailed')
                      : hands.data?.length
                        ? t('handPlaceholder')
                        : t('noHandsForPart')
                }
                searchPlaceholder={t('handSearch')}
                emptyText={t('noMatches')}
                disabled={hands.isPending || !hands.data?.length}
              />
            </div>
          </div>

          {blocker && <p className="text-xs text-amber-700 dark:text-amber-400">{t(blocker)}</p>}
        </DialogBody>

        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={save.isPending}
          >
            {t('correctCancel')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => save.mutate(false)}
            disabled={save.isPending || !changed}
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            {t('correctSave')}
          </Button>
          <Button
            size="sm"
            className="gap-1"
            onClick={() => save.mutate(true)}
            disabled={save.isPending || blocker != null}
          >
            {save.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <CheckCircle className="h-3.5 w-3.5" aria-hidden />
            )}
            {changed ? t('correctAndAccept') : t('accept')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
