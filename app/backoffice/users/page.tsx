'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import type { ColumnDef } from '@tanstack/react-table'
import {
  UserCog,
  Users,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DataTable,
  sortableHeader,
} from '@/components/backoffice/common/data-table'
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog'
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from '@/services/backoffice/users'
import { backofficeKeys } from '@/lib/backoffice/query-keys'
import { formatApiError } from '@/lib/backoffice/format-api-error'
import { toast } from 'sonner'
import type {
  UserListItem,
  UserCreatePayload,
  UserUpdatePayload,
} from '@/types/backoffice'

// ── Helpers ──────────────────────────────────────────────────────────────

function getInitials(user: UserListItem): string {
  if (user.first_name && user.last_name)
    return (user.first_name[0] + user.last_name[0]).toUpperCase()
  return user.username.slice(0, 2).toUpperCase()
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
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
]

function avatarColor(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++)
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const emptyCreate: UserCreatePayload = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  is_staff: false,
  is_active: true,
}

// ── Password Input ───────────────────────────────────────────────────────

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className='relative'>
      <Input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className='pr-9'
      />
      <button
        type='button'
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className='absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
      >
        {visible ? (
          <EyeOff className='h-4 w-4' />
        ) : (
          <Eye className='h-4 w-4' />
        )}
      </button>
    </div>
  )
}

