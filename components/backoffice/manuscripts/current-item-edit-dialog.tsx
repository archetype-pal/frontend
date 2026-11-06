'use client';

import { useMemo, useState, type ReactNode } from 'react';
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
import { CurrentItemCombobox } from './current-item-combobox';
import { useAuth } from '@/contexts/auth-context';
import { useModelLabels } from '@/contexts/model-labels-context';
import { getCurrentItem, updateCurrentItem } from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { toastApiError } from '@/lib/backoffice/format-api-error';
import { walkPaginated } from '@/lib/backoffice/walk-paginated';
import type { CurrentItemOption, ItemPartNested } from '@/types/backoffice';
import { useRepositories } from '@/hooks/backoffice/use-lookups';

interface CurrentItemValues {
  repository: number;
  shelfmark: string;
  description: string;
}

class DuplicateItemError extends Error {}

/** Refuses a repository and shelfmark another item already has, which the pickers cannot tell apart. */
async function assertNotDuplicate(itemId: number, { repository, shelfmark }: CurrentItemValues) {
  const items = await walkPaginated<CurrentItemOption>(
    `/api/v1/manuscripts/management/current-items/?repository=${repository}&limit=100`
  );
  const duplicate = items.some(
    (ci) => ci.id !== itemId && ci.shelfmark.toLowerCase() === shelfmark.toLowerCase()
  );
  if (duplicate) throw new DuplicateItemError();
}

export function CurrentItemEditDialog({
  itemId,
  open,
  onOpenChange,
  trigger,
  onCloseAutoFocus,
}: {
  itemId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactNode;
  onCloseAutoFocus?: () => void;
}) {
  const t = useTranslations('backoffice');
  const queryClient = useQueryClient();

  const saveMut = useMutation({
    mutationFn: async ({ values, moved }: { values: CurrentItemValues; moved: boolean }) => {
      if (moved) await assertNotDuplicate(itemId, values);
      return updateCurrentItem(itemId, values);
    },
    onSuccess: (saved) => {
      toast.success(t('physicalVolumes.toastUpdated'));
      // Reopening before the refetch below lands must not seed the form with the old values.
      queryClient.setQueryData<CurrentItemOption>(
        backofficeKeys.currentItems.detail(itemId),
        (old) => (old ? { ...old, ...saved } : old)
      );
      queryClient.invalidateQueries({ queryKey: backofficeKeys.currentItems.all() });
      queryClient.invalidateQueries({ queryKey: backofficeKeys.repositories.all() });
      queryClient.invalidateQueries({ queryKey: backofficeKeys.manuscripts.all() });
      queryClient.invalidateQueries({ queryKey: backofficeKeys.hands.all() });
      queryClient.invalidateQueries({ queryKey: backofficeKeys.scribes.all() });
      onOpenChange(false);
    },
    onError: (err) => {
      if (err instanceof DuplicateItemError) {
        toast.error(t('physicalVolumes.duplicateItem'));
      } else {
        toastApiError(t('physicalVolumes.toastFailedUpdate'), err);
      }
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saveMut.isPending) onOpenChange(next);
      }}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>{t('physicalVolumes.editTitle')}</DialogTitle>
        </DialogHeader>
        <CurrentItemForm
          itemId={itemId}
          saving={saveMut.isPending}
          onCancel={() => onOpenChange(false)}
          onSave={(values, moved) => saveMut.mutate({ values, moved })}
        />
      </DialogContent>
    </Dialog>
  );
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
  const [open, setOpen] = useState(false);

  return (
    <CurrentItemEditDialog
      itemId={itemId}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button type="button" variant="ghost" size="icon" className={className} aria-label={label}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      }
    />
  );
}

export function CurrentItemPicker({
  part,
  value,
  onChange,
}: {
  part: ItemPartNested;
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const t = useTranslations('backoffice');
  const savedLabel = part.current_item_display ?? '';
  const [pickerKey, setPickerKey] = useState(savedLabel);
  if (value === part.current_item && pickerKey !== savedLabel) {
    setPickerKey(savedLabel);
  }

  return (
    <div className="flex items-center gap-1">
      <CurrentItemCombobox
        key={pickerKey}
        value={value}
        onChange={onChange}
        selectedLabel={part.current_item_display}
        className="min-w-0 flex-1"
      />
      {part.current_item != null && value === part.current_item && (
        <CurrentItemEditButton
          itemId={part.current_item}
          label={t('physicalVolumes.editAriaLabel', {
            repo: part.repository_name ?? '',
            shelfmark: part.shelfmark ?? '',
          })}
          className="h-9 w-9 shrink-0"
        />
      )}
    </div>
  );
}

interface CurrentItemFormProps {
  saving: boolean;
  onCancel: () => void;
  onSave: (values: CurrentItemValues, moved: boolean) => void;
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

  const trimmedShelfmark = shelfmark.trim();
  const moved = Number(repository) !== item.repository || trimmedShelfmark !== item.shelfmark;

  return (
    <>
      <DialogBody className="space-y-4">
        {item.part_count > 1 && (
          <p className="text-sm text-muted-foreground">
            {t('physicalVolumes.sharedItemNote', { count: item.part_count })}
          </p>
        )}
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
              onSave(
                { repository: Number(repository), shelfmark: trimmedShelfmark, description },
                moved
              );
            }
          }}
          disabled={
            !repository || !trimmedShelfmark || (!moved && description === item.description)
          }
        >
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          {tCommon('save')}
        </Button>
      </DialogFooter>
    </>
  );
}
