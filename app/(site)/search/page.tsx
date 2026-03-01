import { redirect } from 'next/navigation';
import { readSiteFeatures } from '@/lib/site-features-server';
import type { ResultType } from '@/lib/search-types';

export default async function SearchIndexPage() {
  const config = await readSiteFeatures();
  const firstEnabled =
    (Object.entries(config.searchCategories) as [ResultType, { enabled: boolean }][]).find(
      ([, c]) => c.enabled
    )?.[0] ?? 'manuscripts';
  redirect(`/search/${firstEnabled}`);
}
