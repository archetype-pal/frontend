'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { Calendar, ExternalLink, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DataTable, sortableHeader } from '@/components/backoffice/common/data-table';
import { getEvents, createEvent } from '@/services/backoffice/publications';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import type { EventItem } from '@/types/backoffice';
import { toast } from 'sonner';

const columns: ColumnDef<EventItem>[] = [
  {
    accessorKey: 'title',
    header: sortableHeader('Title'),
    cell: ({ row }) => (
      <Link
        href={`/backoffice/events/${row.original.slug}`}
        className="font-medium text-primary hover:underline"
      >
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground font-mono">{row.original.slug}</span>
    ),
    size: 150,
  },
  {
    accessorKey: 'created_at',
    header: sortableHeader('Created'),
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground tabular-nums">
        {new Date(row.original.created_at).toLocaleDateString()}
      </span>
    ),
    size: 100,
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <Link href={`/backoffice/events/${row.original.slug}`}>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </Link>
    ),
    size: 50,
  },
];

export default function EventsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [slugLocked, setSlugLocked] = useState(false);

  const { data } = useQuery({
    queryKey: backofficeKeys.events.all(),
    queryFn: () => getEvents(token!),
    enabled: !!token,
  });

  const generateSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const handleTitleChange = (value: string) => {
    setNewTitle(value);
    if (!slugLocked) {
      setNewSlug(generateSlug(value));
    }
  };

  const createMut = useMutation({
    mutationFn: () =>
      createEvent(token!, {
        title: newTitle,
        slug: newSlug || generateSlug(newTitle),
        content: '<p></p>',
      }),
    onSuccess: (data) => {
      toast.success('Event created');
      queryClient.invalidateQueries({ queryKey: backofficeKeys.events.all() });
      setCreateOpen(false);
      setNewTitle('');
      setNewSlug('');
      setSlugLocked(false);
      router.push(`/backoffice/events/${data.slug}`);
    },
    onError: (err) => {
      toast.error('Failed to create event', {
        description: formatApiError(err),
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
            <p className="text-sm text-muted-foreground">{data?.count ?? '...'} events</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Event
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.results ?? []}
        searchColumn="title"
        searchPlaceholder="Search events..."
      />

      {/* Create Event Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Event title"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Slug</Label>
                <button
                  type="button"
                  onClick={() => {
                    const next = !slugLocked;
                    setSlugLocked(next);
                    if (!next) setNewSlug(generateSlug(newTitle));
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {slugLocked ? 'Auto-generate' : 'Lock (manual)'}
                </button>
              </div>
              <Input
                value={newSlug}
                onChange={(e) => {
                  setNewSlug(e.target.value);
                  setSlugLocked(true);
                }}
                placeholder="event-title"
                className="font-mono text-sm"
              />
              {newSlug && <p className="text-xs text-muted-foreground">URL: /events/{newSlug}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!newTitle.trim() || createMut.isPending}
            >
              {createMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create & Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