// ── Section Label ────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
      {children}
    </p>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<UserListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserListItem | null>(null)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([])

  const [createForm, setCreateForm] = useState<UserCreatePayload>({
    ...emptyCreate,
  })
  const [editForm, setEditForm] = useState<UserUpdatePayload>({})

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: backofficeKeys.users.all(),
    queryFn: () => getUsers(token!),
    enabled: !!token,
  })

  const users = data?.results ?? []
  const totalCount = users.length
  const staffCount = users.filter((u) => u.is_staff).length
  const activeCount = users.filter((u) => u.is_active).length
  const inactiveCount = totalCount - activeCount

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: backofficeKeys.users.all() })

  // ── Mutations ────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: () => createUser(token!, createForm),
    onSuccess: () => {
      toast.success('User created')
      invalidate()
      setCreateOpen(false)
      setCreateForm({ ...emptyCreate })
    },
    onError: (err) => {
      toast.error('Failed to create user', {
        description: formatApiError(err),
      })
    },
  })

  const updateMut = useMutation({
    mutationFn: (vars?: { id: number; data: UserUpdatePayload }) => {
      if (vars) return updateUser(token!, vars.id, vars.data)
      const payload: UserUpdatePayload = { ...editForm }
      if (!payload.password) delete payload.password
      return updateUser(token!, editTarget!.id, payload)
    },
    onSuccess: () => {
      toast.success('User updated')
      invalidate()
      setEditTarget(null)
    },
    onError: (err) => {
      toast.error('Failed to update user', {
        description: formatApiError(err),
      })
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteUser(token!, id),
    onSuccess: () => {
      toast.success('User deleted')
      invalidate()
      setDeleteTarget(null)
    },
    onError: (err) => {
      toast.error('Failed to delete user', {
        description: formatApiError(err),
      })
    },
  })

  const bulkDeleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => deleteUser(token!, Number(id))))
    },
    onSuccess: () => {
      toast.success(`${bulkDeleteIds.length} user(s) deleted`)
      invalidate()
      setBulkDeleteIds([])
    },
    onError: (err) => {
      toast.error('Bulk delete failed', { description: formatApiError(err) })
    },
  })

  function openEdit(user: UserListItem) {
    setEditTarget(user)
    setEditForm({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      password: '',
      is_staff: user.is_staff,
      is_active: user.is_active,
    })
  }

  async function handleBulkActivate(ids: string[]) {
    await Promise.all(
      ids.map((id) =>
        updateUser(token!, Number(id), { is_active: true })
      )
    )
    toast.success(`${ids.length} user(s) activated`)
    invalidate()
  }

  async function handleBulkDeactivate(ids: string[]) {
    await Promise.all(
      ids.map((id) =>
        updateUser(token!, Number(id), { is_active: false })
      )
    )
    toast.success(`${ids.length} user(s) deactivated`)
    invalidate()
  }

  function handleBulkDelete(ids: string[]) {
    setBulkDeleteIds(ids)
  }

  // ── Columns ──────────────────────────────────────────────────────────

  const columns: ColumnDef<UserListItem>[] = [
    {
      accessorKey: 'username',
      header: sortableHeader('User'),
      cell: ({ row }) => {
        const u = row.original
        return (
          <div className='flex items-center gap-3'>
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColor(u.username)}`}
            >
              {getInitials(u)}
            </div>
            <div className='min-w-0'>
              <p className='truncate font-medium text-sm'>{u.username}</p>
              <p className='truncate text-xs text-muted-foreground'>
                {u.email}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      id: 'name',
      header: sortableHeader('Name'),
      accessorFn: (row) =>
        [row.first_name, row.last_name].filter(Boolean).join(' ') || '—',
      cell: ({ row }) => {
        const name =
          [row.original.first_name, row.original.last_name]
            .filter(Boolean)
            .join(' ') || '—'
        return (
          <span className={name === '—' ? 'text-muted-foreground' : ''}>
            {name}
          </span>
        )
      },
    },
    {
      accessorKey: 'is_staff',
      header: 'Role',
      cell: ({ row }) =>
        row.original.is_staff ? (
          <Badge variant='default' className='gap-1'>
            <ShieldCheck className='h-3 w-3' />
            Staff
          </Badge>
        ) : (
          <Badge variant='outline' className='text-muted-foreground'>
            Regular
          </Badge>
        ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <span
            className={`h-2 w-2 rounded-full ${
              row.original.is_active ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          <span
            className={`text-sm ${
              row.original.is_active
                ? 'text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            {row.original.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'last_login',
      header: sortableHeader('Last Active'),
      cell: ({ row }) => {
        const ll = row.original.last_login
        const text = relativeTime(ll)
        if (!ll)
          return (
            <span className='text-sm text-muted-foreground'>Never</span>
          )
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className='text-sm cursor-default'>{text}</span>
            </TooltipTrigger>
            <TooltipContent>
              {new Date(ll).toLocaleString()}
            </TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      accessorKey: 'date_joined',
      header: sortableHeader('Joined'),
      cell: ({ row }) => {
        const d = row.original.date_joined
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className='text-sm tabular-nums cursor-default'>
                {new Date(d).toLocaleDateString()}
              </span>
            </TooltipTrigger>
            <TooltipContent>{new Date(d).toLocaleString()}</TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className='flex items-center gap-1'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='h-7 w-7 text-muted-foreground hover:text-foreground'
                onClick={() => openEdit(row.original)}
              >
                <Pencil className='h-3.5 w-3.5' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit user</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='h-7 w-7 text-muted-foreground hover:text-destructive'
                onClick={() => setDeleteTarget(row.original)}
              >
                <Trash2 className='h-3.5 w-3.5' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete user</TooltipContent>
          </Tooltip>
        </div>
      ),
      size: 80,
    },
  ]

  // ── Loading / error states ───────────────────────────────────────────

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (isError) {
    return (
      <div className='flex flex-col items-center justify-center py-20 gap-3'>
        <p className='text-sm text-destructive'>Failed to load users</p>
        <Button variant='outline' size='sm' onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  const canCreate = createForm.username.trim() && createForm.password.trim()

  return (
    <div className='space-y-6'>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <UserCog className='h-6 w-6 text-primary' />
          <div>
            <h1 className='text-2xl font-semibold tracking-tight'>
              User Management
            </h1>
            <p className='text-sm text-muted-foreground'>
              Create, edit, and manage user accounts
            </p>
          </div>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        <Card>
          <CardContent className='flex items-center gap-3 p-4'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10'>
              <Users className='h-4 w-4 text-primary' />
            </div>
            <div>
              <p className='text-2xl font-bold tabular-nums'>{totalCount}</p>
              <p className='text-xs text-muted-foreground'>Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-3 p-4'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950'>
              <ShieldCheck className='h-4 w-4 text-violet-600 dark:text-violet-400' />
            </div>
            <div>
              <p className='text-2xl font-bold tabular-nums'>{staffCount}</p>
              <p className='text-xs text-muted-foreground'>Staff Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-3 p-4'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950'>
              <span className='h-2.5 w-2.5 rounded-full bg-emerald-500' />
            </div>
            <div>
              <p className='text-2xl font-bold tabular-nums'>{activeCount}</p>
              <p className='text-xs text-muted-foreground'>Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='flex items-center gap-3 p-4'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950'>
              <span className='h-2.5 w-2.5 rounded-full bg-red-500' />
            </div>
            <div>
              <p className='text-2xl font-bold tabular-nums'>
                {inactiveCount}
              </p>
              <p className='text-xs text-muted-foreground'>Inactive</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={users}
        searchColumn='username'
        searchPlaceholder='Search users...'
        enableRowSelection
        presetFilters={[
          { label: 'All' },
          { label: 'Staff', filter: (row) => row.is_staff },
          { label: 'Inactive', filter: (row) => !row.is_active },
        ]}
        bulkActions={[
          {
            label: 'Activate',
            action: handleBulkActivate,
            icon: <CheckCircle className='h-3.5 w-3.5' />,
          },
          {
            label: 'Deactivate',
            action: handleBulkDeactivate,
            icon: <XCircle className='h-3.5 w-3.5' />,
          },
          {
            label: 'Delete',
            action: handleBulkDelete,
            variant: 'destructive',
            icon: <Trash2 className='h-3.5 w-3.5' />,
          },
        ]}
        toolbarActions={
          <Button size='sm' onClick={() => setCreateOpen(true)}>
            <Plus className='h-4 w-4 mr-1' />
            New User
          </Button>
        }
      />

      {/* ── Create dialog ───────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>New User</DialogTitle>
            <DialogDescription>
              Set up a new account. The password will be securely hashed.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 mt-1'>
            <SectionLabel>Account</SectionLabel>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label>Username</Label>
                <Input
                  value={createForm.username}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      username: e.target.value,
                    }))
                  }
                  placeholder='jdoe'
                />
              </div>
              <div className='space-y-1.5'>
                <Label>Email</Label>
                <Input
                  type='email'
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder='jdoe@example.com'
                />
              </div>
            </div>
            <div className='space-y-1.5'>
              <Label>Password</Label>
              <PasswordInput
                value={createForm.password}
                onChange={(v) =>
                  setCreateForm((f) => ({ ...f, password: v }))
                }
              />
              <p className='text-xs text-muted-foreground'>
                Minimum 8 characters recommended
              </p>
            </div>

            <Separator />

            <SectionLabel>Personal Information</SectionLabel>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label>First Name</Label>
                <Input
                  value={createForm.first_name}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      first_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div className='space-y-1.5'>
                <Label>Last Name</Label>
                <Input
                  value={createForm.last_name}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      last_name: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <Separator />

            <SectionLabel>Permissions</SectionLabel>
            <div className='rounded-lg border divide-y'>
              <div className='flex items-center justify-between px-4 py-3'>
                <div>
                  <Label
                    htmlFor='create-is-staff'
                    className='cursor-pointer text-sm'
                  >
                    Staff access
                  </Label>
                  <p className='text-xs text-muted-foreground mt-0.5'>
                    Can access the backoffice
                  </p>
                </div>
                <Switch
                  id='create-is-staff'
                  checked={createForm.is_staff}
                  onCheckedChange={(v) =>
                    setCreateForm((f) => ({ ...f, is_staff: v }))
                  }
                />
              </div>
              <div className='flex items-center justify-between px-4 py-3'>
                <div>
                  <Label
                    htmlFor='create-is-active'
                    className='cursor-pointer text-sm'
                  >
                    Active
                  </Label>
                  <p className='text-xs text-muted-foreground mt-0.5'>
                    Can sign in to the site
                  </p>
                </div>
                <Switch
                  id='create-is-active'
                  checked={createForm.is_active}
                  onCheckedChange={(v) =>
                    setCreateForm((f) => ({ ...f, is_active: v }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className='mt-2'>
            <Button
              variant='outline'
              onClick={() => setCreateOpen(false)}
              disabled={createMut.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!canCreate || createMut.isPending}
            >
              {createMut.isPending ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>
              Edit{' '}
              <span className='text-muted-foreground font-normal'>
                @{editTarget?.username}
              </span>
            </DialogTitle>
            <DialogDescription>
              {editTarget &&
                `Member since ${new Date(editTarget.date_joined).toLocaleDateString()}`}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 mt-1'>
            <SectionLabel>Account</SectionLabel>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label>Username</Label>
                <Input
                  value={editForm.username ?? ''}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      username: e.target.value,
                    }))
                  }
                />
              </div>
              <div className='space-y-1.5'>
                <Label>Email</Label>
                <Input
                  type='email'
                  value={editForm.email ?? ''}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
            </div>

            <Separator />

            <SectionLabel>Change Password</SectionLabel>
            <div className='space-y-1.5'>
              <PasswordInput
                value={editForm.password ?? ''}
                onChange={(v) =>
                  setEditForm((f) => ({ ...f, password: v }))
                }
                placeholder='Leave blank to keep current password'
              />
              <p className='text-xs text-muted-foreground'>
                Only fill in if you want to change the password
              </p>
            </div>

            <Separator />

            <SectionLabel>Personal Information</SectionLabel>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label>First Name</Label>
                <Input
                  value={editForm.first_name ?? ''}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      first_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div className='space-y-1.5'>
                <Label>Last Name</Label>
                <Input
                  value={editForm.last_name ?? ''}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      last_name: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <Separator />

            <SectionLabel>Permissions</SectionLabel>
            <div className='rounded-lg border divide-y'>
              <div className='flex items-center justify-between px-4 py-3'>
                <div>
                  <Label
                    htmlFor='edit-is-staff'
                    className='cursor-pointer text-sm'
                  >
                    Staff access
                  </Label>
                  <p className='text-xs text-muted-foreground mt-0.5'>
                    Can access the backoffice
                  </p>
                </div>
                <Switch
                  id='edit-is-staff'
                  checked={editForm.is_staff ?? false}
                  onCheckedChange={(v) =>
                    setEditForm((f) => ({ ...f, is_staff: v }))
                  }
                />
              </div>
              <div className='flex items-center justify-between px-4 py-3'>
                <div>
                  <Label
                    htmlFor='edit-is-active'
                    className='cursor-pointer text-sm'
                  >
                    Active
                  </Label>
                  <p className='text-xs text-muted-foreground mt-0.5'>
                    Can sign in to the site
                  </p>
                </div>
                <Switch
                  id='edit-is-active'
                  checked={editForm.is_active ?? false}
                  onCheckedChange={(v) =>
                    setEditForm((f) => ({ ...f, is_active: v }))
                  }
                />
              </div>
            </div>

            <Separator />

            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-destructive'>
                  Danger Zone
                </p>
                <p className='text-xs text-muted-foreground'>
                  Permanently delete this user account
                </p>
              </div>
              <Button
                variant='outline'
                size='sm'
                className='text-destructive border-destructive/30 hover:bg-destructive/10'
                onClick={() => {
                  if (editTarget) {
                    setDeleteTarget(editTarget)
                    setEditTarget(null)
                  }
                }}
              >
                <Trash2 className='h-3.5 w-3.5 mr-1' />
                Delete
              </Button>
            </div>
          </div>

          <DialogFooter className='mt-2'>
            <Button
              variant='outline'
              onClick={() => setEditTarget(null)}
              disabled={updateMut.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateMut.mutate()}
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
        description='This action cannot be undone. The user will be permanently removed.'
        confirmLabel='Delete'
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />

      {/* ── Bulk delete confirmation ────────────────────────────────── */}
      <ConfirmDialog
        open={bulkDeleteIds.length > 0}
        onOpenChange={(open) => !open && setBulkDeleteIds([])}
        title={`Delete ${bulkDeleteIds.length} user(s)?`}
        description='This action cannot be undone. All selected users will be permanently removed.'
        confirmLabel='Delete All'
        loading={bulkDeleteMut.isPending}
        onConfirm={() => bulkDeleteMut.mutate(bulkDeleteIds)}
      />
    </div>
  )
}
