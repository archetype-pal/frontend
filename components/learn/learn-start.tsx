'use client';

/**
 * The palaeography tutor's start page (AI programme W4.4): choose a corpus
 * page or bring a picture of your own, and the tutor writes a walkthrough of
 * its hand. Starting answers at once with the session, and the lesson's own
 * page waits for the tutor. `?page=<id>` starts on that corpus page directly.
 */

import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { GraduationCap, Languages, Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { LearnPages } from '@/components/learn/learn-pages';
import { LearnRefusal } from '@/components/learn/learn-refusal';
import { PictureUpload } from '@/components/learn/picture-upload';
import { useAuth } from '@/contexts/auth-context';
import {
  LEARN_PAGES_KEY,
  learnStatusKey,
  lessonKey,
  lessonLanguage,
  type LessonLanguage,
} from '@/lib/learn';
import { getLearnPages, getLearnStatus, startLesson, type LessonSource } from '@/services/learn';
import type { LearnPage } from '@/types/learn';

export function LearnStart({ pageId = null }: { pageId?: number | null }) {
  const t = useTranslations('learn');
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated: signedIn, isReady } = useAuth();

  // Who may upload depends on who is asking, so it waits until that is known.
  const status = useQuery({
    queryKey: learnStatusKey(signedIn),
    queryFn: () => getLearnStatus(signedIn),
    enabled: isReady,
    staleTime: 60_000,
    retry: false,
  });
  const pages = useQuery({
    queryKey: LEARN_PAGES_KEY,
    queryFn: getLearnPages,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const language: LessonLanguage = lessonLanguage(locale, status.data?.languages);
  const start = useMutation({
    mutationFn: (source: LessonSource) => startLesson(source, language, signedIn),
    // The lesson's page shows the session it was handed at once, then polls it.
    onSuccess: (session) => queryClient.setQueryData(lessonKey(session.id, signedIn), session),
  });
  const { mutate } = start;

  const switchedOff = status.data?.enabled === false;
  // A failed status read does not stop a start: the start itself says why it cannot.
  const mayStart = isReady && (status.isSuccess ? status.data.enabled : status.isError);

  // `?page=` starts once, and replaces itself in the history, so Back does not start another.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (pageId === null || autoStarted.current || !mayStart) return;
    autoStarted.current = true;
    mutate(
      { itemImage: pageId },
      { onSuccess: (session) => router.replace(`/learn/${session.id}`) }
    );
  }, [pageId, mayStart, mutate, router]);

  const startPage = (page: LearnPage) =>
    mutate({ itemImage: page.id }, { onSuccess: (session) => router.push(`/learn/${session.id}`) });
  const startPicture = (picture: File) =>
    mutate({ picture }, { onSuccess: (session) => router.push(`/learn/${session.id}`) });

  const pending = start.isPending || start.isSuccess;
  const source = start.variables;
  const startingPage = source && 'itemImage' in source ? source.itemImage : null;
  const startingPicture = Boolean(source && 'picture' in source);
  const fromParam = pageId !== null && startingPage === pageId;
  const paramPage = pages.data?.find((page) => page.id === pageId);
  // From `?page=` until the lesson opens, unless the student has since chosen something else.
  const paramState =
    pageId === null || (source && !fromParam) ? null : start.isError ? 'error' : 'starting';

  const pageError = start.isError && startingPage !== null && !fromParam ? start.error : null;
  const pictureError = start.isError && startingPicture ? start.error : null;
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (pageError) errorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [pageError]);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <header className="flex items-start gap-3">
        <GraduationCap className="mt-1 h-7 w-7 shrink-0 text-primary" aria-hidden />
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('intro')}</p>
        </div>
      </header>

      <p className="mt-6 flex max-w-3xl gap-2 rounded-md border bg-muted/40 px-4 py-3 text-sm">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        {t('aiNotice')}
      </p>

      {switchedOff ? (
        <div className="mt-6 max-w-3xl rounded-lg border px-5 py-4">
          <h2 className="font-semibold">{t('offTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('off')}</p>
        </div>
      ) : (
        <>
          {paramState && pageId !== null && (
            <div className="mt-6 max-w-3xl space-y-3" role="status" aria-live="polite">
              {paramState === 'starting' ? (
                <p className="flex items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
                  {paramPage
                    ? t('startingPage', { label: paramPage.label })
                    : t('startingPageUnnamed', { id: pageId })}
                </p>
              ) : (
                <>
                  <LearnRefusal error={start.error} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      mutate(
                        { itemImage: pageId },
                        { onSuccess: (session) => router.replace(`/learn/${session.id}`) }
                      )
                    }
                  >
                    {t('lesson.retry')}
                  </Button>
                </>
              )}
            </div>
          )}

          <p className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
            <Languages className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              {t('language', { language: t(`languages.${language}`) })} {t('languageHint')}
            </span>
          </p>

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <section aria-labelledby="learn-pages-title" className="min-w-0">
              <h2 id="learn-pages-title" className="text-lg font-semibold">
                {t('pages.title')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('pages.intro')}</p>
              <div ref={errorRef} className="scroll-mt-32">
                {pageError && <LearnRefusal error={pageError} className="mt-4" />}
              </div>
              <div className="mt-4">
                <LearnPages
                  pages={pages.data}
                  isLoading={pages.isPending}
                  isError={pages.isError}
                  startingId={pending ? startingPage : null}
                  disabled={pending || !isReady}
                  onStart={startPage}
                />
              </div>
            </section>

            <section
              aria-labelledby="learn-own-title"
              className="rounded-lg border bg-card p-5 shadow-sm lg:sticky lg:top-[calc(var(--site-header-h,0px)+1.5rem)]"
            >
              <h2 id="learn-own-title" className="text-lg font-semibold">
                {t('upload.title')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('upload.intro')}</p>
              <div className="mt-4">
                {status.data ? (
                  <PictureUpload
                    status={status.data}
                    starting={pending && startingPicture}
                    disabled={pending}
                    error={pictureError}
                    onStart={startPicture}
                  />
                ) : status.isError ? (
                  <p className="text-sm text-muted-foreground">{t('statusError')}</p>
                ) : (
                  <Loader2
                    className="h-5 w-5 animate-spin text-muted-foreground"
                    aria-label={t('loading')}
                  />
                )}
              </div>
            </section>
          </div>

          {status.data && (
            <p className="mt-8 text-xs text-muted-foreground">
              {t('limits', {
                daily: status.data.daily_sessions,
                questions: status.data.questions_per_session,
              })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
