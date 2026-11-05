import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { LessonView } from '@/components/learn/lesson-view';
import { isLessonId } from '@/lib/learn';

// A lesson is anyone's who has its link, and may show a student's own
// picture: it is shared by hand, never listed by a search engine.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('learn');
  return { title: t('lessonMetaTitle'), robots: { index: false, follow: false } };
}

/** One lesson, shareable by its link. */
export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isLessonId(id)) notFound();
  return <LessonView id={id.toLowerCase()} />;
}
