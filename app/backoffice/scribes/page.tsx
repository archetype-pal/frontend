'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { Users, Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable, sortableHeader } from '@/components/backoffice/common/data-table';
import { createScribe } from '@/services/backoffice/scribes';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { walkPaginated } from '@/lib/backoffice/walk-paginated';
import { authFetch } from '@/lib/api-fetch';
import { toast } from 'sonner';
import type { AdminScribeListItem } from '@/types/backoffice';

export default function ScribesPage() {
  const t = useTranslations('backoffice');
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const columns: ColumnDef<AdminScribeListItem>[] = [
    {
      accessorKey: 'name',
      header: sortableHeader(t('scribes.colName')),
      cell: ({ row }) => (
        <Link
          href={`/backoffice/scribes/${row.original.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'period_display',
      header: t('scribes.colPeriod'),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.period_display ?? '—'}</span>
      ),
      size: 120,
    },
    {
      accessorKey: 'scriptorium',
      header: t('scribes.colScriptorium'),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.scriptorium || '—'}</span>
      ),
      size: 120,
    },
    {
      accessorKey: 'hand_count',
      header: sortableHeader(t('scribes.colHands')),
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-xs tabular-nums">
          {row.original.hand_count}
        </Badge>
      ),
      size: 80,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <Link href={`/backoffice/scribes/${row.original.id}`}>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </Link>
      ),
      size: 50,
    },
  ];

  // Walk all pages so the displayed count and rows agree — the earlier
  // `getScribes(token)` returned only the first DRF page (20), but the
  // header showed `data.count`, leaving admins with "150 scribes" + 20
  // visible rows and no pagination control.
  const { data, isError, refetch } = useQuery({
    queryKey: backofficeKeys.scribes.all(),
    queryFn: () =>
      walkPaginated<AdminScribeListItem>('/api/v1/management/scribes/scribes/?limit=100', (path) =>
        authFetch(path, token!)
      ),
    enabled: !!token,
  });

  const createMut = useMutation({
    mutationFn: () => createScribe(token!, { name: newName }),
    onSuccess: () => {
      toast.success(t('scribes.toastCreated'));
      queryClient.invalidateQueries({ queryKey: backofficeKeys.scribes.all() });
      setAddOpen(false);
      setNewName('');
    },
    onError: (err) => {
      toast.error(t('scribes.toastFailedCreate'), {
        description: formatApiError(err),
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('scribes.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('scribes.subtitle', { count: data?.length ?? 0 })}
          </p>
        </div>
      </div>

      <DataTable
        isError={isError}
        onRetry={() => refetch()}
        columns={columns}
        data={data ?? []}
        searchColumn="name"
        searchPlaceholder={t('scribes.searchPlaceholder')}
        toolbarActions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t('scribes.newButton')}
          </Button>
        }
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('scribes.dialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-1.5">
            <Label>{t('scribes.fieldName')}</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('scribes.fieldNamePlaceholder')}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!newName.trim() || createMut.isPending}
            >
              {t('scribes.createButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
