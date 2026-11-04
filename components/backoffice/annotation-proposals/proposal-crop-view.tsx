'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { proposalCrop, type ProposalCrop } from '@/lib/backoffice/proposal-crop';
import { coordinatesFromGeoJson, fetchIiifImageInfo, getIiifImageUrl } from '@/utils/iiif';

/** The longer side of the crop, in CSS pixels. */
const SIDE = 128;

interface Loaded {
  key: string;
  crop: ProposalCrop | null;
  src: string | null;
}

/** The page around a proposed box, with the box outlined on it. */
export function ProposalCropView({
  infoUrl,
  annotation,
  label,
}: {
  infoUrl: string | null;
  annotation: Record<string, unknown>;
  label: string;
}) {
  // The serialized annotation is the effect's dependency: a stable primitive,
  // where the object is a new reference on every refetch.
  const geometry = JSON.stringify(annotation);
  const key = `${infoUrl ?? ''}|${geometry}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!infoUrl) return;
    let cancelled = false;
    const bbox = coordinatesFromGeoJson(geometry);
    // The flip from the stored Y-up box to a IIIF region needs the page height,
    // so nothing is drawn until info.json answers (it is cached per page).
    void fetchIiifImageInfo(infoUrl).then((page) => {
      if (cancelled) return;
      const crop = bbox && page ? proposalCrop(bbox, page) : null;
      const src = crop
        ? getIiifImageUrl(infoUrl, { coordinates: crop.region, maxSize: SIDE * 2 })
        : null;
      setLoaded({ key: `${infoUrl}|${geometry}`, crop, src });
    });
    return () => {
      cancelled = true;
    };
  }, [infoUrl, geometry]);

  const current = loaded?.key === key ? loaded : null;

  if (infoUrl && !current) {
    return <Skeleton className="shrink-0 rounded-md" style={{ width: SIDE, height: SIDE }} />;
  }
  if (!current?.crop || !current.src) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground"
        style={{ width: SIDE, height: SIDE }}
      >
        <ImageOff className="h-5 w-5" aria-hidden />
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  const { region, box } = current.crop;
  const scale = SIDE / Math.max(region.w, region.h);
  return (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{ width: SIDE, height: SIDE }}
    >
      <div
        className="relative overflow-hidden rounded-md border bg-muted"
        style={{ width: Math.round(region.w * scale), height: Math.round(region.h * scale) }}
      >
        <Image
          src={current.src}
          alt={label}
          fill
          unoptimized
          sizes={`${SIDE}px`}
          className="object-fill"
        />
        <div
          aria-hidden
          data-testid="proposal-box"
          className="pointer-events-none absolute rounded-[1px] border-2 border-amber-400 shadow-[0_0_0_1px_rgba(0,0,0,0.55)]"
          style={{
            left: `${box.left}%`,
            top: `${box.top}%`,
            width: `${box.width}%`,
            height: `${box.height}%`,
          }}
        />
      </div>
    </div>
  );
}
