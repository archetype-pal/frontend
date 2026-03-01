'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Image as ImageIcon, Check, ExternalLink } from 'lucide-react';
import { IiifThumbnail } from '@/components/backoffice/common/iiif-thumbnail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import dynamic from 'next/dynamic';
const RichTextEditor = dynamic(
  () => import('@/components/backoffice/common/rich-text-editor').then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => <div className="h-[200px] rounded-md border animate-pulse bg-muted" />,
  }
);
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { EntityEditorActions } from '@/components/backoffice/common/entity-editor-actions';
import { getHand, updateHand, deleteHand } from '@/services/backoffice/scribes';
import { getItemImages } from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { useUnsavedGuard } from '@/hooks/backoffice/use-unsaved-guard';
import { useKeyboardShortcut } from '@/hooks/backoffice/use-keyboard-shortcut';
import { toast } from 'sonner';

export default function HandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = use(params);
  const id = Number(rawId);
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: hand, isLoading } = useQuery({
    queryKey: backofficeKeys.hands.detail(id),
    queryFn: () => getHand(token!, id),
    enabled: !!token,
  });

  const [name, setName] = useState('');
  const [place, setPlace] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImages, setSelectedImages] = useState<number[]>([]);
  const [dirty, setDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Fetch images for the hand's item part
  const { data: imagesData, isLoading: imagesLoading } = useQuery({
    queryKey: ['backoffice', 'item-images', hand?.item_part],
    queryFn: () => getItemImages(token!, { item_part: hand!.item_part, limit: 200 }),
    enabled: !!token && !!hand?.item_part,
  });

  const availableImages = useMemo(() => imagesData?.results ?? [], [imagesData]);

  useEffect(() => {
    if (hand) {
      setName(hand.name); // eslint-disable-line react-hooks/set-state-in-effect
      setPlace(hand.place);
      setDescription(hand.description);
      setSelectedImages(hand.item_part_images ?? []);
      setDirty(false);
    }
  }, [hand]);

  useUnsavedGuard(dirty);

  const saveMut = useMutation({
    mutationFn: () =>
      updateHand(token!, id, {
        name,
        place,
        description,
        item_part_images: selectedImages,
      }),
    onSuccess: () => {
      toast.success('Hand saved');
      queryClient.invalidateQueries({ queryKey: backofficeKeys.hands.detail(id) });
      queryClient.invalidateQueries({ queryKey: backofficeKeys.hands.all() });
      setDirty(false);
    },
    onError: (err) => {
      toast.error('Failed to save hand', {
        description: formatApiError(err),
      });
    },
  });

  useKeyboardShortcut(
    'mod+s',
    () => {
      if (dirty && !saveMut.isPending) saveMut.mutate();
    },
    dirty
  );

  const deleteMut = useMutation({
    mutationFn: () => deleteHand(token!, id),
    onSuccess: () => {
      toast.success('Hand deleted');
      queryClient.invalidateQueries({ queryKey: backofficeKeys.hands.all() });
      router.push('/backoffice/hands');
    },
    onError: (err) => {
      toast.error('Failed to delete hand', {
        description: formatApiError(err),
      });
    },
  });

  if (isLoading || !hand) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const markDirty = () => setDirty(true);

  const toggleImage = (imageId: number) => {
    setSelectedImages((prev) =>
      prev.includes(imageId) ? prev.filter((id) => id !== imageId) : [...prev, imageId]
    );
    markDirty();
  };

  const selectAllImages = () => {
    setSelectedImages(availableImages.map((img) => img.id));
    markDirty();
  };

  const deselectAllImages = () => {
    setSelectedImages([]);
    markDirty();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Link href="/backoffice/hands" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-semibold">{hand.name}</h1>
          {hand.script_name && <Badge variant="outline">{hand.script_name}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <EntityEditorActions
            dirty={dirty}
            isSaving={saveMut.isPending}
            onSave={() => saveMut.mutate()}
            onDelete={() => setDeleteOpen(true)}
          />
        </div>
      </div>

      {/* Read-only info card */}
      <div className="rounded-md border p-4 text-sm space-y-1">
        <p>
          <span className="text-muted-foreground">Scribe:</span>{' '}
          <Link
            href={`/backoffice/scribes/${hand.scribe}`}
            className="text-primary hover:underline"
          >
            {hand.scribe_name}
          </Link>
        </p>
        <p>
          <span className="text-muted-foreground">Item Part:</span>{' '}
          <Link
            href={`/backoffice/manuscripts/${hand.item_part}`}
            className="text-primary hover:underline"
          >
            {hand.item_part_display}
          </Link>
        </p>
        {hand.date_display && (
          <p>
            <span className="text-muted-foreground">Date:</span> {hand.date_display}
          </p>
        )}
      </div>

      {/* Quick links */}
      <div className="flex items-center gap-2">
        <Link href={`/hands/${id}`} target="_blank">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <ExternalLink className="h-3 w-3" />
            View Public Page
          </Button>
        </Link>
        <Link href={`/backoffice/scribes/${hand.scribe}`}>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            Go to Scribe
          </Button>
        </Link>
      </div>

      {/* Editable fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              markDirty();
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Place</Label>
          <Input
            value={place}
            onChange={(e) => {
              setPlace(e.target.value);
              markDirty();
            }}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Description</Label>
        <RichTextEditor
          content={description}
          onChange={(html) => {
            setDescription(html);
            markDirty();
          }}
          placeholder="Enter hand description..."
          minimal
        />
      </div>

      {/* Image selection section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base">Images where this hand appears</Label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {selectedImages.length} of {availableImages.length} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={selectAllImages}
              disabled={selectedImages.length === availableImages.length}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={deselectAllImages}
              disabled={selectedImages.length === 0}
            >
              Deselect All
            </Button>
          </div>
        </div>

        {imagesLoading ? (
          <div className="flex items-center justify-center h-24 rounded-md border border-dashed">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : availableImages.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground text-sm">
            No images found for this item part.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {availableImages.map((img) => {
              const isSelected = selectedImages.includes(img.id);
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => toggleImage(img.id)}
                  className={`
                    relative group rounded-lg border-2 p-3 text-left transition-all
                    ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/30'
                    }
                  `}
                >
                  {/* Check indicator */}
                  <div
                    className={`
                      absolute top-2 right-2 h-5 w-5 rounded-full flex items-center justify-center transition-colors
                      ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-transparent group-hover:bg-muted-foreground/20'
                      }
                    `}
                  >
                    <Check className="h-3 w-3" />
                  </div>

                  <IiifThumbnail image={img.image} locus={img.locus} className="mb-2" />

                  <div className="space-y-0.5">
                    <p className="text-xs font-medium truncate">
                      {img.locus || `Image #${img.id}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">ID: {img.id}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${hand.name}"?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  );
}
