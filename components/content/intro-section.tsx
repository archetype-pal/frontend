'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CarouselItem } from '@/types/backoffice'
import { fetchCarouselItems, getCarouselImageUrl } from '@/utils/api'

export default function Component() {
  const [currentImage, setCurrentImage] = useState(0)
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCarouselItems() {
      try {
        const items = await fetchCarouselItems()
        setCarouselItems(items)
      } catch (err) {
        setError(`Failed to load carousel items  ${err}`)
      } finally {
        setIsLoading(false)
      }
    }

    loadCarouselItems()
  }, [])

  const nextImage = () => {
    if (carouselItems.length === 0) return
    setCurrentImage((prev) => (prev + 1) % carouselItems.length)
  }

  const prevImage = () => {
    if (carouselItems.length === 0) return
    setCurrentImage(
      (prev) => (prev - 1 + carouselItems.length) % carouselItems.length
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
          <Card className='relative overflow-hidden animate-pulse'>
            <CardContent className='p-0'>
              <div className='relative h-[400px] bg-gray-200' />
            </CardContent>
          </Card>
          <div className='space-y-4'>
            <div className='h-8 bg-gray-200 rounded w-3/4' />
            <div className='h-20 bg-gray-200 rounded' />
            <div className='h-20 bg-gray-200 rounded' />
          </div>
        </div>
      </div>
    )
  }

  // Error or no items state
  if (error || carouselItems.length === 0) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
          <Card className='relative overflow-hidden'>
            <CardContent className='p-0'>
              <div className='relative h-[400px] flex items-center justify-center bg-gray-100'>
                <p className='text-gray-500'>No carousel images available</p>
              </div>
            </CardContent>
          </Card>
          <div className='space-y-4'>
            <h2 className='text-2xl font-bold'>
              Models of Authority: Scottish Charters and the Emergence of
              Government
            </h2>
            <p className='text-gray-600'>
              Models of Authority is a resource for the study of the contents,
              script and physical appearance of the corpus of Scottish charters
              which survives from 1100–1250.
            </p>
            <p className='text-gray-600'>
              The project is funded by the AHRC (2014-2017) and is a
              collaboration between scholars from the Universities of Glasgow,
              Cambridge and King&apos;s College London.
            </p>
            <div className='flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 '>
              <Button
                className='w-full sm:w-auto'
                asChild
              >
                <Link href='/about/about-models-of-authority'>
                  Read more about the project
                </Link>
              </Button>
              <Button className='w-full sm:w-auto' asChild variant='outline'>
                <Link href='/search'>Start searching</Link>
              </Button>
              <Button className='w-full sm:w-auto' asChild variant='outline'>
                <Link href='/images'>Browse images</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main content with carousel
  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        <Card className='relative overflow-hidden'>
          <CardContent className='p-0'>
            <div className='relative h-[400px]'>
              {carouselItems[currentImage] && (
                <>
                  <Image
                    src={getCarouselImageUrl(carouselItems[currentImage].image)}
                    alt={carouselItems[currentImage].title}
                    fill
                    className='object-cover'
                    sizes='(max-width: 768px) 100vw, 50vw'
                    priority
                  />
                  <div className='absolute inset-0 bg-black/50' aria-hidden />
                </>
              )}
              <div className='absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2'>
                {carouselItems.map((_, index) => (
                  <span
                    key={index}
                    className={`h-2 w-2 rounded-full ${
                      index === currentImage ? 'bg-white' : 'bg-gray-400'
                    }`}
                  />
                ))}
              </div>
              <Button
                variant='ghost'
                size='icon'
                className='absolute top-1/2 left-2 transform -translate-y-1/2 text-white'
                onClick={prevImage}
              >
                <ChevronLeft className='h-6 w-6' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                className='absolute top-1/2 right-2 transform -translate-y-1/2 text-white'
                onClick={nextImage}
              >
                <ChevronRight className='h-6 w-6' />
              </Button>
            </div>
          </CardContent>

          {carouselItems[currentImage] && carouselItems[currentImage].url && (
            <Link
              href={carouselItems[currentImage].url}
              className='absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2 text-center'
            >
              {carouselItems[currentImage].title}
            </Link>
          )}
        </Card>
        <div className='space-y-4'>
          <h2 className='text-2xl font-bold'>
            Models of Authority: Scottish Charters and the Emergence of
            Government
          </h2>
          <p className='text-gray-600'>
            Models of Authority is a resource for the study of the contents,
            script and physical appearance of the corpus of Scottish charters
            which survives from 1100–1250. Through close examination of the
            diplomatic and palaeographic features of the charters, the project
            will explore the evidence for developments in the perception of
            royal government during a crucial period in Scottish history.
          </p>
          <p className='text-gray-600'>
            The project is funded by the AHRC (2014-2017) and is a collaboration
            between scholars from the Universities of Glasgow, Cambridge and
            King&apos;s College London.
          </p>
          <div className='flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 '>
            <Button
              className='w-full sm:w-auto'
              asChild
            >
              <Link href='/about/about-models-of-authority/'>
                Read more about the project
              </Link>
            </Button>
            <Button className='w-full sm:w-auto' asChild variant='outline'>
              <Link href='/search'>Start searching</Link>
            </Button>
            <Button className='w-full sm:w-auto' asChild variant='outline'>
              <Link href='/images'>Browse images</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
