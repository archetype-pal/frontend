'use client';

/**
 * One lesson of the palaeography tutor (AI programme W4.4), as its link shows it.
 *
 * While the tutor writes it the page asks every few seconds how far it has
 * got, and stops once it is written or has failed, or when the page has been
 * hidden a while (asking again the moment it is shown). Once written, the
 * picture stays in view beside the walkthrough: choosing a step brings its
 * places forward on the picture, and choosing a place chooses its step.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ImageIcon, Link2, RotateCcw, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LearnRefusal } from '@/components/learn/learn-refusal';
import { LessonPicture } from '@/components/learn/lesson-picture';
import { LessonPractice } from '@/components/learn/lesson-practice';
import { LessonQuestions } from '@/components/learn/lesson-questions';
import { LessonWaiting } from '@/components/learn/lesson-waiting';
import { LessonOverview, LessonSteps } from '@/components/learn/lesson-walkthrough';
import { useAuth } from '@/contexts/auth-context';
import { useHiddenTooLong } from '@/hooks/use-hidden-too-long';
import { API_BASE_URL } from '@/lib/api-fetch';
import { copyLink } from '@/lib/copy-link';
import {
  HIDDEN_POLL_LIMIT_MS,
  POLL_MS,
  focusedBoxes,
  hasLesson,
  isWorking,
  learnFailure,
  lessonKey,
  pictureSrc,
  type LessonFocus,
} from '@/lib/learn';
import { getLesson, getPagePart } from '@/services/learn';
import type { TutorSession } from '@/types/learn';

/** Bring an element into view, below whatever is sticky above it (its scroll margin). */
function reveal(id: string) {
  const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  requestAnimationFrame(() =>
    document
      .getElementById(id)
      ?.scrollIntoView({ block: 'nearest', behavior: smooth ? 'smooth' : 'auto' })
  );
}

function CopyLinkButton() {
  const t = useTranslations('learn.lesson');
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() =>
        void copyLink(window.location.href, {
          copied: t('linkCopied'),
          failed: t('linkCopyFailed'),
        })
      }
    >
      <Link2 className="mr-1.5 h-4 w-4" aria-hidden />
      {t('copyLink')}
    </Button>
  );
}

function OpenPageLink({ itemImage }: { itemImage: number }) {
  const t = useTranslations('learn.lesson');
  const part = useQuery({
    queryKey: ['learn-page-part', itemImage],
    queryFn: () => getPagePart(itemImage),
    staleTime: Infinity,
    retry: false,
  });
  if (!part.data) return null;
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={`/manuscripts/${part.data}/images/${itemImage}`}>
        <ImageIcon className="mr-1.5 h-4 w-4" aria-hidden />
        {t('openPage')}
      </Link>
    </Button>
  );
}

function sourceLine(session: TutorSession, uploaded: string): string {
  if (!session.page) return uploaded;
  return [session.page.label, session.page.charter, session.page.date].filter(Boolean).join(' · ');
}

function Lesson({ session, signedIn }: { session: TutorSession; signedIn: boolean }) {
  const t = useTranslations('learn');
  const [focus, setFocus] = useState<LessonFocus | null>(null);
  const [activeBox, setActiveBox] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(true);

  const walkthrough = session.walkthrough;
  const steps = walkthrough.steps ?? [];
  const practice = walkthrough.practice ?? null;
  const boxes = focusedBoxes(session, focus);

  const choose = (next: LessonFocus | null) => {
    setFocus(next);
    setActiveBox(null);
  };
  const selectStep = (index: number | null) =>
    choose(index === null ? null : { kind: 'step', index });
  // From the picture, the step's card may be out of sight: bring it into view.
  const selectStepFromPicture = (index: number) => {
    const clamped = Math.max(0, Math.min(steps.length - 1, index));
    selectStep(clamped);
    reveal(`lesson-step-${clamped}`);
  };
  const togglePractice = () => choose(focus?.kind === 'practice' ? null : { kind: 'practice' });
  const toPractice = () => {
    choose({ kind: 'practice' });
    reveal('lesson-practice');
  };
  const selectMessage = (index: number | null) =>
    choose(index === null ? null : { kind: 'message', index });

  let caption = t('picture.wholePage');
  if (focus?.kind === 'step') {
    caption = [
      t('picture.focusStep', { number: focus.index + 1, count: steps.length }),
      steps[focus.index]?.title,
    ]
      .filter(Boolean)
      .join(' · ');
  } else if (focus?.kind === 'practice') {
    caption = t('picture.focusPractice');
  } else if (focus?.kind === 'message') {
    caption = t('picture.focusAnswer');
  }

  const title = walkthrough.title || t('lesson.untitled');
  const uploaded = t('lesson.uploaded');

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 lg:py-8">
      <header className="space-y-3">
        <Link
          href="/learn"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t('lesson.back')}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{sourceLine(session, uploaded)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {session.item_image !== null && <OpenPageLink itemImage={session.item_image} />}
            <CopyLinkButton />
          </div>
        </div>
        <p className="flex max-w-3xl gap-2 text-xs text-muted-foreground">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          {t('aiNotice')}
        </p>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-8">
        <div className="sticky top-[var(--site-header-h,0px)] z-20 -mx-4 min-w-0 border-b bg-background/95 px-4 py-2 backdrop-blur lg:top-[calc(var(--site-header-h,0px)+1.5rem)] lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <LessonPicture
            src={pictureSrc(session, API_BASE_URL)}
            width={session.width}
            height={session.height}
            alt={session.page?.label ?? uploaded}
            steps={steps}
            focus={focus}
            focusBoxes={boxes}
            activeBox={activeBox}
            zoomed={zoomed}
            onToggleZoom={() => setZoomed((value) => !value)}
            onSelectStep={selectStepFromPicture}
            caption={caption}
          />
        </div>

        <div className="min-w-0 space-y-8">
          <LessonOverview walkthrough={walkthrough} />
          <LessonSteps
            steps={steps}
            glyphs={walkthrough.glyphs}
            openStep={focus?.kind === 'step' ? focus.index : null}
            activeBox={activeBox}
            hasPractice={practice !== null}
            onSelectStep={selectStep}
            onSelectBox={setActiveBox}
            onPractice={toPractice}
          />
          {practice && (
            <LessonPractice
              practice={practice}
              focused={focus?.kind === 'practice'}
              onFocus={togglePractice}
            />
          )}
          <LessonQuestions
            session={session}
            signedIn={signedIn}
            selectedMessage={focus?.kind === 'message' ? focus.index : null}
            activeBox={activeBox}
            onSelectMessage={selectMessage}
            onSelectBox={setActiveBox}
          />
        </div>
      </div>
    </div>
  );
}

