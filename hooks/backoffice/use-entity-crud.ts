import { useState } from 'react';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import { formatApiError } from '@/lib/backoffice/format-api-error';

interface EntityCrudConfig<T extends { id: number; name: string }> {
  /** React-Query key(s) to invalidate on mutations. */
  queryKeys: QueryKey[];
  /** API call to create an entity by name. */
  createFn: (token: string, data: { name: string }) => Promise<T>;
  /** API call to rename an entity. */
  updateFn: (token: string, id: number, data: { name: string }) => Promise<T>;
  /** API call to delete an entity. */
  deleteFn: (token: string, id: number) => Promise<void>;
  /** Human-readable entity label for toast messages (e.g. "Component"). */
  entityLabel: string;
}

/**
 * Encapsulates the common create/rename/delete mutation pattern
 * shared by Component, Feature, and Position managers.
 */
export function useEntityCrud<T extends { id: number; name: string }>(config: EntityCrudConfig<T>) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  const invalidate = () => {
    for (const key of config.queryKeys) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  };

  const createMut = useMutation({
    mutationFn: (name: string) => config.createFn(token!, { name }),
    onSuccess: () => {
      invalidate();
      setNewName('');
      toast.success(`${config.entityLabel} created`);
    },
    onError: (err) => {
      toast.error(`Failed to create ${config.entityLabel.toLowerCase()}`, {
        description: formatApiError(err),
      });
    },
  });

  const renameMut = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      config.updateFn(token!, id, { name }),
    onSuccess: () => {
      invalidate();
      toast.success(`${config.entityLabel} renamed`);
    },
    onError: (err) => {
      toast.error(`Failed to rename ${config.entityLabel.toLowerCase()}`, {
        description: formatApiError(err),
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => config.deleteFn(token!, id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      toast.success(`${config.entityLabel} deleted`);
    },
    onError: (err) => {
      toast.error(`Failed to delete ${config.entityLabel.toLowerCase()}`, {
        description: formatApiError(err),
      });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createMut.mutate(newName.trim());
  };

  return {
    newName,
    setNewName,
    deleteTarget,
    setDeleteTarget,
    createMut,
    renameMut,
    deleteMut,
    handleCreate,
  };
}
