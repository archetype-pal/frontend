import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { NetworkExplorer } from '@/components/network/network-explorer';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('network');
  return { title: t('metaTitle') };
}

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ node?: string | string[] }>;
}) {
  const { node } = await searchParams;
  return <NetworkExplorer initialNode={typeof node === 'string' ? node : null} />;
}
