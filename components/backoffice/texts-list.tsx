'use client';

import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Download,
  ExternalLink,
  Filter as FilterIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { NewImageTextDialog } from '@/components/backoffice/new-image-text-dialog';
import { ImportTeiDialog } from '@/components/backoffice/import-tei-dialog';
import { ServerPagination } from '@/components/backoffice/common/server-pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/auth-context';
import { API_BASE_URL } from '@/lib/api-fetch';
import { cn } from '@/lib/utils';
import {
  IMAGE_TEXT_PAGE_SIZE,
  fetchImageTextList,
  type ImageTextKind,
  type ImageTextListParams,
  type ImageTextListRow,
} from '@/services/backoffice/image-texts-list';
import { bulkActionImageTexts } from '@/services/backoffice/image-texts-bulk';
import { transitionImageText, type ImageTextStatus } from '@/services/backoffice/review-queue';

const STATUS_TONE: Record<ImageTextStatus, string> = {
  Draft:
    'bg-status-draft/10 border-status-draft/20 text-[hsl(var(--c-status-draft-h)_var(--c-status-draft-s)_32%)] dark:text-[hsl(var(--c-status-draft-h)_var(--c-status-draft-s)_75%)]',
  Review:
    'bg-status-review/10 border-status-review/20 text-[hsl(var(--c-status-review-h)_var(--c-status-review-s)_32%)] dark:text-[hsl(var(--c-status-review-h)_var(--c-status-review-s)_75%)]',
  Live: 'bg-status-live/10 border-status-live/20 text-[hsl(var(--c-status-live-h)_var(--c-status-live-s)_28%)] dark:text-[hsl(var(--c-status-live-h)_var(--c-status-live-s)_72%)]',
  Reviewed:
    'bg-status-reviewed/10 border-status-reviewed/20 text-[hsl(var(--c-status-reviewed-h)_var(--c-status-reviewed-s)_42%)] dark:text-[hsl(var(--c-status-reviewed-h)_var(--c-status-reviewed-s)_78%)]',
};

const STATUS_DOT: Record<ImageTextStatus, string> = {
  Draft: 'bg-status-draft',
  Review: 'bg-status-review',
  Live: 'bg-status-live',
  Reviewed: 'bg-status-reviewed',
};

const KIND_TONE: Record<ImageTextKind, string> = {
  Transcription:
    'border-transcription/30 bg-[hsl(var(--c-transcription-h)_50%_96%)] text-[hsl(var(--c-transcription-h)_55%_30%)] dark:bg-[hsl(var(--c-transcription-h)_45%_18%)]/40 dark:text-[hsl(var(--c-transcription-h)_45%_75%)]',
  Translation:
    'border-translation/30 bg-[hsl(var(--c-translation-h)_40%_96%)] text-[hsl(var(--c-translation-h)_45%_30%)] dark:bg-[hsl(var(--c-translation-h)_40%_18%)]/40 dark:text-[hsl(var(--c-translation-h)_40%_75%)]',
};

const STATUSES: ImageTextStatus[] = ['Draft', 'Review', 'Live', 'Reviewed'];
const KINDS: ImageTextKind[] = ['Transcription', 'Translation'];

interface UrlFilterState {
  kind: ImageTextKind | '';
  status: ImageTextStatus | '';
  language: string;
  empty: 'true' | 'false' | '';
  search: string;
  page: number;
}

function parseFilters(sp: URLSearchParams): UrlFilterState {
  const kindRaw = sp.get('kind');
  const statusRaw = sp.get('status');
  const emptyRaw = sp.get('empty');
  return {
    kind: kindRaw && (KINDS as string[]).includes(kindRaw) ? (kindRaw as ImageTextKind) : '',
    status:
      statusRaw && (STATUSES as string[]).includes(statusRaw) ? (statusRaw as ImageTextStatus) : '',
    language: sp.get('language') ?? '',
    empty: emptyRaw === 'true' || emptyRaw === 'false' ? emptyRaw : '',
    search: sp.get('q') ?? '',
    page: Math.max(0, Number.parseInt(sp.get('page') ?? '0', 10) || 0),
  };
}

function buildExportQuery(filters: UrlFilterState, format: 'csv' | 'json'): string {
  const qs = new URLSearchParams();
  qs.set('format', format);
  if (filters.kind) qs.set('type', filters.kind);
  if (filters.status) qs.set('status', filters.status);
  if (filters.language) qs.set('language', filters.language);
  if (filters.empty) qs.set('empty', filters.empty);
  if (filters.search) qs.set('search', filters.search);
  return qs.toString();
}

