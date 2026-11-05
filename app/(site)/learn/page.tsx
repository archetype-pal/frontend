import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { LearnStart } from '@/components/learn/learn-start';
import { parsePageParam } from '@/lib/learn';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('learn');
  return { title: t('metaTitle') };
}

/** The palaeography tutor's start page. `?page=<item_image id>` starts on that page at once. */
export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { page } = await searchParams;
  return <LearnStart pageId={parsePageParam(page)} />;
}
