'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import type { Manuscript, ManuscriptImage } from '@/types/manuscript';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getIiifImageUrl } from '@/utils/iiif';
import { useModelLabels } from '@/contexts/model-labels-context';
import { BackofficeLink } from '@/components/common/backoffice-link';

const TAB_VALUES = ['information', 'descriptions', 'images', 'texts'] as const;
const DEFAULT_TAB = 'information';

interface ManuscriptViewerProps {
  manuscript: Manuscript;
  images: ManuscriptImage[];
}

function toIiifProxyUrl(url: string): string {
  try {
    const u = new URL(url);
    return `/iiif-proxy${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}

export function ManuscriptViewer({ manuscript, images }: ManuscriptViewerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getLabel, getPluralLabel } = useModelLabels();

  const tabFromUrl = searchParams.get('tab');
  const activeTab =
    tabFromUrl && TAB_VALUES.includes(tabFromUrl as (typeof TAB_VALUES)[number])
      ? tabFromUrl
      : DEFAULT_TAB;

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === DEFAULT_TAB) {
      params.delete('tab');
    } else {
      params.set('tab', value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <main className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">{manuscript.display_label}</h1>
        <BackofficeLink kind="item-part" id={manuscript.id} />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-secondary p-1">
          <TabsTrigger value="information">Information</TabsTrigger>
          <TabsTrigger value="descriptions">
            Descriptions ({manuscript.historical_item.descriptions.length})
          </TabsTrigger>
          <TabsTrigger value="images">Images ({images.length})</TabsTrigger>
          {/* <TabsTrigger value='texts'>Texts (2)</TabsTrigger> */}
        </TabsList>

        <TabsContent value="information" className="space-y-6">
          <section>
            {manuscript.historical_item.descriptions.map((desc, index) => (
              <div key={index} className="prose max-w-none">
                <h2 className="text-2xl font-serif font-bold tracking-tight mb-4 ">
                  Description
                  {desc.source && (
                    <span className="text-muted-foreground font-normal"> (from {desc.source.name})</span>
                  )}
                </h2>
                <p>{desc.content}</p>
              </div>
            ))}
            <h2 className="text-2xl font-serif font-bold tracking-tight mb-4">Current location</h2>
            <dl className="grid grid-cols-[200px_1fr] gap-2">
              <dt className="text-muted-foreground">Repository</dt>
              <dd>
                {manuscript.current_item.repository.url ? (
                  <Link
                    href={manuscript.current_item.repository.url}
                    className="text-primary hover:underline"
                  >
                    {manuscript.current_item.repository.name}
                  </Link>
                ) : (
                  manuscript.current_item.repository.name
                )}
              </dd>
              <dt className="text-muted-foreground">Town or City</dt>
              <dd>{manuscript.current_item.repository.place}</dd>
              <dt className="text-muted-foreground">{getLabel('fieldShelfmark')}</dt>
              <dd>{manuscript.current_item.shelfmark}</dd>
            </dl>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-bold tracking-tight mb-4">Other information</h2>
            <dl className="grid grid-cols-[200px_1fr] gap-2">
              <dt className="text-muted-foreground">{getPluralLabel('catalogueNumber')}</dt>
              <dd>
                <ul className="list-none space-y-1">
                  {manuscript.historical_item.catalogue_numbers.map((cat, index) => (
                    <li key={index}>
                      {cat.url ? (
                        <Link href={cat.url} className="text-primary hover:underline">
                          {cat.number}
                        </Link>
                      ) : (
                        cat.number
                      )}
                      {cat.catalogue.name && ` (${cat.catalogue.name})`}
                    </li>
                  ))}
                </ul>
              </dd>
              <dt className="text-muted-foreground">Format</dt>
              <dd>{manuscript.historical_item.format}</dd>
              <dt className="text-muted-foreground">Text Date</dt>
              <dd>{manuscript.historical_item.date_display ?? '-'}</dd>
            </dl>
          </section>
        </TabsContent>

        <TabsContent value="descriptions">
          <div className="space-y-8">
            {manuscript.historical_item.descriptions.map((desc, index) => (
              <div key={index} className="prose max-w-none">
                <h2 className="text-2xl font-serif font-bold tracking-tight mb-4">
                  Description
                  {desc.source && (
                    <span className="text-muted-foreground font-normal"> (from {desc.source.name})</span>
                  )}
                </h2>
                <p>{desc.content}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="images" className="space-y-6">
          <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {images?.map((image) => (
              <div key={image.id} className="relative bg-card p-4 rounded-lg shadow">
                <div className="relative aspect-square">
                  <Link
                    href={`/manuscripts/${manuscript.id}/images/${image.id}`}
                    className="text-primary hover:underline"
                  >
                    <Image
                      src={
                        image.iiif_image
                          ? toIiifProxyUrl(getIiifImageUrl(image.iiif_image, { thumbnail: true }))
                          : '/placeholder.svg'
                      }
                      alt={image.locus || 'Manuscript image'}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </Link>
                </div>
                <div className="mt-2 text-center">
                  <span className="text-foreground">{image.locus}</span>
                  <div className="text-sm text-muted-foreground">
                    {image.number_of_annotations} Annotations
                  </div>
                </div>
              </div>
            ))}
          </section>
        </TabsContent>

        <TabsContent value="texts">
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            Text content would appear here
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
