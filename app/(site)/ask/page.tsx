import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AskArchetype } from '@/components/ask/ask-archetype';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ask');
  return { title: t('metaTitle') };
}

export default function AskPage() {
  return <AskArchetype />;
}
