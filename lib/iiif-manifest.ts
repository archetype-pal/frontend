import { env } from '@/lib/env';

/** The IIIF Presentation 3.0 manifest URL for a manuscript's item-part. */
export function getManifestUrl(itemPartId: number): string {
  return `${env.apiUrl}/api/v1/iiif/item-parts/${itemPartId}/manifest`;
}
