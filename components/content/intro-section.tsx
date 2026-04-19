'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CarouselItem } from '@/types/backoffice';
import { fetchCarouselItems, getCarouselImageUrl } from '@/utils/api';

export default function Component() {
  const [currentImage, setCurrentImage] = useState(0);
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
  const hasLoadedRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In React Strict Mode (dev), effects can run twice.
    // Guard to avoid duplicate API requests that can trigger backend throttling.
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    async function loadCarouselItems() {
      try {
        const items = await fetchCarouselItems();
        setCarouselItems(items);
      } catch (err) {
        setError(`Failed to load carousel items  ${err}`);
      } finally {
        setIsLoading(false);
      }
    }

    loadCarouselItems();
  }, []);

  const nextImage = () => {
    if (carouselItems.length === 0) return;
    setCurrentImage((prev) => (prev + 1) % carouselItems.length);
  };

  const prevImage = () => {
    if (carouselItems.length === 0) return;
    setCurrentImage((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);
  };

  // Loading state
  if (isLoading) {
    return (
      <section className="relative w-full">
        <div className="relative h-[500px] md:h-[600px] bg-secondary animate-pulse" />
      </section>
    );
  }

  // Error or no items state
  if (error || carouselItems.length === 0) {
    return (
      <section className="relative w-full bg-primary">
        <div className="container mx-auto px-6 md:px-8 py-20">
          <div className="max-w-xl space-y-5">
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-primary-foreground tracking-tight leading-tight">
              Scottish Charters and the Emergence of Government
            </h2>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              A resource for the study of the contents, script and physical appearance of the
              corpus of Scottish charters which survives from 1100–1250.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                asChild
              >
                <Link href="/about/about-models-of-authority">About the project</Link>
              </Button>
              <Button
                size="lg"
                asChild
                className="border-2 border-primary-foreground bg-transparent text-primary-foreground hover:bg-primary-foreground/10 font-semibold"
              >
                <Link href="/search/manuscripts">Search charters</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Main content with carousel
  return (
    <section className="relative w-full overflow-hidden">
      {/* Hero with full-width carousel */}
      <div className="relative h-[500px] md:h-[600px]">
        {carouselItems[currentImage] && (
          <Image
            src={getCarouselImageUrl(carouselItems[currentImage].image)}
            alt={carouselItems[currentImage].title}
            fill
            className="object-cover"
            sizes="100vw"
            priority
            unoptimized
          />
        )}
        {/* Gradient overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/20"
          aria-hidden
        />

        {/* Hero text overlay */}
        <div className="absolute inset-0 flex items-center">
          <div className="container mx-auto px-6 md:px-8">
            <div className="max-w-xl space-y-5">
              <h2 className="text-3xl md:text-5xl font-serif font-bold text-white tracking-tight leading-tight">
                Scottish Charters and the Emergence of Government
              </h2>
              <p className="text-base md:text-lg text-white/85 leading-relaxed">
                A resource for the study of the contents, script and physical appearance of the
                corpus of Scottish charters which survives from 1100–1250.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-lg"
                  asChild
                >
                  <Link href="/about/about-models-of-authority/">About the project</Link>
                </Button>
                <Button
                  size="lg"
                  asChild
                  className="border-2 border-white bg-transparent text-white hover:bg-white/20 shadow-lg font-semibold"
                >
                  <Link href="/search/manuscripts">Search charters</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {carouselItems.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImage(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === currentImage ? 'w-8 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1/2 left-4 -translate-y-1/2 text-white/80 hover:text-white hover:bg-white/10 h-10 w-10"
          onClick={prevImage}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1/2 right-4 -translate-y-1/2 text-white/80 hover:text-white hover:bg-white/10 h-10 w-10"
          onClick={nextImage}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
    </section>
  );
}
