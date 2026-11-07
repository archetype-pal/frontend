/**
 * Where a charter opens on the public site. The viewer's route is the part
 * and the image: /manuscripts/<part>/images/<image>.
 */

import type { Charter } from '@/types/diplomatic';

/** Shared by the header's Research menu and the pages it lists. */
export const DIPLOMATIC_SUMMARY_KEY = ['diplomatic-summary'] as const;

export function charterFolioHref(charter: Pick<Charter, 'item_part' | 'item_image'>): string {
  return `/manuscripts/${charter.item_part}/images/${charter.item_image}`;
}

export function charterTextHref(
  charter: Pick<Charter, 'item_part' | 'item_image' | 'image_text'>
): string {
  return `${charterFolioHref(charter)}/texts/${charter.image_text}`;
}

/** "Cotton Ch. xviii.28, face", or nothing when the charter has no shelfmark. */
export function charterName(charter: Pick<Charter, 'shelfmark' | 'locus'>): string {
  if (!charter.shelfmark) return '';
  return [charter.shelfmark, charter.locus].filter(Boolean).join(', ');
}
