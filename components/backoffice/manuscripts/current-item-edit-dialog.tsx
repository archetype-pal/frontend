'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { FieldLabel } from '@/components/backoffice/common/help-tooltip';
import { BackofficeInlineError } from '@/components/backoffice/common/query-state';
import { useAuth } from '@/contexts/auth-context';
import { useModelLabels } from '@/contexts/model-labels-context';
import { getCurrentItem, updateCurrentItem } from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { toastApiError } from '@/lib/backoffice/format-api-error';
import type { CurrentItemOption } from '@/types/backoffice';
import { useRepositories } from '@/hooks/backoffice/use-lookups';

interface CurrentItemValues {
  repository: number;
  shelfmark: string;
  description: string;
}

export function CurrentItemEditButton({
  itemId,
  label,
  className,
}: {
  itemId: number;
  label: string;
  className?: string;
}) {
  const t = useTranslations('backoffice');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const saveMut = useMutation({
    mutationFn: (values: CurrentItemValues) => updateCurrentItem(itemId, values),
    onSuccess: () => {
      toast.success(t('physicalVolumes.toastUpdated'));
      queryClient.invalidateQueries({ queryKey: backofficeKeys.currentItems.all() });
      queryClient.invalidateQueries({ queryKey: backofficeKeys.manuscripts.all() });
      queryClient.invalidateQueries({ queryKey: backofficeKeys.hands.all() });
      queryClient.invalidateQueries({ queryKey: backofficeKeys.scribes.all() });
      setOpen(false);
    },
    onError: (err) => {
      toastApiError(t('physicalVolumes.toastFailedUpdate'), err);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saveMut.isPending) setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className={className} aria-label={label}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('physicalVolumes.editTitle')}</DialogTitle>
        </DialogHeader>
        <CurrentItemForm
          itemId={itemId}
          saving={saveMut.isPending}
          onCancel={() => setOpen(false)}
          onSave={(values) => saveMut.mutate(values)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface CurrentItemFormProps {
  saving: boolean;
  onCancel: () => void;
  onSave: (values: CurrentItemValues) => void;
}

function CurrentItemForm({ itemId, ...props }: CurrentItemFormProps & { itemId: number }) {
  const t = useTranslations('backoffice');
  const { isAuthenticated } = useAuth();

  const {
    data: item,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: backofficeKeys.currentItems.detail(itemId),
    queryFn: () => getCurrentItem(itemId),
    enabled: isAuthenticated,
    gcTime: 0,
  });

  if (item) return <CurrentItemFields item={item} {...props} />;

  return (
    <DialogBody className="pb-5">
      {isError ? (
        <BackofficeInlineError
          message={t('physicalVolumes.loadFailed')}
          retrying={isFetching}
          onRetry={() => refetch()}
        />
      ) : (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      )}
    </DialogBody>
  );
}

function CurrentItemFields({
  item,
  saving,
  onCancel,
  onSave,
}: CurrentItemFormProps & { item: CurrentItemOption }) {
  const t = useTranslations('backoffice');
  const tCommon = useTranslations('common');
  const { getLabel } = useModelLabels();
  const [repository, setRepository] = useState<string | null>(String(item.repository));
  const [shelfmark, setShelfmark] = useState(item.shelfmark);
  const [description, setDescription] = useState(item.description);

  const {
    data: repositories,
    isError: repositoriesFailed,
    isFetching: repositoriesFetching,
    refetch: refetchRepositories,
  } = useRepositories();

  const repositoryOptions = useMemo(
    () =>
      (repositories ?? []).map((r) => ({
        value: String(r.id),
        label: r.label && r.label !== r.name ? `${r.label} (${r.name})` : r.name,
      })),
    [repositories]
  );

  return (
    <>
      <DialogBody className="space-y-4">
        <div className="space-y-1.5">
          <FieldLabel required htmlFor="current-item-repository">
            {t('manuscriptsNew.fieldRepository')}
          </FieldLabel>
          <SearchableSelect
            id="current-item-repository"
            options={repositoryOptions}
            value={repository}
            onValueChange={setRepository}
            placeholder={
              repositories ? t('manuscriptsNew.repositoryPlaceholder') : item.repository_name
            }
            searchPlaceholder={t('physicalVolumes.searchRepositoriesPlaceholder')}
            emptyText={t('physicalVolumes.noRepositoriesFound')}
            clearLabel={tCommon('clear')}
            disabled={!repositories}
          />
          {repositoriesFailed && (
            <BackofficeInlineError
              message={t('repositories.loadFailed')}
              retrying={repositoriesFetching}
              onRetry={() => refetchRepositories()}
            />
          )}
        </div>
        <div className="space-y-1.5">
          <FieldLabel required htmlFor="current-item-shelfmark">
            {getLabel('fieldShelfmark')}
          </FieldLabel>
          <Input
            id="current-item-shelfmark"
            value={shelfmark}
            onChange={(e) => setShelfmark(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel htmlFor="current-item-description">
            {t('physicalVolumes.colDescription')}
          </FieldLabel>
          <textarea
            id="current-item-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('manuscriptsDetail.optionalPlaceholder')}
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          {tCommon('cancel')}
        </Button>
        <Button
          onClick={() => {
            if (!saving) {
              onSave({ repository: Number(repository), shelfmark: shelfmark.trim(), description });
            }
          }}
          disabled={!repository || !shelfmark.trim()}
        >
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          {tCommon('save')}
        </Button>
      </DialogFooter>
    </>
  );
}
