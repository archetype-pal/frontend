'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Loader2, Save } from 'lucide-react';
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
import { RichTextEditor } from '@/components/backoffice/common/rich-text-editor';
import { useUnsavedGuard } from '@/hooks/backoffice/use-unsaved-guard';
import { useKeyboardShortcut } from '@/hooks/backoffice/use-keyboard-shortcut';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import {
  fetchImageText,
  updateImageText,
  type ImageTextDetail,
  type ImageTextStatus,
} from '@/services/image-texts';

const STATUSES: ImageTextStatus[] = ['Draft', 'Review', 'Live', 'Reviewed'];
const TYPES = ['Transcription', 'Translation'];

const queryKey = (textId: number) => ['backoffice', 'image-texts', 'detail', textId] as const;

export default function ImageTextEditorPage({ params }: { params: Promise<{ textId: string }> }) {
  const { textId: rawId } = use(params);
  const textId = Number(rawId);
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const { data: text, isLoading } = useQuery<ImageTextDetail | null>({
    queryKey: queryKey(textId),
    queryFn: () => fetchImageText(textId, token!),
    enabled: !!token && Number.isFinite(textId),
  });

  const [content, setContent] = useState('');
  const [status, setStatus] = useState<ImageTextStatus>('Draft');
  const [type, setType] = useState<string>('Transcription');
  const [language, setLanguage] = useState('');
  const [dirty, setDirty] = useState(false);

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
    mutationFn: () => updateImageText(token!, textId, { content, status, type, language }),
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

  useKeyboardShortcut(
    'mod+s',
    () => {
      if (dirty && !saveMut.isPending) saveMut.mutate();
    },
    dirty
  );

  if (isLoading || !text) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/backoffice/manuscripts"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-semibold">Edit Image Text #{text.id}</h1>
        </div>
        <Button size="sm" onClick={() => saveMut.mutate()} disabled={!dirty || saveMut.isPending}>
          {saveMut.isPending ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="mr-1 h-3.5 w-3.5" />
          )}
          Save
        </Button>
      </div>

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
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as ImageTextStatus);
              setDirty(true);
            }}
          >
            <SelectTrigger>
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
        <RichTextEditor
          content={content}
          onChange={(html) => {
            setContent(html);
            setDirty(true);
          }}
          placeholder="Enter transcription or translation..."
        />
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href={`/manuscripts/0/images/${text.item_image}/texts/${text.id}`}
          className="inline-flex items-center gap-1 hover:underline"
          target="_blank"
        >
          <ExternalLink className="h-3 w-3" /> Public viewer
        </Link>
        <span>·</span>
        <span>Modified {new Date(text.modified).toLocaleString()}</span>
      </div>
    </div>
  );
}
