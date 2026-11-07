import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { FormularyExplorer } from '@/components/formulary/formulary-explorer';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('formulary');
  return { title: t('metaTitle') };
}

export default function FormularyPage() {
  return <FormularyExplorer />;
}
