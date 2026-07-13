'use client';

import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from '@/components/ui/table';
import Link from 'next/link';
import { useTabNavigation } from '@/hooks/use-tab-navigation';
import type { ScribeDetail, ScribeHand } from '@/types/scribe-detail';
import { Calendar, Building2, User, PenTool, Pen } from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { BackofficeLink } from '@/components/common/backoffice-link';

const TAB_VALUES = ['information', 'hands', 'idiographs'] as const;
const DEFAULT_TAB = 'information';

interface ScribeViewerProps {
  scribe: ScribeDetail;
  hands: ScribeHand[];
}

export function ScribeViewer({ scribe, hands }: ScribeViewerProps) {
  const { activeTab, handleTabChange } = useTabNavigation(TAB_VALUES, DEFAULT_TAB);
  const t = useTranslations('scribe');

  const period = scribe.period ?? scribe.date ?? null;

  return (
    <main className="container mx-auto p-4 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-1">
          <Link href="/search/scribes" className="hover:underline">
            {t('breadcrumb')}
          </Link>
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-3xl font-medium text-foreground">
            <span className="text-muted-foreground font-normal">{t('titlePrefix')}</span>
            {scribe.name}
          </h1>
          <BackofficeLink kind="scribe" id={scribe.id} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-secondary p-1">
          <TabsTrigger value="information">{t('tabs.information')}</TabsTrigger>
          <TabsTrigger value="hands">
            {t('tabs.hands')} ({hands.length})
          </TabsTrigger>
          <TabsTrigger value="idiographs">
            {t('tabs.idiographs')} ({scribe.idiographs?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* Information Tab */}
        <TabsContent value="information" className="space-y-6">
          {/* Date & Place */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4">{t('sections.dateAndPlace')}</h2>
            <dl className="grid grid-cols-[180px_1fr] gap-x-4 gap-y-3">
              <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('fields.name')}
              </dt>
              <dd className="text-sm">{scribe.name}</dd>

              {period && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('fields.date')}
                  </dt>
                  <dd className="text-sm">{period}</dd>
                </>
              )}

              {scribe.scriptorium && (
                <>
                  <dt className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {t('fields.scriptorium')}
                  </dt>
                  <dd className="text-sm">{scribe.scriptorium}</dd>
                </>
              )}
            </dl>
          </div>

          {/* Description (if any) */}
          {scribe.description && (
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">{t('fields.description')}</h2>
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(scribe.description) }}
              />
            </div>
          )}
        </TabsContent>

        {/* Hands Tab */}
        <TabsContent value="hands">
          {hands.length > 0 ? (
            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('fields.itemPart')}</TableHead>
                    <TableHead>{t('fields.hand')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('fields.date')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('fields.place')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hands.map((hand) => (
                    <TableRow
                      key={hand.id}
                      className="relative cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>
                        <Link
                          href={`/manuscripts/${hand.item_part}`}
                          className="text-primary hover:underline relative z-[2]"
                        >
                          {hand.item_part_display_label ??
                            hand.shelfmark ??
                            t('manuscriptFallback', { id: hand.item_part })}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/hands/${hand.id}`}
                          className="text-primary hover:underline relative z-[2]"
                        >
                          {hand.name}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {hand.date ?? '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {hand.place ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 rounded-md p-4">
                <PenTool className="h-4 w-4" />
                <span>{t('empty.hands')}</span>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Idiographs Tab */}
        <TabsContent value="idiographs">
          {scribe.idiographs && scribe.idiographs.length > 0 ? (
            <div className="rounded-lg border bg-card p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {scribe.idiographs.map((idiograph) => (
                  <div
                    key={idiograph.id}
                    className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium"
                  >
                    {idiograph.name}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 rounded-md p-4">
                <Pen className="h-4 w-4" />
                <span>{t('empty.idiographs')}</span>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
