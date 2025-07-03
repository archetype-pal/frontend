'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ManuscriptImage } from '@/types/manuscript' // Adjust to your types

export function SearchGrid({
  results = [],
  resultType,
}: {
  results: ManuscriptImage[]
  resultType: string
}) {
  if (!results?.length) {
    return (
      <div className="text-center text-gray-500 py-10">
        No results to display.
      </div>
    )
  }

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {results.map((item) => {
        const imageUrl =
          item?.thumbnail ||
          item?.iiif_image?.replace('/info.json', '/full/300,/0/default.jpg') ||
          null

        return (
          <div
            key={item.id}
            className="relative bg-white border rounded-lg shadow p-4 flex flex-col"
          >
            <div className="relative aspect-[4/3] mb-2">
              {imageUrl ? (
                <Link href={`/${resultType}/${item.id}`}>
                  <Image
                    src={imageUrl}
                    alt={item.text || item.locus || 'Item image'}
                    fill
                    className="object-contain rounded"
                  />
                </Link>
              ) : (
                <div className="bg-gray-100 w-full h-full flex items-center justify-center text-sm text-gray-400 border rounded">
                  No Image
                </div>
              )}
            </div>

            <div className="text-center space-y-1">
              <div className="font-medium text-gray-800 truncate">
                {item.text || item.locus || 'Untitled'}
              </div>
              {item.number_of_annotations != null && (
                <div className="text-sm text-gray-500">
                  {item.number_of_annotations} Annotations
                </div>
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}
