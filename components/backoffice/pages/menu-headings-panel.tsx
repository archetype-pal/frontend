'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import {
  createMenuHeading,
  deleteMenuHeading,
  getMenuHeadings,
  updateMenuHeading,
} from '@/services/backoffice/pages';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import {
  isReservedHeadingSlug,
  resolvePageText,
  type LocalizedText,
  type MenuHeading,
} from '@/lib/pages';

const EMPTY_TITLE: LocalizedText = { en: '', fr: '', de: '' };

const generateSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Custom main-menu headings (frontend#146). A heading appears in the site
 * header once it has a published page; its position among the built-in
 * sections is set under Site Features.
 */
export function MenuHeadingsPanel({ enabled }: { enabled: boolean }) {
  const t = useTranslations('backoffice');
  const queryClient = useQueryClient();
  // `null` = closed, `'new'` = creating, a heading = editing its titles.
  const [editing, setEditing] = useState<MenuHeading | 'new' | null>(null);
  const [title, setTitle] = useState<LocalizedText>(EMPTY_TITLE);
  const [slug, setSlug] = useState('');
  const [toDelete, setToDelete] = useState<MenuHeading | null>(null);

  const { data: headings = [], isLoading } = useQuery({
    queryKey: backofficeKeys.pages.headings(),
    queryFn: () => getMenuHeadings(),
    enabled,
  });

  // Deleting a heading moves its pages back under About, so the page list changes too.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: backofficeKeys.pages.all() });

  const isNew = editing === 'new';
  const resolvedSlug = isNew ? slug || generateSlug(title.en) : '';
  const reserved = isNew && isReservedHeadingSlug(resolvedSlug);

  const saveMut = useMutation({
    mutationFn: () =>
      editing === 'new'
        ? createMenuHeading({ slug: resolvedSlug, title })
        : updateMenuHeading((editing as MenuHeading).slug, { title }),
    onSuccess: () => {
      toast.success(t('pages.headingToastSaved'));
      setEditing(null);
      invalidate();
    },
    onError: (err) => {
      toast.error(t('pages.headingToastFailedSave'), { description: formatApiError(err) });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (heading: MenuHeading) => deleteMenuHeading(heading.slug),
    onSuccess: () => {
      toast.success(t('pages.headingToastDeleted'));
      setToDelete(null);
      invalidate();
    },
    onError: (err) => {
      toast.error(t('pages.headingToastFailedDelete'), { description: formatApiError(err) });
    },
  });

  const openEditor = (heading: MenuHeading | 'new') => {
    setEditing(heading);
    setTitle(heading === 'new' ? EMPTY_TITLE : heading.title);
    setSlug('');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div className="space-y-1.5">
          <CardTitle>{t('pages.headingsTitle')}</CardTitle>
          <CardDescription>{t('pages.headingsDescription')}</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => openEditor('new')}>
          <Plus className="h-4 w-4 mr-1" />
          {t('pages.headingNewButton')}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <ul className="flex flex-wrap gap-2">
            <li className="rounded-md border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground">
              {t('pagesDetail.menuHeadingAbout')}
            </li>
            {headings.map((heading) => (
              <li
                key={heading.slug}
                className="flex items-center gap-1 rounded-md border px-3 py-1 text-sm"
              >
                <span className="font-medium">
                  {resolvePageText(heading.title, 'en') || heading.slug}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => openEditor(heading)}
                  aria-label={t('pages.headingEdit')}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive"
                  onClick={() => setToDelete(heading)}
                  aria-label={t('pages.headingDelete')}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isNew ? t('pages.headingNewButton') : t('pages.headingEdit')}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {(['en', 'fr', 'de'] as const).map((locale) => (
              <div key={locale} className="space-y-1.5">
                <Label>{t(`pages.headingTitle_${locale}`)}</Label>
                <Input
                  value={title[locale]}
                  onChange={(e) => setTitle((prev) => ({ ...prev, [locale]: e.target.value }))}
                  autoFocus={locale === 'en'}
                />
              </div>
            ))}
            {isNew && (
              <div className="space-y-1.5">
                <Label>{t('pages.headingSlug')}</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder={generateSlug(title.en) || 'help'}
                  className="font-mono text-sm"
                />
                <p className={`text-xs ${reserved ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {reserved ? t('pages.headingReservedSlug') : t('pages.headingSlugHelp')}
                </p>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              {t('confirmDialog.cancel')}
            </Button>
            <Button
              onClick={() => saveMut.mutate()}
              disabled={
                !title.en.trim() || reserved || (isNew && !resolvedSlug) || saveMut.isPending
              }
            >
              {saveMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('pagesDetail.saveButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t('pages.headingDeleteTitle')}
        description={t('pages.headingDeleteDescription')}
        confirmLabel={t('pages.headingDelete')}
        loading={deleteMut.isPending}
        onConfirm={() => toDelete && deleteMut.mutate(toDelete)}
      />
    </Card>
  );
}
