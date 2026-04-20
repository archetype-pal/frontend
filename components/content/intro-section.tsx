'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, ChevronDown, Search, BookOpen } from 'lucide-react';
import type { CarouselItem } from '@/types/backoffice';
import { fetchCarouselItems, getCarouselImageUrl } from '@/utils/api';

export default function IntroSection() {
  const [currentImage, setCurrentImage] = useState(0);
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
  const hasLoadedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    async function loadCarouselItems() {
      try {
        const items = await fetchCarouselItems();
        setCarouselItems(items);
      } catch (err) {
        setError(`Failed to load carousel items ${err}`);
      } finally {
        setIsLoading(false);
      }
    }

    loadCarouselItems();
  }, []);

  const startAutoplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentImage((prev) => (carouselItems.length > 0 ? (prev + 1) % carouselItems.length : 0));
    }, 6000);
  }, [carouselItems.length]);

  useEffect(() => {
    if (carouselItems.length > 1) {
      startAutoplay();
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [carouselItems.length, startAutoplay]);

  const goToSlide = (index: number) => {
    setCurrentImage(index);
    startAutoplay();
  };

  const nextSlide = () => {
    if (carouselItems.length === 0) return;
    goToSlide((currentImage + 1) % carouselItems.length);
  };

  const prevSlide = () => {
    if (carouselItems.length === 0) return;
    goToSlide((currentImage - 1 + carouselItems.length) % carouselItems.length);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div>
        <div className="relative w-full min-h-[420px] bg-primary animate-pulse" />
      </div>
    );
  }

  const hasImages = !error && carouselItems.length > 0;
  const currentItem = hasImages ? carouselItems[currentImage] : null;

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative w-full overflow-hidden bg-primary">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
          {/* Left: text content — spans 5 of 12 cols */}
          <div className="relative z-10 flex items-center py-14 lg:py-20 lg:col-span-5">
            <div className="container mx-auto px-6 md:px-8 lg:pr-0">
              <div className="max-w-xl lg:max-w-lg">
                {/* Eyebrow */}
                <p className="animate-fade-up text-xs uppercase tracking-[0.3em] text-primary-foreground/45 mb-5 font-medium">
                  1100–1250 &nbsp;·&nbsp; Scotland
                </p>

                {/* Headline */}
                <h1
                  className="animate-fade-up delay-100 text-4xl sm:text-5xl lg:text-6xl leading-[0.9] tracking-tight text-white mb-6"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  <span className="font-light">Models of</span>
                  <br />
                  <span className="font-semibold italic">Authority</span>
                </h1>

                {/* Ornamental line */}
                <div className="animate-draw-line delay-200 w-16 h-px bg-gradient-to-r from-accent to-transparent mb-6" />

                {/* Subtitle */}
                <p className="animate-fade-up delay-200 text-base text-white/70 leading-relaxed max-w-md font-serif">
                  Scottish Charters and the Emergence of Government — a resource for the study of
                  the contents, script and physical appearance of the surviving charter corpus.
                </p>

                {/* CTAs */}
                <div className="animate-fade-up delay-400 flex flex-col sm:flex-row gap-3 mt-8">
                  <Button
                    size="lg"
                    className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-7 h-11 shadow-lg shadow-accent/20"
                    asChild
                  >
                    <Link href="/search/manuscripts">
                      <Search className="h-4 w-4 mr-2" />
                      Search the Collection
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    asChild
                    className="border border-white/25 bg-white/5 text-white hover:bg-white/15 backdrop-blur-sm font-medium px-7 h-11"
                  >
                    <Link href="/about/about-models-of-authority">
                      <BookOpen className="h-4 w-4 mr-2" />
                      About the Project
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: carousel — spans 7 of 12 cols */}
          <div className="relative hidden lg:block lg:col-span-7 group/carousel">
            {/* Gradient blend from primary into image */}
            <div
              className="absolute inset-0 z-10 pointer-events-none"
              style={{
                background: 'linear-gradient(105deg, var(--primary) 2%, transparent 30%)',
              }}
            />

            {/* Carousel images */}
            {hasImages ? (
              <div className="absolute inset-0">
                {carouselItems.map((item, i) => {
                  const slide = (
                    <Image
                      src={getCarouselImageUrl(item.image)}
                      alt={item.title}
                      fill
                      className="object-cover animate-ken-burns"
                      sizes="60vw"
                      priority={i === 0}
                      unoptimized
                    />
                  );
                  return (
                    <div
                      key={item.id ?? i}
                      className={`absolute inset-0 transition-opacity duration-[1.2s] ease-in-out ${
                        i === currentImage ? 'opacity-100 z-[1]' : 'opacity-0'
                      }`}
                    >
                      {item.url ? (
                        <Link href={item.url} className="block absolute inset-0">
                          {slide}
                        </Link>
                      ) : (
                        slide
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="absolute inset-0 bg-primary/60" />
            )}

            {/* Subtle vignette over image */}
            <div
              className="absolute inset-0 z-10 pointer-events-none"
              style={{
                background:
                  'linear-gradient(to top, hsla(201,90%,10%,0.55) 0%, transparent 40%), linear-gradient(to bottom, hsla(201,90%,10%,0.15) 0%, transparent 20%)',
              }}
            />

            {/* Prev / Next arrows — appear on hover */}
            {hasImages && carouselItems.length > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-black/30 backdrop-blur-sm text-white/70 hover:bg-black/50 hover:text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-black/30 backdrop-blur-sm text-white/70 hover:bg-black/50 hover:text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-300"
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Caption + dot indicators at bottom */}
            {hasImages && (
              <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-4 pt-10">
                {/* Caption */}
                <div
                  key={currentImage}
                  className="mb-3"
                  style={{ animation: 'fade-in 0.5s ease both' }}
                >
                  {currentItem?.url ? (
                    <Link
                      href={currentItem.url}
                      className="text-white text-lg font-semibold hover:text-accent transition-colors truncate block"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {currentItem.title}
                    </Link>
                  ) : (
                    <p
                      className="text-white text-lg font-semibold truncate"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {currentItem?.title}
                    </p>
                  )}
                </div>

                {/* Dot indicators + counter */}
                {carouselItems.length > 1 && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      {carouselItems.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => goToSlide(index)}
                          className={`rounded-full transition-all duration-500 ${
                            index === currentImage
                              ? 'w-6 h-1.5 bg-accent'
                              : 'w-1.5 h-1.5 bg-white/35 hover:bg-white/60'
                          }`}
                          aria-label={`Go to slide ${index + 1}`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-white/40 tabular-nums">
                      {currentImage + 1}/{carouselItems.length}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile-only: background image behind text */}
          {hasImages && currentItem && (
            <div className="absolute inset-0 lg:hidden">
              <Image
                src={getCarouselImageUrl(currentItem.image)}
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
                priority
                unoptimized
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(135deg, hsla(201,90%,12%,0.94) 0%, hsla(201,90%,15%,0.85) 100%)',
                }}
              />
            </div>
          )}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 animate-fade-in delay-700">
          <button
            onClick={() =>
              document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="flex flex-col items-center gap-1 text-white/40 hover:text-white/70 transition-colors"
            aria-label="Scroll to explore"
          >
            <span className="text-[10px] uppercase tracking-[0.25em]">Explore</span>
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </button>
        </div>
      </section>

      {/* ── Explore strip ─────────────────────────────────────────────── */}
      <section id="explore" className="py-14 md:py-16">
        <div className="container mx-auto px-6 md:px-8">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-8 text-center">
            Discover the Collection
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(
              [
                {
                  title: 'Charter Manuscripts',
                  desc: 'Browse and search the corpus of surviving Scottish charters from the twelfth and thirteenth centuries.',
                  href: '/search/manuscripts',
                  delay: 'delay-100',
                  accent: 'hsl(201 90% 27%)',
                },
                {
                  title: 'Scribal Hands',
                  desc: 'Explore the handwriting of the scribes who wrote these charters and trace connections between documents.',
                  href: '/search/hands',
                  delay: 'delay-200',
                  accent: 'hsl(38 92% 50%)',
                },
                {
                  title: 'Historical Context',
                  desc: 'Understand how charters shaped the emergence of government in medieval Scotland.',
                  href: '/about/historical-context',
                  delay: 'delay-300',
                  accent: 'hsl(25 15% 15%)',
                },
              ] as const
            ).map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className={`animate-fade-up ${card.delay} group relative bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}
              >
                <span className="block h-1" style={{ background: card.accent }} />
                <div className="p-6">
                  <h3
                    className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {card.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">{card.desc}</p>
                  <span className="inline-flex items-center text-sm font-medium text-primary group-hover:gap-2 gap-1 transition-all">
                    Explore <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
