import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';

import { formatApiError } from '@/lib/backoffice/format-api-error';
import { BackofficeApiError } from '@/services/backoffice/api-client';
import { fetchImageTextList, type ImageTextListRow } from '@/services/backoffice/image-texts-list';

type Translate = (key: string, values?: Record<string, string | number>) => string;

/** The image's existing text of this type, if any. An image holds one of each. */
export function useExistingImageText(itemImage: number, type: string) {
  const { data } = useQuery({
    queryKey: ['backoffice', 'image-texts', 'for-image', itemImage],
    queryFn: () => fetchImageTextList({ itemImage, pageSize: 10 }),
    enabled: Number.isInteger(itemImage) && itemImage > 0,
  });
  return data?.results.find((text) => text.type === type);
}

/** Says the image already has this type of text, and links to it. */
export function ExistingTextNotice({ text }: { text: ImageTextListRow }) {
  const t = useTranslations('backoffice');
  return (
    <p className="text-[11px] text-destructive">
      {t('imageTexts.errorAlreadyExists', { id: text.item_image, type: text.type })}{' '}
      <Link href={`/backoffice/image-texts/${text.id}`} className="font-medium underline">
        {t('imageTexts.editExisting')}
      </Link>
    </p>
  );
}

/** Turns a failed image-text create into a sentence an editor can act on. */
export function describeCreateError(
  err: unknown,
  t: Translate,
  itemImage: number,
  type: string
): string {
  if (err instanceof BackofficeApiError) {
    if (err.body.item_image) return t('imageTexts.errorImageNotFound', { id: itemImage });
    if (String(err.body.non_field_errors ?? '').includes('unique')) {
      return t('imageTexts.errorAlreadyExists', { id: itemImage, type });
    }
  }
  return formatApiError(err);
}
