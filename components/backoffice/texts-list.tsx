'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, ExternalLink, Filter as FilterIcon, Loader2, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import {
  IMAGE_TEXT_PAGE_SIZE,
  fetchImageTextList,
  type ImageTextKind,
  type ImageTextListParams,
  type ImageTextListRow,
} from '@/services/backoffice/image-texts-list';
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

export function TextsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams?.toString() ?? '')),
    [searchParams]
  );

  const [searchInput, setSearchInput] = useState(filters.search);

  // Mirror the URL value into the local input when the URL is the source of
  // truth (e.g. KPI drilldown). Without this the input would lag a navigation.
  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

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

  function onTransitioned() {
    queryClient.invalidateQueries({ queryKey: ['backoffice', 'image-texts', 'list'] });
    queryClient.invalidateQueries({ queryKey: ['backoffice', 'texts-monitor', 'overview'] });
    queryClient.invalidateQueries({ queryKey: ['review-queue'] });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-medium">Browse image-texts</CardTitle>
            <p className="text-xs text-muted-foreground">
              {total.toLocaleString()} matching {total === 1 ? 'row' : 'rows'}
              {activeFilterCount > 0
                ? ` · ${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'} active`
                : ''}
            </p>
          </div>
          {activeFilterCount > 0 && (
            <Button size="sm" variant="ghost" onClick={clearAll} className="h-7 text-xs">
              <X className="mr-1 h-3 w-3" /> Clear filters
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-0 pb-0">
        <div className="flex flex-wrap items-center gap-2 px-6">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search content or language…"
              className="h-8 pl-8 text-sm"
            />
          </div>
          <FilterSelect
            label="Kind"
            value={filters.kind}
            options={KINDS}
            onChange={(v) => setParams({ kind: v || null, page: null })}
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            options={STATUSES}
            onChange={(v) => setParams({ status: v || null, page: null })}
          />
          <FilterSelect
            label="Language"
            value={filters.language}
            options={[
              { value: '__unset__', label: '(unset)' },
              { value: 'la', label: 'la' },
              { value: 'en', label: 'en' },
              { value: 'fr', label: 'fr' },
              { value: 'enm', label: 'enm' },
            ]}
            onChange={(v) => setParams({ language: v || null, page: null })}
          />
          <FilterSelect
            label="Content"
            value={filters.empty}
            options={[
              { value: 'true', label: 'Empty only' },
              { value: 'false', label: 'Non-empty' },
            ]}
            onChange={(v) => setParams({ empty: v || null, page: null })}
          />
          {isFetching && <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {error && (
          <div className="mx-6 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            Could not load list: {(error as Error).message}
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">Kind</TableHead>
                <TableHead>Image</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[80px]">Lang</TableHead>
                <TableHead className="w-[90px] text-right">Chars</TableHead>
                <TableHead className="w-[200px]">Modified</TableHead>
                <TableHead className="w-[180px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                    {isFetching ? 'Loading…' : 'No image-texts match.'}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <ListRow key={row.id} row={row} onTransitioned={onTransitioned} token={token!} />
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
        <SelectItem value="__all__">All {label.toLowerCase()}</SelectItem>
        {normalized.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ListRow({
  row,
  onTransitioned,
  token,
}: {
  row: ImageTextListRow;
  onTransitioned: () => void;
  token: string;
}) {
  const editorLink = `/backoffice/image-texts/${row.id}`;
  const panel = row.type === 'Transcription' ? 'transcription' : 'translation';
  const viewerLink = row.item_part_id
    ? `/manuscripts/${row.item_part_id}/images/${row.item_image}#mode=text&panel=${panel}`
    : null;

  return (
    <TableRow className="group">
      <TableCell>
        <Badge
          variant="outline"
          className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]',
            KIND_TONE[row.type]
          )}
        >
          {row.type === 'Transcription' ? 'Transcr.' : 'Transl.'}
        </Badge>
      </TableCell>
      <TableCell>
        <Link href={editorLink} className="flex flex-col">
          <span className="font-medium leading-tight hover:underline">
            {row.item_image_label || `Image #${row.item_image}`}
          </span>
          {row.item_image_locus && (
            <span className="text-[11px] text-muted-foreground">folio {row.item_image_locus}</span>
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
          <span className="text-amber-600 dark:text-amber-400">empty</span>
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
            title="Open editor"
          >
            Edit
          </Link>
          {viewerLink ? (
            <Link
              href={viewerLink}
              target="_blank"
              rel="noopener"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Open in public viewer"
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
      toast.success(`#${row.id} → ${target}`);
      setOpen(false);
      setNote('');
      onTransitioned();
    },
    onError: (err: Error) => toast.error('Transition failed', { description: err.message }),
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
          Transition
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <div className="text-xs">
          <p className="text-muted-foreground">Current</p>
          <p className="font-medium">{row.status}</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Target status</Label>
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
          <Label className="text-xs">Note (optional)</Label>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What changed?"
            className="h-8 text-xs"
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={transition.isPending}
            onClick={() => transition.mutate()}
          >
            {transition.isPending ? 'Saving…' : `→ ${target}`}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
