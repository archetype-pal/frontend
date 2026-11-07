import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { SimilarGlyphs } from '@/components/search/similar-glyphs';
import { readSiteFeatures } from '@/lib/site-features-server';
import { getEnabledSearchCategories } from '@/lib/site-features';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('similarGlyphs');
  return { title: t('metaTitle') };
}

/** "Letters like this" for one glyph. Only glyphs have vectors, so only `graphs` has the page. */
export default async function SimilarGlyphsPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;
  const graphId = Number(id);
  if (type !== 'graphs' || !/^\d+$/.test(id) || graphId <= 0) notFound();
  if (!getEnabledSearchCategories(await readSiteFeatures()).includes('graphs')) notFound();
  return <SimilarGlyphs graphId={graphId} />;
}
