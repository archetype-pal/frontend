'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { OpenLightboxButton } from '@/components/lightbox/open-lightbox-button';
import { GraphDetailLink } from '@/components/search/graph-detail-link';
import { Badge } from '@/components/ui/badge';
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
  badge: string;
  items: CollectionItem[];
  showAnnotationDetails: boolean;
};

function getSelectionLabel(item: CollectionItem): string {
  return `${item.type === 'image' ? 'image' : 'annotation'} ${getCollectionManuscriptLabel(item)}`;
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
}: {
  item: CollectionItem;
  label: string;
  imageUrl: string | null;
  fallback: string;
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

function CollectionImageThumbnail({ item, label }: { item: CollectionItem; label: string }) {
  return (
    <ThumbnailFrame
      item={item}
      label={label}
      imageUrl={getImageThumbnailUrl(item)}
      fallback="No image"
    />
  );
}

function CollectionGraphThumbnail({ item, label }: { item: CollectionItem; label: string }) {
  const infoUrl = (item.image_iiif || '').trim();
  const imageUrl = useIiifThumbnailUrl(infoUrl, item.coordinates ?? undefined, 120);

  return (
    <ThumbnailFrame
      item={item}
      label={label}
      imageUrl={imageUrl}
      fallback={infoUrl ? '…' : 'No image'}
    />
  );
}

function CollectionThumbnail({ item, label }: { item: CollectionItem; label: string }) {
  if (item.type === 'graph') return <CollectionGraphThumbnail item={item} label={label} />;
  return <CollectionImageThumbnail item={item} label={label} />;
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
      badge: 'Image',
      items: bySection.get('image') ?? [],
      showAnnotationDetails: false,
    },
    {
      key: 'annotation',
      title: getCollectionDisplaySectionLabel('annotation'),
      badge: 'Annotation',
      items: bySection.get('annotation') ?? [],
      showAnnotationDetails: true,
    },
    {
      key: 'editorial',
      title: getCollectionDisplaySectionLabel('editorial'),
      badge: 'Editorial',
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
}: {
  items: CollectionItem[];
  isItemSelected: (item: Pick<CollectionItem, 'id' | 'type'>) => boolean;
  onToggleSelection: (item: Pick<CollectionItem, 'id' | 'type'>) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-secondary py-12 text-center">
        <p className="text-sm text-muted-foreground">No items match the current filter.</p>
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
            <Badge variant={section.key === 'editorial' ? 'outline' : 'secondary'}>
              {section.badge}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {section.items.length} {section.items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <span className="sr-only">Selection</span>
                  </TableHead>
                  <TableHead className="w-[112px]">Image</TableHead>
                  <TableHead>Manuscript</TableHead>
                  {section.showAnnotationDetails && (
                    <>
                      <TableHead>Allograph</TableHead>
                      <TableHead className="hidden lg:table-cell">Hand</TableHead>
                    </>
                  )}
                  <TableHead className="w-14">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.items.map((item) => {
                  const manuscriptLabel = getCollectionManuscriptLabel(item);
                  const selected = isItemSelected(item);

                  return (
                    <TableRow
                      key={`${item.type}-${item.id}`}
                      data-state={selected ? 'selected' : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => onToggleSelection(item)}
                          aria-label={`Select ${getSelectionLabel(item)}`}
                        />
                      </TableCell>
                      <TableCell>
                        <CollectionThumbnail item={item} label={manuscriptLabel} />
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
                      <TableCell>
                        <OpenLightboxButton
                          item={item}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        />
                      </TableCell>
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
