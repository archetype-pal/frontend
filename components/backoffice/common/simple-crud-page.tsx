'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import type { LucideIcon } from 'lucide-react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { DataTable, sortableHeader } from '@/components/backoffice/common/data-table';
import { InlineEdit } from '@/components/backoffice/common/inline-edit';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type CrudFieldConfig<T> = {
  key: keyof T;
  label: string;
  placeholder?: string;
  inputType?: 'text' | 'number';
  required?: boolean;
  tableSize?: number;
  parse?: (value: string) => unknown;
};

type SimpleCrudPageProps<T extends { id: number }> = {
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
  getRows: (data: unknown) => T[];
  createFn: (payload: Record<string, unknown>) => Promise<unknown>;
  updateFn: (id: number, payload: Record<string, unknown>) => Promise<unknown>;
  deleteFn: (id: number) => Promise<unknown>;
  icon: LucideIcon;
  title: string;
  description: string;
  singularLabel: string;
  pluralLabel: string;
  searchColumn: keyof T;
  fields: CrudFieldConfig<T>[];
  showIdColumn?: boolean;
  deleteDescription: string;
  /** Returns why a row cannot be deleted (disables its delete button, shown as a tooltip), or null. */
  deleteBlockedReason?: (row: T) => string | null;
};

function toEditableString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

export function SimpleCrudPage<T extends { id: number }>({
  queryKey,
  queryFn,
  getRows,
  createFn,
  updateFn,
  deleteFn,
  icon: Icon,
  title,
  description,
  singularLabel,
  pluralLabel,
  searchColumn,
  fields,
  showIdColumn = false,
  deleteDescription,
  deleteBlockedReason,
}: SimpleCrudPageProps<T>) {
  const t = useTranslations('backoffice');
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => queryFn(),
    enabled: !!token,
  });

  const rows = getRows(data);

  const resetDraft = () => {
    const next: Record<string, string> = {};
    for (const field of fields) {
      next[String(field.key)] = '';
    }
    setDraft(next);
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const createMut = useMutation({
    mutationFn: () => {
      const payload = Object.fromEntries(
        fields.map((field) => {
          const raw = draft[String(field.key)] ?? '';
          return [String(field.key), field.parse ? field.parse(raw) : raw];
        })
      );
      return createFn(payload);
    },
    onSuccess: () => {
      toast.success(t('simpleCrud.created', { label: singularLabel }));
      invalidate();
      setAddOpen(false);
      resetDraft();
    },
    onError: (err) => {
      toast.error(t('simpleCrud.failedCreate', { label: singularLabel.toLowerCase() }), {
        description: formatApiError(err),
      });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      updateFn(id, payload),
    onSuccess: invalidate,
    onError: (err) => {
      toast.error(t('simpleCrud.failedUpdate', { label: singularLabel.toLowerCase() }), {
        description: formatApiError(err),
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteFn(id),
    onSuccess: () => {
      toast.success(t('simpleCrud.deleted', { label: singularLabel }));
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(t('simpleCrud.failedDelete', { label: singularLabel.toLowerCase() }), {
        description: formatApiError(err),
      });
    },
  });

  const columns = useMemo<ColumnDef<T>[]>(() => {
    const generated: ColumnDef<T>[] = [];

    if (showIdColumn) {
      generated.push({
        accessorKey: 'id',
        header: t('simpleCrud.idColumn'),
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">#{row.original.id}</span>
        ),
        size: 60,
      });
    }

    for (const field of fields) {
      generated.push({
        accessorKey: String(field.key),
        header: sortableHeader(field.label),
        cell: ({ row }) => (
          <InlineEdit
            value={toEditableString(row.original[field.key])}
            onSave={(nextValue) =>
              updateMut.mutate({
                id: row.original.id,
                payload: {
                  [field.key as string]: field.parse ? field.parse(nextValue) : nextValue,
                },
              })
            }
          />
        ),
        size: field.tableSize,
      });
    }

    generated.push({
      id: 'actions',
      cell: ({ row }) => {
        const blockedReason = deleteBlockedReason?.(row.original);
        if (blockedReason) {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                {/* A disabled button fires no pointer events, so the span carries the tooltip. */}
                <span tabIndex={0} className="inline-flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    disabled
                    aria-label={blockedReason}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{blockedReason}</TooltipContent>
            </Tooltip>
          );
        }
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => setDeleteTarget(row.original)}
            aria-label={t('simpleCrud.deleteLabel', { label: singularLabel.toLowerCase() })}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        );
      },
      size: 50,
    });

    return generated;
  }, [fields, showIdColumn, updateMut, singularLabel, t, deleteBlockedReason]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-sm text-destructive">
          {t('simpleCrud.failedLoad', { label: pluralLabel.toLowerCase() })}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t('simpleCrud.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Icon className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        searchColumn={searchColumn as string}
        searchPlaceholder={t('simpleCrud.searchPlaceholder', { label: pluralLabel.toLowerCase() })}
        toolbarActions={
          <Button
            size="sm"
            onClick={() => {
              if (Object.keys(draft).length === 0) resetDraft();
              setAddOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('simpleCrud.new', { label: singularLabel })}
          </Button>
        }
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('simpleCrud.new', { label: singularLabel })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {fields.map((field) => {
              const key = String(field.key);
              return (
                <div key={key} className="space-y-1.5">
                  <Label>{field.label}</Label>
                  <Input
                    type={field.inputType ?? 'text'}
                    value={draft[key] ?? ''}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                    autoFocus={key === String(fields[0]?.key)}
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              onClick={() => createMut.mutate()}
              disabled={
                fields.some((f) => f.required !== false && !(draft[String(f.key)] ?? '').trim()) ||
                createMut.isPending
              }
            >
              {t('simpleCrud.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget ? toEditableString(deleteTarget[fields[0].key]) : ''}"?`}
        description={deleteDescription}
        confirmLabel="Delete"
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  );
}