function Stopped({ session }: { session: TutorSession }) {
  const t = useTranslations('learn.lesson');
  const refused = session.status === 'refused';
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {refused ? t('refusedTitle') : t('failedTitle')}
      </h1>
      <p className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
        {session.error || t('stoppedFallback')}
      </p>
      <div className="flex flex-wrap gap-2">
        {session.item_image !== null && (
          <Button asChild>
            <Link href={`/learn?page=${session.item_image}`}>
              <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />
              {t('tryPageAgain')}
            </Link>
          </Button>
        )}
        <Button asChild variant={session.item_image !== null ? 'outline' : 'default'}>
          <Link href="/learn">{t('startAnother')}</Link>
        </Button>
      </div>
    </div>
  );
}

function LessonSkeleton() {
  const t = useTranslations('learn.lesson');
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8" aria-busy>
      <p className="sr-only" role="status">
        {t('loading')}
      </p>
      <Skeleton className="h-8 w-2/3 max-w-md" />
      <Skeleton className="mt-3 h-4 w-1/2 max-w-sm" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Skeleton className="aspect-[3/4] w-full max-h-[70vh]" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="mt-6 h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

export function LessonView({ id }: { id: string }) {
  const t = useTranslations('learn.lesson');
  const queryClient = useQueryClient();
  // The lesson answers `can_ask` for whoever asks, so it waits to know who that is.
  const { isAuthenticated: signedIn, isReady } = useAuth();
  const key = lessonKey(id, signedIn);

  const hiddenTooLong = useHiddenTooLong(HIDDEN_POLL_LIMIT_MS, () => {
    const current = queryClient.getQueryData<TutorSession>(key);
    if (current && isWorking(current.status)) void queryClient.invalidateQueries({ queryKey: key });
  });

  const lesson = useQuery({
    queryKey: key,
    queryFn: () => getLesson(id, signedIn),
    enabled: isReady,
    staleTime: 0,
    retry: false,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data && isWorking(data.status) && !hiddenTooLong ? POLL_MS : false;
    },
    // Hidden briefly, it keeps asking; `hiddenTooLong` stops it after a while.
    refetchIntervalInBackground: true,
  });

  const session = lesson.data;
  if (!session) {
    if (!lesson.isError) return <LessonSkeleton />;
    if (learnFailure(lesson.error) === 'notFound') {
      return (
        <div className="container mx-auto max-w-2xl space-y-4 px-4 py-12">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('notFoundTitle')}</h1>
          <p className="text-muted-foreground">{t('notFound')}</p>
          <Button asChild>
            <Link href="/learn">{t('startAnother')}</Link>
          </Button>
        </div>
      );
    }
    return (
      <div className="container mx-auto max-w-2xl space-y-4 px-4 py-12">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('loadError')}</h1>
        <LearnRefusal error={lesson.error} />
        <Button type="button" variant="outline" onClick={() => void lesson.refetch()}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  if (session.status === 'failed' || session.status === 'refused') {
    return (
      <div className="container mx-auto px-4 py-12">
        <Stopped session={session} />
      </div>
    );
  }
  if (!hasLesson(session)) {
    // Written but empty would be the tutor's failure; say so rather than wait for ever.
    if (!isWorking(session.status)) {
      return (
        <div className="container mx-auto px-4 py-12">
          <Stopped session={{ ...session, status: 'failed' }} />
        </div>
      );
    }
    return (
      <div className="container mx-auto px-4 py-10">
        <LessonWaiting
          session={session}
          pictureUrl={pictureSrc(session, API_BASE_URL)}
          paused={hiddenTooLong}
          pollFailed={lesson.isError}
          actions={<CopyLinkButton />}
        />
      </div>
    );
  }
  return <Lesson session={session} signedIn={signedIn} />;
}
