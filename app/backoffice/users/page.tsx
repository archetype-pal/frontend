'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import {
  UserCog,
  Users,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import {
  BackofficeErrorState,
  BackofficeLoadingState,
} from '@/components/backoffice/common/query-state';
import { getUsers, createUser, updateUser, deleteUser } from '@/services/backoffice/users';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { runBulkAction } from '@/lib/backoffice/bulk-action';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { UserListItem, UserCreatePayload, UserUpdatePayload } from '@/types/backoffice';

// ── Helpers ──────────────────────────────────────────────────────────────

function getInitials(user: UserListItem): string {
  if (user.first_name && user.last_name)
    return (user.first_name[0] + user.last_name[0]).toUpperCase();
  return user.username.slice(0, 2).toUpperCase();
}

function fullName(user: UserListItem): string {
  return [user.first_name, user.last_name].filter(Boolean).join(' ');
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
  'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300',
];

function avatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const emptyCreate: UserCreatePayload = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  is_staff: false,
  is_superuser: false,
  is_active: true,
};

const PAGE_SIZE = 20;

type PresetKey = 'all' | 'superuser' | 'staff' | 'inactive';
type SortKey = 'username' | 'name' | 'last_login' | 'date_joined';
type SortDir = 'asc' | 'desc';

// ── Password Input ───────────────────────────────────────────────────────

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-9"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ── Section Label ────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-medium text-foreground">{children}</p>;
}

