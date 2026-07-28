'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPage } from '@/services/backoffice/pages';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { isReservedPageSlug } from '@/lib/pages';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export default function NewPagePage() {
  const { token } = useAuth();
  const router = useRouter();
  const t = useTranslations('backoffice');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugLocked, setSlugLocked] = useState(false);

  const generateSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugLocked) {
      setSlug(generateSlug(value));
    }
  };

  const resolvedSlug = slug || generateSlug(title);
  const reserved = isReservedPageSlug(resolvedSlug);

  const createMut = useMutation({
    mutationFn: () =>
      createPage(token!, {
        slug: resolvedSlug,
        title: { en: title, fr: '' },
        content: { en: '', fr: '' },
        status: 'Draft',
        order: 0,
      }),
    onSuccess: (data) => {
      toast.success(t('pagesNew.toastCreated'));
      router.push(`/backoffice/pages/${data.slug}`);
    },
    onError: (err) => {
      toast.error(t('pagesNew.toastFailedCreate'), { description: formatApiError(err) });
    },
  });

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/backoffice/pages" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold">{t('pagesNew.pageTitle')}</h1>
      </div>

      <div className="space-y-4 rounded-lg border p-6">
        <div className="space-y-1.5">
          <Label>{t('pagesNew.fieldTitle')}</Label>
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder={t('pagesNew.titlePlaceholder')}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>{t('pagesNew.fieldSlug')}</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                const next = !slugLocked;
                setSlugLocked(next);
                if (!next) setSlug(generateSlug(title));
              }}
            >
              {slugLocked ? t('pagesNew.slugUnlock') : t('pagesNew.slugLock')}
            </Button>
          </div>
          <Input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugLocked(true);
            }}
            placeholder={t('pagesNew.slugPlaceholder')}
            className="font-mono text-sm"
          />
          {resolvedSlug && (
            <p className={`text-xs ${reserved ? 'text-destructive' : 'text-muted-foreground'}`}>
              {reserved
                ? t('pagesNew.reservedSlugError')
                : t('pagesNew.slugUrlPreview', { slug: resolvedSlug })}
            </p>
          )}
        </div>

        <Button
          onClick={() => createMut.mutate()}
          disabled={!title.trim() || reserved || createMut.isPending}
          className="w-full"
        >
          {createMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {t('pagesNew.createButton')}
        </Button>
      </div>
    </div>
  );
}
