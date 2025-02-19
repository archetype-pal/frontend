'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Star } from 'lucide-react'
import Image from 'next/image'
import type { Manuscript, ManuscriptImage } from '@/types/manuscript'
import Link from 'next/link'

interface ManuscriptViewerProps {
  manuscript: Manuscript
  images: ManuscriptImage[]
}

export function ManuscriptViewer({
  manuscript,
  images,
}: ManuscriptViewerProps) {
  return (
    <main className='container mx-auto p-4 max-w-6xl'>
      <h1 className='text-3xl font-medium text-gray-800 mb-6'>
        {manuscript.display_label}
      </h1>

      <Tabs defaultValue='information' className='space-y-6'>
        <TabsList className='bg-gray-100 p-1'>
          <TabsTrigger value='information'>Information</TabsTrigger>
          <TabsTrigger value='descriptions'>
            Descriptions ({manuscript.historical_item.descriptions.length})
          </TabsTrigger>
          <TabsTrigger value='manuscript'>Manuscript Images (2)</TabsTrigger>
          {/* <TabsTrigger value='texts'>Texts (2)</TabsTrigger> */}
        </TabsList>

        <TabsContent value='information' className='space-y-6'>
          <section>
            {manuscript.historical_item.descriptions.map((desc, index) => (
              <div key={index} className='prose max-w-none'>
                <h2>
                  Description
                  {desc.source && (
                    <span className='text-gray-500 font-normal'>
                      {' '}
                      (from {desc.source.name})
                    </span>
                  )}
                </h2>
                <p>{desc.content}</p>
              </div>
            ))}
            <h2 className='text-2xl mb-4'>Current location</h2>
            <dl className='grid grid-cols-[200px_1fr] gap-2'>
              <dt className='text-gray-600'>Repository</dt>
              <dd>
                {manuscript.current_item.repository.url ? (
                  <Link
                    href={manuscript.current_item.repository.url}
                    className='text-blue-600 hover:underline'
                  >
                    {manuscript.current_item.repository.name}
                  </Link>
                ) : (
                  manuscript.current_item.repository.name
                )}
              </dd>
              <dt className='text-gray-600'>Town or City</dt>
              <dd>{manuscript.current_item.repository.place}</dd>
              <dt className='text-gray-600'>Shelfmark</dt>
              <dd>{manuscript.current_item.shelfmark}</dd>
            </dl>
          </section>

          <section>
            <h2 className='text-2xl mb-4'>Other information</h2>
            <dl className='grid grid-cols-[200px_1fr] gap-2'>
              <dt className='text-gray-600'>Catalogue Numbers</dt>
              <dd>
                <ul className='list-none space-y-1'>
                  {manuscript.historical_item.catalogue_numbers.map(
                    (cat, index) => (
                      <li key={index}>
                        {cat.url ? (
                          <Link
                            href={cat.url}
                            className='text-blue-600 hover:underline'
                          >
                            {cat.number}
                          </Link>
                        ) : (
                          cat.number
                        )}
                        {cat.catalogue.name && ` (${cat.catalogue.name})`}
                      </li>
                    )
                  )}
                </ul>
              </dd>
              <dt className='text-gray-600'>Format</dt>
              <dd>{manuscript.historical_item.format}</dd>
              <dt className='text-gray-600'>Text Date</dt>
              <dd>{manuscript.historical_item.date}</dd>
            </dl>
          </section>
        </TabsContent>

        <TabsContent value='descriptions'>
          <div className='space-y-8'>
            {manuscript.historical_item.descriptions.map((desc, index) => (
              <div key={index} className='prose max-w-none'>
                <h2>
                  Description
                  {desc.source && (
                    <span className='text-gray-500 font-normal'>
                      {' '}
                      (from {desc.source.name})
                    </span>
                  )}
                </h2>
                <p>{desc.content}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value='manuscript' className='space-y-6'>
          <section className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'>
            {images.map((image, index) => (
              <div
                key={index}
                className='relative bg-white p-4 rounded-lg shadow'
              >
                <div className='relative aspect-square'>
                  <Image
                    src={`${image.iiif_image}/full/550,/0/default.jpg`}
                    alt={'Manuscript image'}
                    fill
                    className='object-contain'
                  />
                  <div className='absolute top-2 right-2'>
                    <Star
                      className='text-yellow-400 fill-yellow-400'
                      size={24}
                    />
                  </div>
                </div>
                <div className='mt-2 text-center'>
                  <span className='text-gray-700'>{image.locus}</span>
                  <div className='text-sm text-gray-500'>
                    {image.number_of_annotations} Annotations
                  </div>
                </div>
              </div>
            ))}
          </section>
        </TabsContent>

        <TabsContent value='texts'>
          <div className='h-48 flex items-center justify-center text-gray-500'>
            Text content would appear here
          </div>
        </TabsContent>
      </Tabs>
    </main>
  )
}
