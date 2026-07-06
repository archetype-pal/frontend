'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { OpenLightboxButton } from '@/components/lightbox/open-lightbox-button';
import { GraphDetailLink } from '@/components/search/graph-detail-link';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CollectionItem } from '@/contexts/collection-context';
import { useIiifThumbnailUrl } from '@/hooks/use-iiif-thumbnail';
import {
  getCollectionAllographLabel,
  getCollectionDisplaySectionLabel,
  getCollectionDisplaySectionType,
  getCollectionHandLabel,
  getCollectionManuscriptLabel,
  isCollectionEditorialAnnotation,
  type CollectionDisplaySectionType,
} from '@/lib/collection-display';
import { getImageDetailUrl } from '@/lib/media-url';
import { getIiifImageUrl } from '@/utils/iiif';

type CollectionTableSection = {
  key: CollectionDisplaySectionType;
  title: string;
  items: CollectionItem[];
  showAnnotationDetails: boolean;
};

const TABLE_EAGER_THUMBNAIL_COUNT = 6;

function getSelectionLabel(item: CollectionItem): string {
  return `${item.type === 'image' ? 'image' : 'graph'} ${getCollectionManuscriptLabel(item)}`;
}

function getImageThumbnailUrl(item: CollectionItem): string | null {
  const infoUrl = item.image_iiif?.trim();
  if (!infoUrl) return null;
  return getIiifImageUrl(infoUrl, { thumbnail: true });
}

function CollectionItemLink({
  item,
  children,
  className,
}: {
  item: CollectionItem;
  children: ReactNode;
  className?: string;
}) {
  const linkClassName = className ?? 'font-medium text-primary hover:underline';

  if (item.type === 'graph') {
    return (
      <GraphDetailLink graph={item} className={linkClassName}>
        {children}
      </GraphDetailLink>
    );
  }

  const href = getImageDetailUrl(item);
  return href ? (
    <Link href={href} className={linkClassName}>
      {children}
    </Link>
  ) : (
    <span className={linkClassName}>{children}</span>
  );
}

function ThumbnailFrame({
  item,
  label,
  imageUrl,
  fallback,
  eager,
}: {
  item: CollectionItem;
  label: string;
  imageUrl: string | null;
  fallback: string;
  eager: boolean;
}) {
  return (
    <div className="relative h-16 w-20 overflow-hidden rounded-md border border-border bg-secondary sm:h-20 sm:w-24">
      <CollectionItemLink item={item} className="relative block h-full w-full">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={label}
            fill
            className="object-contain transition-transform duration-300 hover:scale-105"
            sizes="96px"
            loading={eager ? 'eager' : 'lazy'}
            unoptimized
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center px-2 text-center text-[11px] text-muted-foreground">
            {fallback}
          </span>
        )}
      </CollectionItemLink>
    </div>
  );
}

function CollectionImageThumbnail({
  item,
  label,
  eager,
}: {
  item: CollectionItem;
  label: string;
  eager: boolean;
}) {
  const t = useTranslations('collection');
  return (
    <ThumbnailFrame
      item={item}
      label={label}
      imageUrl={getImageThumbnailUrl(item)}
      fallback={t('table.noImage')}
      eager={eager}
    />
  );
}

function CollectionGraphThumbnail({
  item,
  label,
  eager,
}: {
  item: CollectionItem;
  label: string;
  eager: boolean;
}) {
  const t = useTranslations('collection');
  const infoUrl = (item.image_iiif || '').trim();
  const imageUrl = useIiifThumbnailUrl(infoUrl, item.coordinates ?? undefined, 120);

  return (
    <ThumbnailFrame
      item={item}
      label={label}
      imageUrl={imageUrl}
      fallback={infoUrl ? '…' : t('table.noImage')}
      eager={eager}
    />
  );
}

