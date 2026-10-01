'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { ChevronRight, Loader2, PenTool, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { FieldLabel } from '@/components/backoffice/common/help-tooltip';
import { useAuth } from '@/contexts/auth-context';
import { createHand } from '@/services/backoffice/scribes';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { walkPaginated } from '@/lib/backoffice/walk-paginated';
import { proxyFetch } from '@/lib/api-fetch';
import type { AdminHandListItem, AdminScribeListItem } from '@/types/backoffice';

/** The hands of one item part, with a dialog to add one. Saves on its own, not via "Save Part". */
export function ItemPartHandsSection({ itemPartId }: { itemPartId: number }) {
  const t = useTranslations('backoffice');
  const { token } = useAuth();
  const [addOpen, setAddOpen] = useState(false);

  const {
    data: hands,
    isLoading,
    isError,
  } = useQuery({
    queryKey: backofficeKeys.hands.list({ item_part: itemPartId }),
    queryFn: () =>
      walkPaginated<AdminHandListItem>(
        `/api/v1/management/scribes/hands/?item_part=${itemPartId}&limit=100`,
        (path) => proxyFetch(path)
      ),
    enabled: !!token,
  });

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          {hands
            ? t('manuscriptsDetail.handsHeading', { count: hands.length })
            : t('manuscriptsDetail.handsTitle')}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-3 w-3" />
          {t('manuscriptsDetail.addHand')}
        </Button>
      </div>

      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : isError ? (
        <p className="text-xs text-destructive">{t('manuscriptsDetail.handsLoadFailed')}</p>
      ) : hands && hands.length > 0 ? (
        <div className="rounded-md border divide-y">
          {hands.map((hand) => (
            <Link
              key={hand.id}
              href={`/backoffice/hands/${hand.id}`}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
            >
              <PenTool className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 min-w-0 truncate">
                <span className="font-medium">{hand.name}</span>
                <span className="text-muted-foreground"> · {hand.scribe_name}</span>
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">{t('manuscriptsDetail.noHandsYet')}</p>
      )}

      {addOpen && <AddHandDialog itemPartId={itemPartId} onOpenChange={setAddOpen} />}
    </div>
  );
}

function AddHandDialog({
  itemPartId,
  onOpenChange,
}: {
  itemPartId: number;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('backoffice');
  const tCommon = useTranslations('common');
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [scribeId, setScribeId] = useState<string | null>(null);
  const [name, setName] = useState('');

  // Same key and query as the scribes page, so both share one cached list of every scribe.
  const { data: scribes, isLoading: scribesLoading } = useQuery({
    queryKey: backofficeKeys.scribes.list(),
    queryFn: () =>
      walkPaginated<AdminScribeListItem>('/api/v1/management/scribes/scribes/?limit=100', (path) =>
        proxyFetch(path)
      ),
    enabled: !!token,
  });

  const scribeOptions = useMemo(
    () => (scribes ?? []).map((scribe) => ({ value: String(scribe.id), label: scribe.name })),
    [scribes]
  );

  const createMut = useMutation({
    mutationFn: () =>
      createHand({ item_part: itemPartId, scribe: Number(scribeId), name: name.trim() }),
    onSuccess: () => {
      toast.success(t('manuscriptsDetail.handCreated'));
      queryClient.invalidateQueries({ queryKey: backofficeKeys.hands.all() });
      queryClient.invalidateQueries({ queryKey: backofficeKeys.scribes.all() });
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(t('manuscriptsDetail.handCreateFailed'), {
        description: formatApiError(err),
      });
    },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('manuscriptsDetail.newHandTitle')}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <FieldLabel required>{t('manuscriptsDetail.handScribe')}</FieldLabel>
            <SearchableSelect
              options={scribeOptions}
              value={scribeId}
              onValueChange={setScribeId}
              placeholder={t('manuscriptsDetail.selectScribePlaceholder')}
              searchPlaceholder={t('manuscriptsDetail.searchScribesPlaceholder')}
              emptyText={t('manuscriptsDetail.noScribesFound')}
              clearLabel={tCommon('clear')}
              disabled={scribesLoading}
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel required htmlFor="new-hand-name">
              {t('manuscriptsDetail.handName')}
            </FieldLabel>
            <Input
              id="new-hand-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('manuscriptsDetail.handNamePlaceholder')}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createMut.isPending}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={() => createMut.mutate()}
            disabled={!scribeId || !name.trim() || createMut.isPending}
          >
            {createMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {tCommon('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
