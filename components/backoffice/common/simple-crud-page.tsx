'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LucideIcon } from 'lucide-react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { toastApiError } from '@/lib/backoffice/format-api-error';
import {
  DataTable,
  sortableHeader,
  type DataTableColumn,
} from '@/components/backoffice/common/data-table';
import { InlineEdit } from '@/components/backoffice/common/inline-edit';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BackofficeErrorState } from '@/components/backoffice/common/query-state';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type CrudFieldEditorProps<T> = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  row?: T;
};

type CrudFieldConfig<T> = {
  key: keyof T;
  label: string;
  placeholder?: string;
  inputType?: 'text' | 'number';
  required?: boolean;
  tableSize?: number;
  parse?: (value: string) => unknown;
  editor?: (props: CrudFieldEditorProps<T>) => ReactNode;
  sortValue?: (row: T) => string;
};

type SimpleCrudPageProps<T extends { id: number }> = {
  queryKey: readonly unknown[];
  queryFn: () => Promise<T[]>;
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
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn,
    enabled: isAuthenticated,
  });

  const rows = data ?? [];

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
      toastApiError(t('simpleCrud.failedCreate', { label: singularLabel.toLowerCase() }), err);
    },
  });

  const { mutate: updateField } = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      updateFn(id, payload),
    onSuccess: invalidate,
    onError: (err) => {
      toastApiError(t('simpleCrud.failedUpdate', { label: singularLabel.toLowerCase() }), err);
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
      toastApiError(t('simpleCrud.failedDelete', { label: singularLabel.toLowerCase() }), err);
    },
  });

  const columns = useMemo<DataTableColumn<T>[]>(() => {
    const generated: DataTableColumn<T>[] = [];

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
      const save = (id: number, nextValue: string) =>
        updateField({
          id,
          payload: {
            [field.key as string]: field.parse ? field.parse(nextValue) : nextValue,
          },
        });
      generated.push({
        id: String(field.key),
        accessorFn: (row) => (field.sortValue ? field.sortValue(row) : row[field.key]),
        header: sortableHeader(field.label),
        cell: ({ row }) =>
          field.editor ? (
            field.editor({
              value: toEditableString(row.original[field.key]),
              onChange: (nextValue) => save(row.original.id, nextValue),
              row: row.original,
            })
          ) : (
            <InlineEdit
              value={toEditableString(row.original[field.key])}
              onSave={(nextValue) => save(row.original.id, nextValue)}
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
                <span tabIndex={0} className="ml-auto flex w-fit">
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
            className="ml-auto flex h-7 w-7 text-muted-foreground hover:text-destructive"
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
  }, [fields, showIdColumn, updateField, singularLabel, t, deleteBlockedReason]);

  if (isError) {
    return (
      <BackofficeErrorState
        message={t('simpleCrud.failedLoad', { label: pluralLabel.toLowerCase() })}
        onRetry={() => refetch()}
      />
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
        pageSizeKey={queryKey.join('-')}
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
          <DialogBody className="space-y-3">
            {fields.map((field) => {
              const key = String(field.key);
              const id = `new-${key}`;
              const setValue = (value: string) => setDraft((prev) => ({ ...prev, [key]: value }));
              return (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={id}>{field.label}</Label>
                  {field.editor ? (
                    field.editor({ id, value: draft[key] ?? '', onChange: setValue })
                  ) : (
                    <Input
                      id={id}
                      type={field.inputType ?? 'text'}
                      value={draft[key] ?? ''}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={field.placeholder}
                      autoFocus={key === String(fields[0]?.key)}
                    />
                  )}
                </div>
              );
            })}
          </DialogBody>
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