function CollectionThumbnail({
  item,
  label,
  eager,
}: {
  item: CollectionItem;
  label: string;
  eager: boolean;
}) {
  if (item.type === 'graph') {
    return <CollectionGraphThumbnail item={item} label={label} eager={eager} />;
  }
  return <CollectionImageThumbnail item={item} label={label} eager={eager} />;
}

function getTableSections(items: CollectionItem[]): CollectionTableSection[] {
  const bySection = new Map<CollectionDisplaySectionType, CollectionItem[]>([
    ['image', []],
    ['annotation', []],
    ['editorial', []],
  ]);

  for (const item of items) {
    bySection.get(getCollectionDisplaySectionType(item))?.push(item);
  }

  const sections: CollectionTableSection[] = [
    {
      key: 'image',
      title: getCollectionDisplaySectionLabel('image'),
      items: bySection.get('image') ?? [],
      showAnnotationDetails: false,
    },
    {
      key: 'annotation',
      title: getCollectionDisplaySectionLabel('annotation'),
      items: bySection.get('annotation') ?? [],
      showAnnotationDetails: true,
    },
    {
      key: 'editorial',
      title: getCollectionDisplaySectionLabel('editorial'),
      items: bySection.get('editorial') ?? [],
      showAnnotationDetails: true,
    },
  ];

  return sections.filter((section) => section.items.length > 0);
}

export function CollectionTableView({
  items,
  isItemSelected,
  onToggleSelection,
  readOnly = false,
}: {
  items: CollectionItem[];
  isItemSelected: (item: Pick<CollectionItem, 'id' | 'type'>) => boolean;
  onToggleSelection: (item: Pick<CollectionItem, 'id' | 'type'>) => void;
  readOnly?: boolean;
}) {
  const t = useTranslations('collection');

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-secondary py-12 text-center">
        <p className="text-sm text-muted-foreground">{t('table.noItems')}</p>
      </div>
    );
  }

  const sections = getTableSections(items);

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section
          key={section.key}
          className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/40 px-4 py-3">
            <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
            <span className="text-sm text-muted-foreground">
              {t('table.itemCount', { count: section.items.length })}
            </span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {!readOnly && (
                    <TableHead className="w-10">
                      <span className="sr-only">{t('table.selectionHeader')}</span>
                    </TableHead>
                  )}
                  <TableHead className="w-[112px]">{t('table.imageHeader')}</TableHead>
                  <TableHead>{t('table.manuscriptHeader')}</TableHead>
                  {section.showAnnotationDetails && (
                    <>
                      <TableHead>{t('table.allographHeader')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('table.handHeader')}</TableHead>
                    </>
                  )}
                  {!readOnly && (
                    <TableHead className="w-14">
                      <span className="sr-only">{t('table.actionsHeader')}</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.items.map((item, index) => {
                  const manuscriptLabel = getCollectionManuscriptLabel(item);
                  const selected = isItemSelected(item);
                  const eager = index < TABLE_EAGER_THUMBNAIL_COUNT;

                  return (
                    <TableRow
                      key={`${item.type}-${item.id}`}
                      data-state={selected ? 'selected' : undefined}
                    >
                      {!readOnly && (
                        <TableCell>
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => onToggleSelection(item)}
                            aria-label={t('table.selectItem', { label: getSelectionLabel(item) })}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <CollectionThumbnail item={item} label={manuscriptLabel} eager={eager} />
                      </TableCell>
                      <TableCell>
                        <CollectionItemLink
                          item={item}
                          className="font-medium text-primary hover:underline"
                        >
                          {manuscriptLabel}
                        </CollectionItemLink>
                      </TableCell>
                      {section.showAnnotationDetails && (
                        <>
                          <TableCell>
                            {isCollectionEditorialAnnotation(item)
                              ? '—'
                              : getCollectionAllographLabel(item)}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {getCollectionHandLabel(item) || '—'}
                          </TableCell>
                        </>
                      )}
                      {!readOnly && (
                        <TableCell>
                          <OpenLightboxButton
                            item={item}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      ))}
    </div>
  );
}
