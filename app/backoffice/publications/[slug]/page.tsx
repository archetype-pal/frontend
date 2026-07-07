'use client';

import { use, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Save, Trash2, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import {
  getPublication,
  updatePublication,
  deletePublication,
} from '@/services/backoffice/publications';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { useUnsavedGuard } from '@/hooks/backoffice/use-unsaved-guard';
import { useKeyboardShortcut } from '@/hooks/backoffice/use-keyboard-shortcut';
import { useRecentEntities } from '@/hooks/backoffice/use-recent-entities';
import { useAutosave } from '@/hooks/backoffice/use-autosave';
import { sanitizeHtml } from '@/lib/sanitize-html';

export default function PublicationEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations('backoffice');

  const { data: pub, isLoading } = useQuery({
    queryKey: backofficeKeys.publications.detail(slug),
    queryFn: () => getPublication(token!, slug),
    enabled: !!token,
  });

  const { track } = useRecentEntities();

  const [title, setTitle] = useState('');
  const [pubSlug, setPubSlug] = useState('');
  const [slugLocked, setSlugLocked] = useState(true);
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState('');
  const [status, setStatus] = useState<'Draft' | 'Published'>('Draft');
  const [isBlog, setIsBlog] = useState(false);
  const [isNews, setIsNews] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [keywords, setKeywords] = useState('');
  const [dirty, setDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const generateSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  useEffect(() => {
    if (pub) {
      setTitle(pub.title); // eslint-disable-line react-hooks/set-state-in-effect
      setPubSlug(pub.slug);
      setContent(pub.content);
      setPreview(pub.preview);
      setStatus(pub.status);
      setIsBlog(pub.is_blog_post);
      setIsNews(pub.is_news);
      setIsFeatured(pub.is_featured);
      setAllowComments(pub.allow_comments);
      setKeywords(pub.keywords ?? '');
      setDirty(false);
      track({ label: pub.title, href: `/backoffice/publications/${slug}`, type: 'Publication' });
    }
  }, [pub, slug, track]);

  // Autosave to localStorage every 30s when dirty
  const autosaveData = {
    title,
    pubSlug,
    content,
    preview,
    status,
    isBlog,
    isNews,
    isFeatured,
    allowComments,
    keywords,
  };
  const {
    status: autosaveStatus,
    discard: discardDraft,
    recover,
    getDraftInfo,
  } = useAutosave(`publication:${slug}`, autosaveData, dirty);

  // Check for recovered draft on mount
  const [showRecovery, setShowRecovery] = useState(false);
  useEffect(() => {
    const info = getDraftInfo();
    if (info.exists && pub) {
      setShowRecovery(true); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [pub]); // eslint-disable-line react-hooks/exhaustive-deps

  const recoverDraft = () => {
    const draft = recover();
    if (draft) {
      setTitle(draft.title);
      setPubSlug(draft.pubSlug);
      setContent(draft.content);
      setPreview(draft.preview);
      setStatus(draft.status);
      setIsBlog(draft.isBlog);
      setIsNews(draft.isNews);
      setIsFeatured(draft.isFeatured);
      setAllowComments(draft.allowComments);
      setKeywords(draft.keywords);
      setDirty(true);
    }
    setShowRecovery(false);
  };

  const dismissRecovery = () => {
    discardDraft();
    setShowRecovery(false);
  };

  // Warn before leaving with unsaved changes
  useUnsavedGuard(dirty);

  const saveMut = useMutation({
    mutationFn: () =>
      updatePublication(token!, slug, {
        title,
        slug: pubSlug,
        content,
        preview,
        status,
        is_blog_post: isBlog,
        is_news: isNews,
        is_featured: isFeatured,
        allow_comments: allowComments,
        keywords,
      }),
    onSuccess: (data) => {
      toast.success(t('publicationsDetail.toastSaved'));
      discardDraft();
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.publications.detail(slug),
      });
      queryClient.invalidateQueries({ queryKey: backofficeKeys.publications.all() });
      setDirty(false);
      if (data.slug !== slug) {
        router.replace(`/backoffice/publications/${data.slug}`);
      }
    },
    onError: (err) => {
      toast.error(t('publicationsDetail.toastFailedSave'), {
        description: formatApiError(err),
      });
    },
  });

  // Cmd+S to save
  useKeyboardShortcut(
    'mod+s',
    () => {
      if (dirty && !saveMut.isPending) saveMut.mutate();
    },
    dirty
  );

  const deleteMut = useMutation({
    mutationFn: () => deletePublication(token!, slug),
    onSuccess: () => {
      toast.success(t('publicationsDetail.toastDeleted'));
      queryClient.invalidateQueries({ queryKey: backofficeKeys.publications.all() });
      router.push('/backoffice/publications');
    },
    onError: (err) => {
      toast.error(t('publicationsDetail.toastFailedDelete'), {
        description: formatApiError(err),
      });
    },
  });

  if (isLoading || !pub) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const markDirty = () => setDirty(true);
  const publicationKindPath = isNews ? 'news' : isBlog ? 'blogs' : isFeatured ? 'feature' : 'blogs';

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/backoffice/publications"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-semibold line-clamp-1">{pub.title}</h1>
          <Badge variant={status === 'Published' ? 'default' : 'secondary'}>{status}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            {t('publicationsDetail.deleteButton')}
          </Button>
          <Button size="sm" onClick={() => saveMut.mutate()} disabled={!dirty || saveMut.isPending}>
            {saveMut.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1" />
            )}
            {t('publicationsDetail.saveButton')}
          </Button>
        </div>
      </div>

      {/* Recovery banner */}
      {showRecovery && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-4 py-3">
          <span className="text-sm text-amber-800 dark:text-amber-200 flex-1">
            {t('publicationsDetail.recoveryBanner')}
          </span>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={recoverDraft}>
            {t('publicationsDetail.recoverDraft')}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={dismissRecovery}>
            {t('publicationsDetail.dismissRecovery')}
          </Button>
        </div>
      )}

      {/* Autosave status */}
      {dirty && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {autosaveStatus === 'saving' && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>{t('publicationsDetail.autosaving')}</span>
            </>
          )}
          {autosaveStatus === 'saved' && <span>{t('publicationsDetail.draftAutosaved')}</span>}
          {autosaveStatus === 'idle' && <span>{t('publicationsDetail.unsavedChanges')}</span>}
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t('publicationsDetail.fieldTitle')}</Label>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugLocked) setPubSlug(generateSlug(e.target.value));
              markDirty();
            }}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>{t('publicationsDetail.fieldSlug')}</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                const next = !slugLocked;
                setSlugLocked(next);
                if (!next) setPubSlug(generateSlug(title));
              }}
            >
              {slugLocked
                ? t('publicationsDetail.slugAutoGenerate')
                : t('publicationsDetail.slugLock')}
            </Button>
          </div>
          <Input
            value={pubSlug}
            onChange={(e) => {
              setPubSlug(e.target.value);
              setSlugLocked(true);
              markDirty();
            }}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            URL: /publications/{publicationKindPath}/{pubSlug || '...'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t('publicationsDetail.fieldStatus')}</Label>
            <Select
              value={status}
              onValueChange={(val) => {
                setStatus(val as 'Draft' | 'Published');
                markDirty();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">{t('publicationsDetail.statusDraft')}</SelectItem>
                <SelectItem value="Published">{t('publicationsDetail.statusPublished')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('publicationsDetail.fieldKeywords')}</Label>
            <Input
              value={keywords}
              onChange={(e) => {
                setKeywords(e.target.value);
                markDirty();
              }}
              placeholder={t('publicationsDetail.keywordsPlaceholder')}
            />
          </div>
        </div>

        <div className="flex items-center gap-6 py-2">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={isBlog}
              onCheckedChange={(c) => {
                setIsBlog(c);
                markDirty();
              }}
            />
            {t('publicationsDetail.switchBlogPost')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={isNews}
              onCheckedChange={(c) => {
                setIsNews(c);
                markDirty();
              }}
            />
            {t('publicationsDetail.switchNews')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={isFeatured}
              onCheckedChange={(c) => {
                setIsFeatured(c);
                markDirty();
              }}
            />
            {t('publicationsDetail.switchFeatured')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={allowComments}
              onCheckedChange={(c) => {
                setAllowComments(c);
                markDirty();
              }}
            />
            {t('publicationsDetail.switchAllowComments')}
          </label>
        </div>

        <div className="space-y-1.5">
          <Label>{t('publicationsDetail.fieldContent')}</Label>
          <Tabs defaultValue="editor">
            <TabsList className="h-8">
              <TabsTrigger value="editor" className="text-xs">
                <Save className="h-3 w-3 mr-1" /> {t('publicationsDetail.tabEditor')}
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs">
                <Eye className="h-3 w-3 mr-1" /> {t('publicationsDetail.tabPreview')}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="editor" className="mt-2">
              <RichTextEditor
                content={content}
                onChange={(html) => {
                  setContent(html);
                  markDirty();
                }}
                placeholder={t('publicationsDetail.contentPlaceholder')}
              />
            </TabsContent>
            <TabsContent value="preview" className="mt-2">
              <div
                className="prose prose-sm dark:prose-invert max-w-none rounded-md border px-4 py-3 min-h-[200px]"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-1.5">
          <Label>{t('publicationsDetail.fieldPreviewText')}</Label>
          <RichTextEditor
            content={preview}
            onChange={(html) => {
              setPreview(html);
              markDirty();
            }}
            placeholder={t('publicationsDetail.previewPlaceholder')}
            minimal
          />
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t('publicationsDetail.deleteTitle')}
        description={t('publicationsDetail.deleteDescription')}
        confirmLabel={t('publicationsDetail.deleteConfirm')}
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  );
}
