'use client';

import { use, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Save, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dynamic from 'next/dynamic';
const RichTextEditor = dynamic(
  () => import('@/components/backoffice/common/rich-text-editor').then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => <div className="h-[200px] rounded-md border animate-pulse bg-muted" />,
  }
);
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { getPage, updatePage, deletePage } from '@/services/backoffice/pages';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { isReservedPageSlug, type LocalizedText, type PageStatus } from '@/lib/pages';
import { useUnsavedGuard } from '@/hooks/backoffice/use-unsaved-guard';
import { useKeyboardShortcut } from '@/hooks/backoffice/use-keyboard-shortcut';
import { useAutosave } from '@/hooks/backoffice/use-autosave';

export default function PageEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations('backoffice');

  const { data: page, isLoading } = useQuery({
    queryKey: backofficeKeys.pages.detail(slug),
    queryFn: () => getPage(token!, slug),
    enabled: !!token,
  });

  const [pageSlug, setPageSlug] = useState('');
  const [slugLocked, setSlugLocked] = useState(true);
  const [title, setTitle] = useState<LocalizedText>({ en: '', fr: '' });
  const [content, setContent] = useState<LocalizedText>({ en: '', fr: '' });
  const [status, setStatus] = useState<PageStatus>('Draft');
  const [order, setOrder] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const generateSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  useEffect(() => {
    if (page) {
      setPageSlug(page.slug); // eslint-disable-line react-hooks/set-state-in-effect
      setTitle(page.title);
      setContent(page.content);
      setStatus(page.status);
      setOrder(page.order);
      setDirty(false);
    }
  }, [page]);

  const autosaveData = { pageSlug, title, content, status, order };
  const {
    status: autosaveStatus,
    discard: discardDraft,
    recover,
    getDraftInfo,
  } = useAutosave(`page:${slug}`, autosaveData, dirty);

  const [showRecovery, setShowRecovery] = useState(false);
  useEffect(() => {
    const info = getDraftInfo();
    if (info.exists && page) {
      setShowRecovery(true); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const recoverDraft = () => {
    const draft = recover();
    if (draft) {
      setPageSlug(draft.pageSlug);
      setTitle(draft.title);
      setContent(draft.content);
      setStatus(draft.status);
      setOrder(draft.order);
      setDirty(true);
    }
    setShowRecovery(false);
  };

  const dismissRecovery = () => {
    discardDraft();
    setShowRecovery(false);
  };

  useUnsavedGuard(dirty);

  const reserved = pageSlug !== slug && isReservedPageSlug(pageSlug);

  const saveMut = useMutation({
    mutationFn: () => updatePage(token!, slug, { slug: pageSlug, title, content, status, order }),
    onSuccess: (data) => {
      toast.success(t('pagesDetail.toastSaved'));
      discardDraft();
      queryClient.invalidateQueries({ queryKey: backofficeKeys.pages.detail(slug) });
      queryClient.invalidateQueries({ queryKey: backofficeKeys.pages.all() });
      setDirty(false);
      if (data.slug !== slug) {
        router.replace(`/backoffice/pages/${data.slug}`);
      }
    },
    onError: (err) => {
      toast.error(t('pagesDetail.toastFailedSave'), { description: formatApiError(err) });
    },
  });

  useKeyboardShortcut(
    'mod+s',
    () => {
      if (dirty && !reserved && !saveMut.isPending) saveMut.mutate();
    },
    dirty
  );

  const deleteMut = useMutation({
    mutationFn: () => deletePage(token!, slug),
    onSuccess: () => {
      toast.success(t('pagesDetail.toastDeleted'));
      queryClient.invalidateQueries({ queryKey: backofficeKeys.pages.all() });
      router.push('/backoffice/pages');
    },
    onError: (err) => {
      toast.error(t('pagesDetail.toastFailedDelete'), { description: formatApiError(err) });
    },
  });

  if (isLoading || !page) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const markDirty = () => setDirty(true);
  const displayTitle = title.en || title.fr || pageSlug;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Link href="/backoffice/pages" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-semibold line-clamp-1">{displayTitle}</h1>
          <Badge variant={status === 'Published' ? 'default' : 'secondary'}>{status}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/about/${slug}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              {t('pagesDetail.viewPublicPage')}
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            {t('pagesDetail.deleteButton')}
          </Button>
          <Button
            size="sm"
            onClick={() => saveMut.mutate()}
            disabled={!dirty || reserved || saveMut.isPending}
          >
            {saveMut.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1" />
            )}
            {t('pagesDetail.saveButton')}
          </Button>
        </div>
      </div>

      {showRecovery && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-4 py-3">
          <span className="text-sm text-amber-800 dark:text-amber-200 flex-1">
            {t('pagesDetail.recoveryBanner')}
          </span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={recoverDraft}>
            {t('pagesDetail.recoverDraft')}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={dismissRecovery}>
            {t('pagesDetail.dismissRecovery')}
          </Button>
        </div>
      )}

      {dirty && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {autosaveStatus === 'saving' && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>{t('pagesDetail.autosaving')}</span>
            </>
          )}
          {autosaveStatus === 'saved' && <span>{t('pagesDetail.draftAutosaved')}</span>}
          {autosaveStatus === 'idle' && <span>{t('pagesDetail.unsavedChanges')}</span>}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>{t('pagesDetail.fieldSlug')}</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                const next = !slugLocked;
                setSlugLocked(next);
                if (!next) {
                  setPageSlug(generateSlug(title.en));
                  markDirty();
                }
              }}
            >
              {slugLocked ? t('pagesDetail.slugAutoGenerate') : t('pagesDetail.slugLock')}
            </Button>
          </div>
          <Input
            value={pageSlug}
            onChange={(e) => {
              setPageSlug(e.target.value);
              setSlugLocked(true);
              markDirty();
            }}
            className="font-mono text-sm"
          />
          <p className={`text-xs ${reserved ? 'text-destructive' : 'text-muted-foreground'}`}>
            {reserved ? t('pagesNew.reservedSlugError') : `URL: /about/${pageSlug || '...'}`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t('pagesDetail.fieldStatus')}</Label>
            <Select
              value={status}
              onValueChange={(val) => {
                setStatus(val as PageStatus);
                markDirty();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">{t('pagesDetail.statusDraft')}</SelectItem>
                <SelectItem value="Published">{t('pagesDetail.statusPublished')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('pagesDetail.fieldOrder')}</Label>
            <Input
              type="number"
              value={order}
              onChange={(e) => {
                setOrder(Number(e.target.value) || 0);
                markDirty();
              }}
            />
          </div>
        </div>

        <Tabs defaultValue="en">
          <TabsList className="h-8">
            <TabsTrigger value="en" className="text-xs">
              {t('pagesDetail.tabEnglish')}
            </TabsTrigger>
            <TabsTrigger value="fr" className="text-xs">
              {t('pagesDetail.tabFrench')}
            </TabsTrigger>
          </TabsList>

          {(['en', 'fr'] as const).map((locale) => (
            <TabsContent key={locale} value={locale} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label>{t('pagesDetail.fieldPageTitle')}</Label>
                <Input
                  value={title[locale]}
                  onChange={(e) => {
                    setTitle((prev) => ({ ...prev, [locale]: e.target.value }));
                    markDirty();
                  }}
                  placeholder={t('pagesDetail.titlePlaceholder')}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('pagesDetail.fieldContent')}</Label>
                <RichTextEditor
                  content={content[locale]}
                  onChange={(html) => {
                    setContent((prev) => ({ ...prev, [locale]: html }));
                    markDirty();
                  }}
                  placeholder={t('pagesDetail.contentPlaceholder')}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('pagesDetail.deleteTitle')}
        description={t('pagesDetail.deleteDescription')}
        confirmLabel={t('pagesDetail.deleteConfirm')}
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  );
}
