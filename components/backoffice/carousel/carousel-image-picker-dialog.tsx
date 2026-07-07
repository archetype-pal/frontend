'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Folder, Image as ImageIcon, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { getMediaPickerContent } from '@/services/backoffice/manuscripts';

interface CarouselImagePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectImage: (path: string) => void;
  initialPath?: string;
}

export function CarouselImagePickerDialog({
  open,
  onOpenChange,
  onSelectImage,
  initialPath = '',
}: CarouselImagePickerDialogProps) {
  const t = useTranslations('backoffice');
  const { token } = useAuth();
  const [currentPath, setCurrentPath] = useState(initialPath);

  useEffect(() => {
    if (open) {
      setCurrentPath(initialPath); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [open, initialPath]);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: backofficeKeys.carousel.mediaPicker(currentPath),
    queryFn: () => getMediaPickerContent(token!, currentPath),
    enabled: !!token && open,
  });

  const breadcrumbs = useMemo(() => {
    const parts = currentPath.split('/').filter(Boolean);
    const crumbs: { label: string; path: string }[] = [
      { label: t('carousel.mediaRootLabel'), path: '' },
    ];
    let acc = '';
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      crumbs.push({ label: part, path: acc });
    }
    return crumbs;
  }, [currentPath, t]);

  const folders = data?.folders ?? [];
  const images = data?.images ?? [];
  const pending = isLoading || isFetching;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{t('carousel.chooseImageTitle')}</DialogTitle>
          <DialogDescription>{t('carousel.chooseImageDesc')}</DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto">
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.path || 'root'} className="flex items-center gap-1">
                {idx > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
                <button
                  type="button"
                  className="hover:text-foreground transition-colors whitespace-nowrap"
                  onClick={() => setCurrentPath(crumb.path)}
                >
                  {crumb.label}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 relative">
          <ScrollArea className="h-[420px] rounded-md border">
            <div className="p-4 space-y-6">
              {isError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm text-destructive font-medium">
                    {t('carousel.mediaLoadFailed')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{formatApiError(error)}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => refetch()}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    {t('carousel.retryButton')}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('carousel.foldersLabel')}
                    </p>
                    {folders.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('carousel.noSubfolders')}</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {folders.map((folder) => (
                          <button
                            key={folder.path}
                            type="button"
                            className="flex items-center gap-2 rounded-md border p-2 text-left hover:bg-muted transition-colors"
                            onClick={() => setCurrentPath(folder.path)}
                          >
                            <Folder className="h-4 w-4 text-primary shrink-0" />
                            <span className="truncate text-sm">{folder.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('carousel.imagesLabel')}
                    </p>
                    {images.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t('carousel.noImagesInFolder')}
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {images.map((image) => (
                          <button
                            key={image.path}
                            type="button"
                            className="group rounded-md border overflow-hidden text-left hover:border-primary/50 transition-colors"
                            onClick={() => {
                              onSelectImage(image.path);
                              onOpenChange(false);
                            }}
                          >
                            <div className="aspect-square bg-muted relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={image.url}
                                alt={image.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                            <div className="p-2">
                              <p className="text-xs font-medium truncate">{image.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {image.path}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          {pending && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="rounded-md border bg-background/90 px-3 py-2 flex items-center gap-2 text-sm shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('carousel.loadingMedia')}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('carousel.closeButton')}
          </Button>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <ImageIcon className="h-3.5 w-3.5" />
            {t('carousel.selectImageHint')}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
