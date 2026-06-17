'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, ImageIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 10;

interface ImageUploadZoneProps {
  /** URL of the currently saved image (for preview). */
  currentImageUrl?: string | null;
  /** Called when a valid file is selected or dropped. */
  onFileSelect: (file: File) => void;
  /** Called when the user clears the staged file. */
  onClear?: () => void;
  /** Whether an upload is in progress. */
  loading?: boolean;
  className?: string;
}

/**
 * Drag-and-drop / click-to-browse image upload zone.
 * Shows the current image as a preview, with a hover overlay to replace it.
 */
export function ImageUploadZone({
  currentImageUrl,
  onFileSelect,
  onClear,
  loading = false,
  className,
}: ImageUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Clear staged preview/error when the backing image changes (e.g. item
  // switch). This is the React-docs "adjust state when a prop changes"
  // pattern: reset during render, guarded by a previous-value tracker, so
  // the new value is rendered without an extra synchronous re-render pass.
  // The stale blob is staged for revocation and released in an effect
  // (revokeObjectURL must not run during render).
  const [prevImageUrl, setPrevImageUrl] = useState(currentImageUrl);
  const blobToRevokeRef = useRef<string | null>(null);
  if (currentImageUrl !== prevImageUrl) {
    setPrevImageUrl(currentImageUrl);
    if (previewUrl) blobToRevokeRef.current = previewUrl;
    setPreviewUrl(null);
    setError(null);
  }

  useEffect(() => {
    if (blobToRevokeRef.current) {
      URL.revokeObjectURL(blobToRevokeRef.current);
      blobToRevokeRef.current = null;
    }
  });

  const displayUrl = previewUrl || currentImageUrl;

  const validate = useCallback((file: File): boolean => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Please select a JPEG, PNG, WebP, or GIF image.');
      return false;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be smaller than ${MAX_SIZE_MB} MB.`);
      return false;
    }
    setError(null);
    return true;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (!validate(file)) return;
      // Revoke the previous preview URL before overwriting it. Picking a
      // second file in succession would otherwise orphan the first blob
      // URL — the browser holds the blob in memory until full page
      // reload, leaking ~10 MB per replaced upload.
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      onFileSelect(file);
    },
    [validate, onFileSelect]
  );

  // Revoke any staged preview URL on unmount so navigating away from a
  // form with a chosen-but-not-saved file doesn't leak the blob. Read
  // the latest previewUrl through a ref so the cleanup only runs on
  // unmount (not on every change — intermediate replacements are
  // revoked inline by handleFile / handleClear).
  const previewUrlRef = useRef<string | null>(null);
  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      if (inputRef.current) inputRef.current.value = '';
    },
    [handleFile]
  );

  const handleClear = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    onClear?.();
  }, [previewUrl, onClear]);

  return (
    <div className={cn('space-y-2', className)}>
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          'group relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors cursor-pointer overflow-hidden',
          'min-h-[200px]',
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          loading && 'pointer-events-none opacity-60'
        )}
      >
        {displayUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt="Carousel item preview"
              className="h-full w-full object-cover absolute inset-0"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex flex-col items-center gap-1 text-white">
                <Upload className="h-6 w-6" />
                <span className="text-sm font-medium">Replace image</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-muted-foreground">
            <ImageIcon className="h-10 w-10 opacity-40" />
            <p className="text-sm font-medium">Drop an image here or click to browse</p>
            <p className="text-xs opacity-60">
              JPEG, PNG, WebP, or GIF &middot; max {MAX_SIZE_MB} MB
            </p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleInputChange}
          className="hidden"
          aria-label="Upload image"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {previewUrl && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">New image staged</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
