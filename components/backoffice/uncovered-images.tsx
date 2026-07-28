'use client';

/**
 * Coverage donut drilldown — lists images that have no text (or no
 * transcription / no translation, depending on URL state) with a quick
 * "+ Transcription" / "+ Translation" affordance per row.
 *
 * URL-driven: `?coverage=either|transcription|translation` so the donut
 * segments can deep-link to the right view.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ServerPagination } from '@/components/backoffice/common/server-pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth-context';
import { fetchUncoveredImages, type UncoveredMode } from '@/services/backoffice/uncovered-images';
import {
  NewImageTextDialog,
  type NewTextKind,
} from '@/components/backoffice/new-image-text-dialog';

const PAGE_SIZE = 25;

function parseMode(value: string | null): UncoveredMode {
  if (value === 'transcription' || value === 'translation') return value;
  return 'either';
}

export function UncoveredImages() {
  const t = useTranslations('backoffice');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();

  const mode = parseMode(searchParams?.get('coverage') ?? null);
  const page = Math.max(0, Number.parseInt(searchParams?.get('uPage') ?? '0', 10) || 0);

  const [dialogState, setDialogState] = useState<{
    open: boolean;
    itemImage: number | null;
    type: NewTextKind;
  }>({ open: false, itemImage: null, type: 'Transcription' });

  const { data, isFetching, error } = useQuery({
    queryKey: ['backoffice', 'uncovered-images', mode, page],
    queryFn: () => fetchUncoveredImages(token!, mode, page, PAGE_SIZE),
    enabled: !!token,
    placeholderData: (prev) => prev,
  });

  function setMode(next: UncoveredMode) {
    const sp = new URLSearchParams(searchParams?.toString() ?? '');
    if (next === 'either') sp.delete('coverage');
    else sp.set('coverage', next);
    sp.delete('uPage');
    router.replace(sp.toString() ? `?${sp.toString()}#uncovered` : '?#uncovered', {
      scroll: false,
    });
  }

  function setPage(next: number) {
    const sp = new URLSearchParams(searchParams?.toString() ?? '');
    if (next > 0) sp.set('uPage', String(next));
    else sp.delete('uPage');
    router.replace(sp.toString() ? `?${sp.toString()}#uncovered` : '?#uncovered', {
      scroll: false,
    });
  }

  function openCreate(imageId: number, type: NewTextKind) {
    setDialogState({ open: true, itemImage: imageId, type });
  }

  const total = data?.count ?? 0;
  const rows = data?.results ?? [];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base font-medium">
                {t('quality.uncovered.title')}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t('quality.uncovered.description', {
                  mode: t(`quality.uncovered.${MODE_LABEL_KEY[mode]}`),
                  kind:
                    mode === 'translation'
                      ? t('quality.uncovered.translation')
                      : t('quality.uncovered.transcription'),
                })}
              </p>
            </div>
            <Tabs value={mode} onValueChange={(v) => setMode(v as UncoveredMode)}>
              <TabsList className="h-8">
                <TabsTrigger value="either" className="text-xs">
                  {t('quality.uncovered.tabNoText')}
                </TabsTrigger>
                <TabsTrigger value="transcription" className="text-xs">
                  {t('quality.uncovered.tabNoTranscription')}
                </TabsTrigger>
                <TabsTrigger value="translation" className="text-xs">
                  {t('quality.uncovered.tabNoTranslation')}
                </TabsTrigger>
              </TabsList>
              <TabsContent value={mode} />
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-0 pb-0">
          {error && (
            <div className="mx-6 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {t('quality.uncovered.loadError', { message: (error as Error).message })}
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">{t('quality.uncovered.colImage')}</TableHead>
                  <TableHead>{t('quality.uncovered.colLocus')}</TableHead>
                  <TableHead className="w-[100px] text-right">
                    {t('quality.uncovered.colAnnotations')}
                  </TableHead>
                  <TableHead className="w-[100px]">{t('quality.uncovered.colHas')}</TableHead>
                  <TableHead className="w-[220px] text-right">
                    {t('quality.uncovered.colCreate')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      {isFetching
                        ? t('quality.uncovered.loading')
                        : t('quality.uncovered.noMatches')}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const hasTranscription = row.texts.some((t) => t.type === 'Transcription');
                    const hasTranslation = row.texts.some((t) => t.type === 'Translation');
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">#{row.id}</TableCell>
                        <TableCell className="text-sm">{row.locus || '—'}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {row.annotation_count}
                        </TableCell>
                        <TableCell className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {hasTranscription && (
                            <span title={t('quality.uncovered.transcriptionExists')}>T</span>
                          )}
                          {hasTranscription && hasTranslation && <span> · </span>}
                          {hasTranslation && (
                            <span title={t('quality.uncovered.translationExists')}>X</span>
                          )}
                          {!hasTranscription && !hasTranslation && <span>—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {!hasTranscription && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => openCreate(row.id, 'Transcription')}
                              >
                                <Plus className="mr-1 h-3 w-3" />
                                {t('quality.uncovered.transcription')}
                              </Button>
                            )}
                            {!hasTranslation && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => openCreate(row.id, 'Translation')}
                              >
                                <Plus className="mr-1 h-3 w-3" />
                                {t('quality.uncovered.translation')}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="px-6 pb-4">
            <ServerPagination
              total={total}
              pageSize={PAGE_SIZE}
              page={page}
              hasNext={!!data?.next}
              onPageChange={setPage}
            />
          </div>
          {isFetching && (
            <div className="absolute right-6 top-3 text-xs text-muted-foreground">
              <Loader2 className="inline h-3 w-3 animate-spin" />
            </div>
          )}
        </CardContent>
      </Card>

      <NewImageTextDialog
        open={dialogState.open}
        onOpenChange={(next) => setDialogState((s) => ({ ...s, open: next }))}
        defaultItemImage={dialogState.itemImage}
        defaultType={dialogState.type}
        lockItemImage
        lockType
      />
    </>
  );
}

const MODE_LABEL_KEY: Record<UncoveredMode, string> = {
  transcription: 'modeTranscription',
  translation: 'modeTranslation',
  either: 'modeEither',
};
