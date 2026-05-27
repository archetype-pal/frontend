'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Loader2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TeiTextEditor } from '@/components/backoffice/tei-text-editor';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { useUnsavedGuard } from '@/hooks/backoffice/use-unsaved-guard';
import { useKeyboardShortcut } from '@/hooks/backoffice/use-keyboard-shortcut';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import {
  deleteImageText,
  fetchImageText,
  updateImageText,
  type ImageTextDetail,
  type ImageTextStatus,
} from '@/services/image-texts';
import { fetchManuscriptImage } from '@/services/manuscripts';
import { transitionImageText, type TransitionPayload } from '@/services/backoffice/review-queue';
import { fetchImageTextHistory } from '@/services/backoffice/image-text-history';

const STATUSES: ImageTextStatus[] = ['Draft', 'Review', 'Live', 'Reviewed'];
const TYPES = ['Transcription', 'Translation'];

const queryKey = (textId: number) => ['backoffice', 'image-texts', 'detail', textId] as const;
const historyKey = (textId: number) =>
  ['backoffice', 'image-texts', 'detail', textId, 'history'] as const;

export default function ImageTextEditorPage({ params }: { params: Promise<{ textId: string }> }) {
  const { textId: rawId } = use(params);
  const textId = Number(rawId);
  const router = useRouter();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    data: text,
    isLoading,
    isError,
    error: fetchError,
  } = useQuery<ImageTextDetail | null>({
    queryKey: queryKey(textId),
    queryFn: () => fetchImageText(textId, token!),
    enabled: !!token && Number.isFinite(textId),
  });

  // The text record carries `item_image` but not the parent `item_part`,
  // which the public-viewer URL needs for the back-link in the layout
  // header. Resolve it once the text loads so the "Public viewer" link is
  // valid (the previous hard-coded `/manuscripts/0/...` 404'd the back-link).
  const { data: image } = useQuery({
    queryKey: ['backoffice', 'item-image', text?.item_image],
    queryFn: () => fetchManuscriptImage(String(text!.item_image)),
    enabled: !!text,
  });

  const { data: history } = useQuery({
    queryKey: historyKey(textId),
    queryFn: () => fetchImageTextHistory(token!, textId),
    enabled: !!token && Number.isFinite(textId),
  });

  const [content, setContent] = useState('');
  const [status, setStatus] = useState<ImageTextStatus>('Draft');
  const [type, setType] = useState<string>('Transcription');
  const [language, setLanguage] = useState('');
  const [dirty, setDirty] = useState(false);
  const [teiValid, setTeiValid] = useState(true);

  useEffect(() => {
    if (text) {
      setContent(text.content); // eslint-disable-line react-hooks/set-state-in-effect
      setStatus(text.status);
      setType(text.type);
      setLanguage(text.language ?? '');
      setDirty(false);
    }
  }, [text]);

  useUnsavedGuard(dirty);

  const saveMut = useMutation({
    // Direct PATCH skips the audit log on purpose: it's for non-workflow
    // edits (content, language, type). Status changes go through
    // `transitionMut` below so every Draft → Review → Live step lands in
    // `StatusTransition`.
    mutationFn: () => updateImageText(token!, textId, { content, type, language }),
    onSuccess: (saved) => {
      toast.success('Text saved');
      queryClient.setQueryData(queryKey(textId), saved);
      queryClient.invalidateQueries({ queryKey: queryKey(textId) });
      setDirty(false);
    },
    onError: (err) => {
      toast.error('Failed to save text', { description: formatApiError(err) });
    },
  });

  const transitionMut = useMutation({
    mutationFn: (payload: TransitionPayload) => transitionImageText(token!, textId, payload),
    onSuccess: (saved) => {
      toast.success(`Status → ${saved.status}`);
      queryClient.invalidateQueries({ queryKey: queryKey(textId) });
      queryClient.invalidateQueries({ queryKey: historyKey(textId) });
      queryClient.invalidateQueries({ queryKey: ['backoffice', 'image-texts', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['backoffice', 'texts-monitor', 'overview'] });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      setStatus(saved.status);
    },
    onError: (err) => toast.error('Transition failed', { description: formatApiError(err) }),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteImageText(token!, textId),
    onSuccess: () => {
      toast.success(`Deleted image-text #${textId}`);
      queryClient.invalidateQueries({ queryKey: ['backoffice', 'image-texts', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['backoffice', 'texts-monitor', 'overview'] });
      // The detail query would 404 if we left it cached.
      queryClient.removeQueries({ queryKey: queryKey(textId) });
      router.push('/backoffice/texts');
    },
    onError: (err) => toast.error('Delete failed', { description: formatApiError(err) }),
  });

  useKeyboardShortcut(
    'mod+s',
    () => {
      if (dirty && teiValid && !saveMut.isPending) saveMut.mutate();
    },
    dirty
  );

  if (isError) {
    // The service throws on non-404 errors so a transient outage doesn't
    // get hidden behind a perpetual spinner. Surface the error message so
    // the user knows to retry rather than wait indefinitely.
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <p>Could not load image text.</p>
        <p className="text-xs">
          {fetchError instanceof Error ? fetchError.message : String(fetchError)}
        </p>
      </div>
    );
  }
  if (isLoading || !text) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/backoffice/texts">Texts</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {image && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/backoffice/manuscripts/${image.item_part}`}>
                    {image.locus ? `folio ${image.locus}` : `Image #${text.item_image}`}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              Edit #{text.id} ({text.type})
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/backoffice/texts"
            className="text-muted-foreground hover:text-foreground"
            title="Back to Texts"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-semibold">Edit Image Text #{text.id}</h1>
          <span
            className="ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]"
            title="Current status"
          >
            {status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
            disabled={deleteMut.isPending}
            title="Delete this image-text"
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Delete
          </Button>
          <TransitionAction
            currentStatus={status}
            pending={transitionMut.isPending}
            onTransition={(payload) => transitionMut.mutate(payload)}
          />
          <Button
            size="sm"
            onClick={() => saveMut.mutate()}
            disabled={!dirty || !teiValid || saveMut.isPending}
            title={!teiValid ? 'Fix invalid TEI before saving' : undefined}
          >
            {saveMut.isPending ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1 h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete image-text #${textId}?`}
        description={`This permanently removes the ${text.type.toLowerCase()} and any associated status history. This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select
            value={type}
            onValueChange={(value) => {
              setType(value);
              setDirty(true);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
            {status}
            <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground/70">
              audited
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Language</Label>
          <Input
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              setDirty(true);
            }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Content</Label>
        <TeiTextEditor
          value={content}
          token={token}
          onValidityChange={setTeiValid}
          onChange={(next) => {
            setContent(next);
            setDirty(true);
          }}
          placeholder="Enter TEI markup for the transcription or translation..."
        />
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {image && (
          <>
            <Link
              href={`/manuscripts/${image.item_part}/images/${text.item_image}/texts`}
              className="inline-flex items-center gap-1 hover:underline"
              target="_blank"
            >
              <ExternalLink className="h-3 w-3" /> Public viewer
            </Link>
            <span>·</span>
          </>
        )}
        <span>Modified {new Date(text.modified).toLocaleString()}</span>
      </div>

      <HistoryPanel history={history} />
    </div>
  );
}

function TransitionAction({
  currentStatus,
  pending,
  onTransition,
}: {
  currentStatus: ImageTextStatus;
  pending: boolean;
  onTransition: (payload: TransitionPayload) => void;
}) {
  const NEXT: Record<ImageTextStatus, ImageTextStatus> = {
    Draft: 'Review',
    Review: 'Live',
    Live: 'Reviewed',
    Reviewed: 'Live',
  };
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<ImageTextStatus>(NEXT[currentStatus]);
  const [note, setNote] = useState('');

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setTarget(NEXT[currentStatus]);
          setNote('');
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          Transition…
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <div className="text-xs">
          <p className="text-muted-foreground">Current</p>
          <p className="font-medium">{currentStatus}</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Target status</Label>
          <Select value={target} onValueChange={(v) => setTarget(v as ImageTextStatus)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.filter((s) => s !== currentStatus).map((s) => (
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
            disabled={pending}
            onClick={() => {
              onTransition({ to_status: target, note: note.trim() || undefined });
              setOpen(false);
            }}
          >
            {pending ? 'Saving…' : `→ ${target}`}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function HistoryPanel({
  history,
}: {
  history:
    | Array<{
        id: number;
        from_status: ImageTextStatus;
        to_status: ImageTextStatus;
        actor: number | null;
        actor_username: string | null;
        note: string;
        created: string;
      }>
    | undefined;
}) {
  if (!history) return null;
  return (
    <section className="space-y-2 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Status history</h2>
        <span className="text-[11px] text-muted-foreground">
          {history.length === 0
            ? 'No transitions yet.'
            : `${history.length} transition${history.length === 1 ? '' : 's'}`}
        </span>
      </div>
      {history.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Changes made via the “Transition…” button will appear here.
        </p>
      ) : (
        <ol className="space-y-2">
          {history.map((row) => (
            <li
              key={row.id}
              className="flex items-start gap-3 rounded-md border bg-background/40 px-3 py-2 text-xs"
            >
              <span className="font-mono tabular-nums text-muted-foreground">
                {new Date(row.created).toLocaleString()}
              </span>
              <span>
                <span className="font-medium">{row.from_status}</span>
                {' → '}
                <span className="font-medium">{row.to_status}</span>
              </span>
              <span className="text-muted-foreground">by {row.actor_username ?? 'system'}</span>
              {row.note && <span className="ml-2 flex-1 text-muted-foreground">“{row.note}”</span>}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
