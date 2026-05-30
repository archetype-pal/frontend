'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { useUnsavedGuard } from '@/hooks/backoffice/use-unsaved-guard';
import { useKeyboardShortcut } from '@/hooks/backoffice/use-keyboard-shortcut';

interface EntityEditorConfig<TDetail, TForm extends object> {
  id: number;
  /** Query key for the detail fetch. */
  queryKey: QueryKey;
  /** Keys to invalidate after save/delete (typically [detail, list]). */
  invalidateKeys: QueryKey[];
  fetchFn: (token: string, id: number) => Promise<TDetail>;
  /** Derive the editable form from the fetched entity. */
  toForm: (entity: TDetail) => TForm;
  saveFn: (token: string, id: number, form: TForm) => Promise<unknown>;
  deleteFn: (token: string, id: number) => Promise<void>;
  /** Where to navigate after a successful delete. */
  listRoute: string;
  /** Entity label for toasts, e.g. "Scribe". */
  label: string;
}

/**
 * The backoffice detail-editor scaffold, extracted from the per-entity detail
 * pages (scribes/hands/…): fetch the entity, mirror it into editable form state,
 * track a dirty flag, save/delete via mutations (toast + cache invalidation +
 * navigate-after-delete), wire Cmd+S, and warn on unsaved navigation.
 *
 * `form` is null until the entity loads; pages should guard
 * `if (isError) … ; if (isLoading || !form) …` before rendering inputs, which
 * narrows `form` to non-null.
 */
export function useEntityEditor<TDetail, TForm extends object>(
  config: EntityEditorConfig<TDetail, TForm>
) {
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: entity,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: config.queryKey,
    queryFn: () => config.fetchFn(token!, config.id),
    enabled: !!token,
  });

  const [form, setFormState] = useState<TForm | null>(null);
  const [dirty, setDirty] = useState(false);

  // Mirror the fetched entity into editable form state. Gate on `entity` only —
  // the config callbacks aren't referentially stable (same as the hand-rolled
  // pages this replaces).
  useEffect(() => {
    if (entity) {
      setFormState(config.toForm(entity));
      setDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);

  const setForm = (patch: Partial<TForm>) => {
    setFormState((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  };

  useUnsavedGuard(dirty);

  const invalidate = () => {
    for (const key of config.invalidateKeys) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  };

  const saveMut = useMutation({
    mutationFn: () => config.saveFn(token!, config.id, form as TForm),
    onSuccess: () => {
      toast.success(`${config.label} saved`);
      invalidate();
      setDirty(false);
    },
    onError: (err) => {
      toast.error(`Failed to save ${config.label.toLowerCase()}`, {
        description: formatApiError(err),
      });
    },
  });

  useKeyboardShortcut(
    'mod+s',
    () => {
      if (dirty && !saveMut.isPending) saveMut.mutate();
    },
    dirty
  );

  const deleteMut = useMutation({
    mutationFn: () => config.deleteFn(token!, config.id),
    onSuccess: () => {
      toast.success(`${config.label} deleted`);
      invalidate();
      router.push(config.listRoute);
    },
    onError: (err) => {
      toast.error(`Failed to delete ${config.label.toLowerCase()}`, {
        description: formatApiError(err),
      });
    },
  });

  return {
    entity,
    isLoading,
    isError,
    refetch,
    form,
    setForm,
    dirty,
    save: () => saveMut.mutate(),
    isSaving: saveMut.isPending,
    remove: () => deleteMut.mutate(),
    isDeleting: deleteMut.isPending,
  };
}