export function TextsList() {
  const t = useTranslations('backoffice');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams?.toString() ?? '')),
    [searchParams]
  );

  const [searchInput, setSearchInput] = useState(filters.search);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Mirror the URL value into the local input when the URL is the source of
  // truth (e.g. KPI drilldown). Without this the input would lag a navigation.
  // Adjusting state during render (the React-docs pattern for "reset state when
  // a prop changes") avoids an extra commit + the input flicker an effect would
  // introduce; user keystrokes still mutate searchInput freely between syncs.
  const [prevUrlSearch, setPrevUrlSearch] = useState(filters.search);
  if (prevUrlSearch !== filters.search) {
    setPrevUrlSearch(filters.search);
    setSearchInput(filters.search);
  }

  // Drop any selected ids that fall out of view when filters/page change —
  // otherwise a "Delete N selected" would silently target hidden rows. Same
  // store-during-render reset pattern, keyed on the composite filter/page tuple.
  const filterKey = `${filters.kind}|${filters.status}|${filters.language}|${filters.empty}|${filters.search}|${filters.page}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setSelected(new Set());
  }

  // Debounced commit of the search input back into the URL — 350ms is the
  // same cadence /backoffice/manuscripts uses, fast enough to feel live but
  // slow enough not to thrash the API on every keystroke.
  useEffect(() => {
    if (searchInput === filters.search) return;
    const handle = setTimeout(() => {
      setParams({ q: searchInput || null, page: null });
    }, 350);
    return () => clearTimeout(handle);
    // setParams is stable enough for this debounce window; including it
    // would force a re-arm on every navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, filters.search]);

  function setParams(next: Record<string, string | number | null>) {
    const sp = new URLSearchParams(searchParams?.toString() ?? '');
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === '') {
        sp.delete(key);
      } else {
        sp.set(key, String(value));
      }
    }
    const qs = sp.toString();
    router.replace(qs ? `?${qs}` : '?', { scroll: false });
  }

  const apiParams: ImageTextListParams = {
    page: filters.page,
    pageSize: IMAGE_TEXT_PAGE_SIZE,
    type: filters.kind || undefined,
    status: filters.status || undefined,
    language: filters.language || undefined,
    empty: filters.empty === '' ? undefined : filters.empty === 'true',
    search: filters.search || undefined,
  };

  const { data, isFetching, error } = useQuery({
    queryKey: ['backoffice', 'image-texts', 'list', apiParams],
    queryFn: () => fetchImageTextList(token!, apiParams),
    enabled: !!token,
    placeholderData: (prev) => prev,
  });

  const total = data?.count ?? 0;
  const rows = data?.results ?? [];

  const allVisibleSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someVisibleSelected = rows.some((r) => selected.has(r.id));

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const r of rows) next.delete(r.id);
      } else {
        for (const r of rows) next.add(r.id);
      }
      return next;
    });
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const activeFilterCount =
    (filters.kind ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.language ? 1 : 0) +
    (filters.empty ? 1 : 0) +
    (filters.search ? 1 : 0);

  function clearAll() {
    setParams({
      kind: null,
      status: null,
      language: null,
      empty: null,
      q: null,
      page: null,
    });
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['backoffice', 'image-texts', 'list'] });
    queryClient.invalidateQueries({ queryKey: ['backoffice', 'texts-monitor', 'overview'] });
    queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    queryClient.invalidateQueries({ queryKey: ['backoffice', 'uncovered-images'] });
  }

  const bulkDelete = useMutation({
    mutationFn: () => bulkActionImageTexts(token!, { ids: Array.from(selected), action: 'delete' }),
    onSuccess: ({ affected }) => {
      toast.success(t('textsList.toastBulkDeleted', { count: affected }));
      setSelected(new Set());
      setConfirmBulkDelete(false);
      invalidate();
    },
    onError: (err: Error) =>
      toast.error(t('textsList.toastBulkDeleteFailed'), { description: err.message }),
  });

  async function exportTo(format: 'csv' | 'json') {
    if (!token) return;
    // Authenticated download path: fetch with the token, then synthesize an
    // <a download> link from the blob. Direct navigation to the URL would
    // skip the Authorization header and 401.
    const qs = buildExportQuery(filters, format);
    const url = `${API_BASE_URL}/api/v1/manuscripts/management/image-texts/export/?${qs}`;
    const toastId = toast.loading(t('textsList.toastPreparingExport'));
    try {
      const res = await fetch(url, { headers: { Authorization: `Token ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const filename = `image-texts.${format}`;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
      toast.success(t('textsList.toastDownloaded', { filename }), { id: toastId });
    } catch (err) {
      toast.error(t('textsList.toastExportFailed'), {
        id: toastId,
        description: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const selectedCount = selected.size;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base font-medium">{t('textsList.title')}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {t('textsList.matchingRows', { count: total })}
                {activeFilterCount > 0
                  ? ` · ${t('textsList.filtersActive', { count: activeFilterCount })}`
                  : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <Button size="sm" variant="ghost" onClick={clearAll} className="h-7 text-xs">
                  <X className="mr-1 h-3 w-3" /> {t('textsList.clearFilters')}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    <Download className="mr-1 h-3 w-3" /> {t('textsList.export')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => void exportTo('csv')}>
                    {t('textsList.exportCsv')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void exportTo('json')}>
                    {t('textsList.exportJson')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setImportDialogOpen(true)}
              >
                <Upload className="mr-1 h-3 w-3" /> {t('textsList.importTei')}
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={() => setNewDialogOpen(true)}>
                <Plus className="mr-1 h-3 w-3" /> {t('textsList.new')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-0 pb-0">
          <div className="flex flex-wrap items-center gap-2 px-6">
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('textsList.searchPlaceholder')}
                className="h-8 pl-8 text-sm"
              />
            </div>
            <FilterSelect
              label={t('textsList.filterKind')}
              value={filters.kind}
              options={KINDS}
              onChange={(v) => setParams({ kind: v || null, page: null })}
            />
            <FilterSelect
              label={t('textsList.filterStatus')}
              value={filters.status}
              options={STATUSES}
              onChange={(v) => setParams({ status: v || null, page: null })}
            />
            <FilterSelect
              label={t('textsList.filterLanguage')}
              value={filters.language}
              options={[
                { value: '__unset__', label: t('textsList.filterLanguageUnset') },
                { value: 'la', label: 'la' },
                { value: 'en', label: 'en' },
                { value: 'fr', label: 'fr' },
                { value: 'enm', label: 'enm' },
              ]}
              onChange={(v) => setParams({ language: v || null, page: null })}
            />
            <FilterSelect
              label={t('textsList.filterContent')}
              value={filters.empty}
              options={[
                { value: 'true', label: t('textsList.filterContentEmpty') },
                { value: 'false', label: t('textsList.filterContentNonEmpty') },
              ]}
              onChange={(v) => setParams({ empty: v || null, page: null })}
            />
            {isFetching && (
              <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {selectedCount > 0 && (
            <BulkActionBar
              ids={Array.from(selected)}
              token={token!}
              onCleared={() => setSelected(new Set())}
              onInvalidated={invalidate}
              onAskDelete={() => setConfirmBulkDelete(true)}
            />
          )}

          {error && (
            <div className="mx-6 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {t('textsList.loadFailed', { message: (error as Error).message })}
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[32px]">
                    <Checkbox
                      checked={allVisibleSelected || (someVisibleSelected && 'indeterminate')}
                      onCheckedChange={toggleAllVisible}
                      aria-label={t('textsList.selectAllVisible')}
                    />
                  </TableHead>
                  <TableHead className="w-[110px]">{t('textsList.columnKind')}</TableHead>
                  <TableHead>{t('textsList.columnImage')}</TableHead>
                  <TableHead className="w-[100px]">{t('textsList.columnStatus')}</TableHead>
                  <TableHead className="w-[80px]">{t('textsList.columnLang')}</TableHead>
                  <TableHead className="w-[90px] text-right">
                    {t('textsList.columnChars')}
                  </TableHead>
                  <TableHead className="w-[200px]">{t('textsList.columnModified')}</TableHead>
                  <TableHead className="w-[180px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      {isFetching ? t('textsList.loading') : t('textsList.noMatches')}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <ListRow
                      key={row.id}
                      row={row}
                      selected={selected.has(row.id)}
                      onToggle={() => toggleOne(row.id)}
                      onTransitioned={invalidate}
                      token={token!}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="px-6 pb-4">
            <ServerPagination
              total={total}
              pageSize={IMAGE_TEXT_PAGE_SIZE}
              page={filters.page}
              hasNext={!!data?.next}
              onPageChange={(p) => setParams({ page: p > 0 ? p : null })}
            />
          </div>
        </CardContent>
      </Card>

      <NewImageTextDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} />

      <ImportTeiDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />

      <ConfirmDialog
        open={confirmBulkDelete}
        onOpenChange={setConfirmBulkDelete}
        title={t('textsList.bulkDeleteTitle', { count: selectedCount })}
        description={t('textsList.bulkDeleteDescription')}
        confirmLabel={t('textsList.bulkDeleteConfirm')}
        variant="destructive"
        loading={bulkDelete.isPending}
        onConfirm={() => bulkDelete.mutate()}
      />
    </>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly (string | { value: string; label: string })[];
  onChange: (value: string) => void;
}) {
  const t = useTranslations('backoffice');
  const normalized = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );
  return (
    <Select value={value || '__all__'} onValueChange={(v) => onChange(v === '__all__' ? '' : v)}>
      <SelectTrigger className="h-8 w-[150px] text-xs">
        <FilterIcon className="mr-1.5 h-3 w-3 text-muted-foreground" />
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">
          {t('textsList.filterAllOption', { label: label.toLowerCase() })}
        </SelectItem>
        {normalized.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BulkActionBar({
  ids,
  token,
  onCleared,
  onInvalidated,
  onAskDelete,
}: {
  ids: number[];
  token: string;
  onCleared: () => void;
  onInvalidated: () => void;
  onAskDelete: () => void;
}) {
  const t = useTranslations('backoffice');
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [toStatus, setToStatus] = useState<ImageTextStatus>('Review');
  const [note, setNote] = useState('');
  const [language, setLanguage] = useState('');

  const transitionMut = useMutation({
    mutationFn: () =>
      bulkActionImageTexts(token, {
        ids,
        action: 'transition',
        payload: { to_status: toStatus, note: note.trim() || undefined },
      }),
    onSuccess: ({ affected }) => {
      toast.success(t('textsList.toastBulkTransitioned', { count: affected, status: toStatus }));
      setTransitionOpen(false);
      setNote('');
      onCleared();
      onInvalidated();
    },
    onError: (err: Error) =>
      toast.error(t('textsList.toastBulkTransitionFailed'), { description: err.message }),
  });

  const languageMut = useMutation({
    mutationFn: () =>
      bulkActionImageTexts(token, {
        ids,
        action: 'set_language',
        payload: { language },
      }),
    onSuccess: ({ affected }) => {
      toast.success(t('textsList.toastBulkLanguageSet', { count: affected }));
      setLanguageOpen(false);
      setLanguage('');
      onCleared();
      onInvalidated();
    },
    onError: (err: Error) =>
      toast.error(t('textsList.toastBulkLanguageFailed'), { description: err.message }),
  });

  return (
    <div className="mx-6 flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-xs">
      <span className="font-medium">{t('textsList.selectedCount', { count: ids.length })}</span>
      <div className="ml-auto flex items-center gap-2">
        <Popover open={transitionOpen} onOpenChange={setTransitionOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              {t('imageTexts.transitionButton')}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('imageTexts.transitionTargetLabel')}</Label>
              <Select value={toStatus} onValueChange={(v) => setToStatus(v as ImageTextStatus)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('imageTexts.transitionNoteLabel')}</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('imageTexts.transitionNotePlaceholder')}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setTransitionOpen(false)}
              >
                {t('imageTexts.transitionCancel')}
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={transitionMut.isPending}
                onClick={() => transitionMut.mutate()}
              >
                {transitionMut.isPending
                  ? t('imageTexts.transitionSaving')
                  : t('imageTexts.transitionApply', { target: toStatus })}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={languageOpen} onOpenChange={setLanguageOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              {t('textsList.setLanguageButton')}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('imageTexts.fieldLanguage')}</Label>
              <Input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder={t('textsList.setLanguagePlaceholder')}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setLanguageOpen(false)}
              >
                {t('imageTexts.transitionCancel')}
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={languageMut.isPending}
                onClick={() => languageMut.mutate()}
              >
                {languageMut.isPending
                  ? t('imageTexts.transitionSaving')
                  : t('textsList.setLanguageApply')}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onAskDelete}
        >
          <Trash2 className="mr-1 h-3 w-3" />
          {t('imageTexts.deleteButton')}
        </Button>

        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCleared}>
          <X className="mr-1 h-3 w-3" />
          {t('textsList.clearSelection')}
        </Button>
      </div>
    </div>
  );
}

function ListRow({
  row,
  selected,
  onToggle,
  onTransitioned,
  token,
}: {
  row: ImageTextListRow;
  selected: boolean;
  onToggle: () => void;
  onTransitioned: () => void;
  token: string;
}) {
  const t = useTranslations('backoffice');
  const editorLink = `/backoffice/image-texts/${row.id}`;
  const panel = row.type === 'Transcription' ? 'transcription' : 'translation';
  const viewerLink = row.item_part_id
    ? `/manuscripts/${row.item_part_id}/images/${row.item_image}#mode=text&panel=${panel}`
    : null;

  return (
    <TableRow className="group" data-state={selected ? 'selected' : undefined}>
      <TableCell>
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          aria-label={t('textsList.selectRow', { id: row.id })}
        />
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]',
            KIND_TONE[row.type]
          )}
        >
          {row.type === 'Transcription'
            ? t('textsList.kindTranscriptionShort')
            : t('textsList.kindTranslationShort')}
        </Badge>
      </TableCell>
      <TableCell>
        <Link href={editorLink} className="flex flex-col">
          <span className="font-medium leading-tight hover:underline">
            {row.item_image_label || t('textsList.imageFallbackLabel', { id: row.item_image })}
          </span>
          {row.item_image_locus && (
            <span className="text-[11px] text-muted-foreground">
              {t('imageTexts.breadcrumbFolio', { locus: row.item_image_locus })}
            </span>
          )}
        </Link>
      </TableCell>
      <TableCell>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]',
            STATUS_TONE[row.status]
          )}
        >
          <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[row.status])} />
          {row.status}
        </span>
      </TableCell>
      <TableCell>
        <span
          className={cn('font-mono text-xs', !row.language && 'text-muted-foreground/60 italic')}
        >
          {row.language || '—'}
        </span>
      </TableCell>
      <TableCell className="text-right font-mono text-xs">
        {row.is_empty ? (
          <span className="text-amber-600 dark:text-amber-400">{t('textsList.emptyContent')}</span>
        ) : (
          row.char_count.toLocaleString()
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <span title={new Date(row.modified).toLocaleString()}>
          {new Date(row.modified).toLocaleDateString()}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <TransitionPopover row={row} token={token} onTransitioned={onTransitioned} />
          <Link
            href={editorLink}
            className="flex h-7 items-center rounded-md border px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={t('textsList.openEditorTitle')}
          >
            {t('textsList.editLink')}
          </Link>
          {viewerLink ? (
            <Link
              href={viewerLink}
              target="_blank"
              rel="noopener"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={t('textsList.openPublicViewerTitle')}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/30" />
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function TransitionPopover({
  row,
  token,
  onTransitioned,
}: {
  row: ImageTextListRow;
  token: string;
  onTransitioned: () => void;
}) {
  const t = useTranslations('backoffice');
  // Default target = next forward step in the lifecycle so the common path
  // (Draft → Review → Live → Reviewed) is one click.
  const NEXT: Record<ImageTextStatus, ImageTextStatus> = {
    Draft: 'Review',
    Review: 'Live',
    Live: 'Reviewed',
    Reviewed: 'Live',
  };
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<ImageTextStatus>(NEXT[row.status]);
  const [note, setNote] = useState('');

  const transition = useMutation({
    mutationFn: () =>
      transitionImageText(token, row.id, {
        to_status: target,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(t('textsList.toastRowTransitioned', { id: row.id, target }));
      setOpen(false);
      setNote('');
      onTransitioned();
    },
    onError: (err: Error) =>
      toast.error(t('imageTexts.toastTransitionFailed'), { description: err.message }),
  });

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setTarget(NEXT[row.status]);
          setNote('');
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs">
          {t('textsList.rowTransitionButton')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <div className="text-xs">
          <p className="text-muted-foreground">{t('imageTexts.transitionCurrent')}</p>
          <p className="font-medium">{row.status}</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t('imageTexts.transitionTargetLabel')}</Label>
          <Select value={target} onValueChange={(v) => setTarget(v as ImageTextStatus)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.filter((s) => s !== row.status).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{t('imageTexts.transitionNoteLabel')}</Label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('imageTexts.transitionNotePlaceholder')}
            className="h-8 text-xs"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>
            {t('imageTexts.transitionCancel')}
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={transition.isPending}
            onClick={() => transition.mutate()}
          >
            {transition.isPending
              ? t('imageTexts.transitionSaving')
              : t('imageTexts.transitionApply', { target })}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