// ── Sortable header ──────────────────────────────────────────────────────

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={onClick}>
      {label}
      {active && (dir === 'asc' ? ' ↑' : ' ↓')}
    </Button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Dialog / mutation targets
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserListItem | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);

  const [createForm, setCreateForm] = useState<UserCreatePayload>({ ...emptyCreate });
  const [editForm, setEditForm] = useState<UserUpdatePayload>({});

  // Table view state
  const [search, setSearch] = useState('');
  const [preset, setPreset] = useState<PresetKey>('all');
  const [sortKey, setSortKey] = useState<SortKey>('username');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: backofficeKeys.users.all(),
    queryFn: () => getUsers(token!),
    enabled: !!token,
  });

  const users = useMemo(() => data?.results ?? [], [data]);

  const totalCount = users.length;
  const superuserCount = useMemo(() => users.filter((u) => u.is_superuser).length, [users]);
  const staffCount = useMemo(() => users.filter((u) => u.is_staff).length, [users]);
  const activeCount = useMemo(() => users.filter((u) => u.is_active).length, [users]);
  const inactiveCount = totalCount - activeCount;

  // ── Derived rows: preset → search → sort → paginate ───────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (preset === 'superuser' && !u.is_superuser) return false;
      if (preset === 'staff' && !u.is_staff) return false;
      if (preset === 'inactive' && u.is_active) return false;
      if (q) {
        const haystack = `${u.username} ${u.email} ${fullName(u)}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [users, preset, search]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    const factor = sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortKey) {
        case 'name':
          av = fullName(a).toLowerCase();
          bv = fullName(b).toLowerCase();
          break;
        case 'last_login':
          av = a.last_login ? new Date(a.last_login).getTime() : 0;
          bv = b.last_login ? new Date(b.last_login).getTime() : 0;
          break;
        case 'date_joined':
          av = new Date(a.date_joined).getTime();
          bv = new Date(b.date_joined).getTime();
          break;
        default:
          av = a.username.toLowerCase();
          bv = b.username.toLowerCase();
      }
      if (av < bv) return -1 * factor;
      if (av > bv) return 1 * factor;
      return 0;
    });
    return rows;
  }, [filtered, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(
    () => sorted.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [sorted, currentPage]
  );

  // ── Selection (over the full filtered set) ────────────────────────────

  const allSelected = filtered.length > 0 && filtered.every((u) => selected.has(String(u.id)));
  const someSelected = !allSelected && filtered.some((u) => selected.has(String(u.id)));
  const selectedIds = [...selected];

  function toggleAll() {
    setSelected((prev) => {
      if (filtered.every((u) => prev.has(String(u.id)))) {
        // deselect the filtered rows
        const next = new Set(prev);
        filtered.forEach((u) => next.delete(String(u.id)));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach((u) => next.add(String(u.id)));
      return next;
    });
  }

  function toggleRow(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function changePreset(next: PresetKey) {
    setPreset(next);
    setPage(0);
  }

  function changeSearch(next: string) {
    setSearch(next);
    setPage(0);
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: backofficeKeys.users.all() });

  // ── Mutations ──────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: () => createUser(token!, createForm),
    onSuccess: () => {
      toast.success('User created');
      invalidate();
      setCreateOpen(false);
      setCreateForm({ ...emptyCreate });
    },
    onError: (err) => {
      toast.error('Failed to create user', { description: formatApiError(err) });
    },
  });

  const updateMut = useMutation({
    mutationFn: (vars?: { id: number; data: UserUpdatePayload }) => {
      if (vars) return updateUser(token!, vars.id, vars.data);
      const payload: UserUpdatePayload = { ...editForm };
      if (!payload.password) delete payload.password;
      return updateUser(token!, editTarget!.id, payload);
    },
    onSuccess: () => {
      toast.success('User updated');
      invalidate();
      setEditTarget(null);
    },
    onError: (err) => {
      toast.error('Failed to update user', { description: formatApiError(err) });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteUser(token!, id),
    onSuccess: () => {
      toast.success('User deleted');
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error('Failed to delete user', { description: formatApiError(err) });
    },
  });

  // Use `runBulkAction` so a single failed delete doesn't black-hole the
  // cache invalidation — successful deletes still need to be reflected in
  // the table even when one row 4xx/5xxs.
  const bulkDeleteMut = useMutation({
    mutationFn: (ids: string[]) =>
      runBulkAction({
        ids,
        action: (id) => deleteUser(token!, Number(id)),
        invalidate,
        pastTense: 'deleted',
        noun: 'user',
      }),
    onSuccess: () => {
      setBulkDeleteIds([]);
      clearSelection();
    },
  });

  function openEdit(user: UserListItem) {
    setEditTarget(user);
    setEditForm({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      password: '',
      is_staff: user.is_staff,
      is_superuser: user.is_superuser,
      is_active: user.is_active,
    });
  }

  async function handleBulkActivate() {
    await runBulkAction({
      ids: selectedIds,
      action: (id) => updateUser(token!, Number(id), { is_active: true }),
      invalidate,
      pastTense: 'activated',
      noun: 'user',
    });
    clearSelection();
  }

  async function handleBulkDeactivate() {
    await runBulkAction({
      ids: selectedIds,
      action: (id) => updateUser(token!, Number(id), { is_active: false }),
      invalidate,
      pastTense: 'deactivated',
      noun: 'user',
    });
    clearSelection();
  }

  // ── Loading / error states ─────────────────────────────────────────────

  if (isLoading) return <BackofficeLoadingState />;
  if (isError)
    return <BackofficeErrorState message="Failed to load users" onRetry={() => refetch()} />;

  const canCreate = createForm.username.trim() && createForm.password.trim();
  const presets: { key: PresetKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: totalCount },
    { key: 'superuser', label: 'Superuser', count: superuserCount },
    { key: 'staff', label: 'Staff', count: staffCount },
    { key: 'inactive', label: 'Inactive', count: inactiveCount },
  ];
  const colSpan = 7;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCog className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
            <p className="text-sm text-muted-foreground">Create, edit, and manage user accounts</p>
          </div>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950">
              <ShieldCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{staffCount}</p>
              <p className="text-xs text-muted-foreground">Staff Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{inactiveCount}</p>
              <p className="text-xs text-muted-foreground">Inactive</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Preset filter tabs */}
        <div className="flex items-center gap-1 border-b">
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => changePreset(p.key)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-px',
                p.key === preset
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {p.label}
              <span className="ml-1.5 text-[10px] tabular-nums text-muted-foreground">
                {p.count}
              </span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => changeSearch(e.target.value)}
              className="pl-8 pr-8 h-9"
            />
          </div>
          <div className="ml-auto">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New User
            </Button>
          </div>
        </div>

        {/* Bulk actions bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
            <span className="text-sm font-medium">{selectedIds.length} selected</span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={handleBulkActivate}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={handleBulkDeactivate}
              >
                <XCircle className="h-3.5 w-3.5" />
                Deactivate
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => setBulkDeleteIds(selectedIds)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={clearSelection}
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                    className="translate-y-[2px]"
                  />
                </TableHead>
                <TableHead>
                  <SortHeader
                    label="User"
                    active={sortKey === 'username'}
                    dir={sortDir}
                    onClick={() => toggleSort('username')}
                  />
                </TableHead>
                <TableHead>
                  <SortHeader
                    label="Name"
                    active={sortKey === 'name'}
                    dir={sortDir}
                    onClick={() => toggleSort('name')}
                  />
                </TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <SortHeader
                    label="Last Active"
                    active={sortKey === 'last_login'}
                    dir={sortDir}
                    onClick={() => toggleSort('last_login')}
                  />
                </TableHead>
                <TableHead>
                  <SortHeader
                    label="Joined"
                    active={sortKey === 'date_joined'}
                    dir={sortDir}
                    onClick={() => toggleSort('date_joined')}
                  />
                </TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length ? (
                pageRows.map((u) => {
                  const isSelected = selected.has(String(u.id));
                  const name = fullName(u) || '—';
                  return (
                    <TableRow key={u.id} data-state={isSelected ? 'selected' : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleRow(u.id)}
                          aria-label="Select row"
                          className="translate-y-[2px]"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColor(u.username)}`}
                          >
                            {getInitials(u)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-sm">{u.username}</p>
                            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={name === '—' ? 'text-muted-foreground' : ''}>{name}</span>
                      </TableCell>
                      <TableCell>
                        {u.is_superuser ? (
                          <Badge variant="destructive" className="gap-1">
                            <ShieldAlert className="h-3 w-3" />
                            Superuser
                          </Badge>
                        ) : u.is_staff ? (
                          <Badge variant="default" className="gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Staff
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Regular
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`}
                          />
                          <span
                            className={`text-sm ${u.is_active ? 'text-foreground' : 'text-muted-foreground'}`}
                          >
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {u.last_login ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm cursor-default">
                                {relativeTime(u.last_login)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {new Date(u.last_login).toLocaleString()}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-sm text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm tabular-nums cursor-default">
                              {new Date(u.date_joined).toLocaleDateString()}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {new Date(u.date_joined).toLocaleString()}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => openEdit(u)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit user</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeleteTarget(u)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete user</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={colSpan + 1}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {selectedIds.length > 0
              ? `${selectedIds.length} of ${sorted.length} selected`
              : `${sorted.length} row(s) total`}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 tabular-nums">
              {currentPage + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={currentPage >= pageCount - 1}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Create dialog ───────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New User</DialogTitle>
            <DialogDescription>
              Set up a new account. The password will be securely hashed.
            </DialogDescription>
          </DialogHeader>

          <div
            className="overflow-y-auto px-5 py-4 space-y-5"
            style={{ maxHeight: 'calc(100vh - 12rem)' }}
          >
            <div className="space-y-3">
              <SectionLabel>Account</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Username</Label>
                  <Input
                    value={createForm.username}
                    onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                    placeholder="jdoe"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="jdoe@example.com"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <PasswordInput
                  value={createForm.password}
                  onChange={(v) => setCreateForm((f) => ({ ...f, password: v }))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Minimum 8 characters recommended
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <SectionLabel>Personal Information</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>First Name</Label>
                  <Input
                    value={createForm.first_name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, first_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name</Label>
                  <Input
                    value={createForm.last_name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, last_name: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <SectionLabel>Permissions</SectionLabel>
              <div className="rounded-lg border divide-y">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <Label htmlFor="create-is-staff" className="cursor-pointer text-sm">
                      Staff access
                    </Label>
                    <p className="text-[11px] text-muted-foreground">Can access the backoffice</p>
                  </div>
                  <Switch
                    id="create-is-staff"
                    checked={createForm.is_staff}
                    onCheckedChange={(v) => setCreateForm((f) => ({ ...f, is_staff: v }))}
                  />
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <Label htmlFor="create-is-superuser" className="cursor-pointer text-sm">
                      Superuser
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Full access to everything, including Django admin
                    </p>
                  </div>
                  <Switch
                    id="create-is-superuser"
                    checked={createForm.is_superuser}
                    onCheckedChange={(v) => setCreateForm((f) => ({ ...f, is_superuser: v }))}
                  />
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <Label htmlFor="create-is-active" className="cursor-pointer text-sm">
                      Active
                    </Label>
                    <p className="text-[11px] text-muted-foreground">Can sign in to the site</p>
                  </div>
                  <Switch
                    id="create-is-active"
                    checked={createForm.is_active}
                    onCheckedChange={(v) => setCreateForm((f) => ({ ...f, is_active: v }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={createMut.isPending}
            >
              Cancel
            </Button>
            <Button onClick={() => createMut.mutate()} disabled={!canCreate || createMut.isPending}>
              {createMut.isPending ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {editTarget && (
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarColor(editTarget.username)}`}
                >
                  {getInitials(editTarget)}
                </div>
              )}
              <div>
                <DialogTitle>@{editTarget?.username}</DialogTitle>
                <DialogDescription>
                  {editTarget &&
                    `Member since ${new Date(editTarget.date_joined).toLocaleDateString()}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div
            className="overflow-y-auto px-5 py-4 space-y-5"
            style={{ maxHeight: 'calc(100vh - 12rem)' }}
          >
            <div className="space-y-3">
              <SectionLabel>Account</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Username</Label>
                  <Input
                    value={editForm.username ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editForm.email ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <SectionLabel>Change Password</SectionLabel>
              <div className="space-y-1.5">
                <PasswordInput
                  value={editForm.password ?? ''}
                  onChange={(v) => setEditForm((f) => ({ ...f, password: v }))}
                  placeholder="Leave blank to keep current password"
                />
                <p className="text-[11px] text-muted-foreground">
                  Only fill in if you want to change the password
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <SectionLabel>Personal Information</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>First Name</Label>
                  <Input
                    value={editForm.first_name ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name</Label>
                  <Input
                    value={editForm.last_name ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <SectionLabel>Permissions</SectionLabel>
              <div className="rounded-lg border divide-y">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <Label htmlFor="edit-is-staff" className="cursor-pointer text-sm">
                      Staff access
                    </Label>
                    <p className="text-[11px] text-muted-foreground">Can access the backoffice</p>
                  </div>
                  <Switch
                    id="edit-is-staff"
                    checked={editForm.is_staff ?? false}
                    onCheckedChange={(v) => setEditForm((f) => ({ ...f, is_staff: v }))}
                  />
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <Label htmlFor="edit-is-superuser" className="cursor-pointer text-sm">
                      Superuser
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Full access to everything, including Django admin
                    </p>
                  </div>
                  <Switch
                    id="edit-is-superuser"
                    checked={editForm.is_superuser ?? false}
                    onCheckedChange={(v) => setEditForm((f) => ({ ...f, is_superuser: v }))}
                  />
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <Label htmlFor="edit-is-active" className="cursor-pointer text-sm">
                      Active
                    </Label>
                    <p className="text-[11px] text-muted-foreground">Can sign in to the site</p>
                  </div>
                  <Switch
                    id="edit-is-active"
                    checked={editForm.is_active ?? false}
                    onCheckedChange={(v) => setEditForm((f) => ({ ...f, is_active: v }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              className="mr-auto text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (editTarget) {
                  setDeleteTarget(editTarget);
                  setEditTarget(null);
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete user
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditTarget(null)}
              disabled={updateMut.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateMut.mutate(undefined)}
              disabled={!editForm.username?.trim() || updateMut.isPending}
            >
              {updateMut.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Single delete confirmation ──────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.username}"?`}
        description="This action cannot be undone. The user will be permanently removed."
        confirmLabel="Delete"
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />

      {/* ── Bulk delete confirmation ────────────────────────────────── */}
      <ConfirmDialog
        open={bulkDeleteIds.length > 0}
        onOpenChange={(open) => !open && setBulkDeleteIds([])}
        title={`Delete ${bulkDeleteIds.length} user(s)?`}
        description="This action cannot be undone. All selected users will be permanently removed."
        confirmLabel="Delete All"
        loading={bulkDeleteMut.isPending}
        onConfirm={() => bulkDeleteMut.mutate(bulkDeleteIds)}
      />
    </div>
  );
}
