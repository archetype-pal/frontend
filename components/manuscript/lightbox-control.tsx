'use client';

import { OpenLightboxButton } from '@/components/lightbox/open-lightbox-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ManuscriptImage as ManuscriptImageType } from '@/types/manuscript-image';
import type { Manuscript } from '@/types/manuscript';

interface LightboxControlProps {
  image: ManuscriptImageType | null;
  manuscript: Manuscript | null;
  imageId: string;
}

/** "Open in Lightbox" button for the current manuscript image. */
export function LightboxControl({ image, manuscript, imageId }: LightboxControlProps) {
  if (!image || !manuscript) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <OpenLightboxButton
            item={{
              id: Number(imageId),
              type: 'image',
              image_iiif: image.iiif_image,
              shelfmark: manuscript.current_item?.shelfmark || '',
              locus: image.locus,
              repository_name: manuscript.current_item?.repository?.name || '',
              repository_city: manuscript.current_item?.repository?.place || '',
              date: manuscript.historical_item?.date_display || '',
            }}
            variant="outline"
            size="icon"
            className="h-8 w-8"
          />
        </div>
      </TooltipTrigger>
      <TooltipContent>Open in Lightbox</TooltipContent>
    </Tooltip>
  );
}
