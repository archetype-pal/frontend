'use client';

import Link from 'next/link';

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
import { getImageDetailUrl } from '@/lib/media-url';

function isEditorialAnnotation(item: CollectionItem): boolean {
  return item.type === 'graph' && item.annotation_type === 'editorial';
}

function getItemLabel(item: CollectionItem): string {
  if (item.locus) return item.locus;
  return item.type === 'image' ? `Image #${item.id}` : `Annotation #${item.id}`;
}

function CollectionItemLink({ item }: { item: CollectionItem }) {
  const label = getItemLabel(item);
  const className = 'font-medium text-primary hover:underline';

  if (item.type === 'graph') {
    return (
      <GraphDetailLink graph={item} className={className}>
        {label}
      </GraphDetailLink>
    );
  }

  const href = getImageDetailUrl(item);
  return href ? (
    <Link href={href} className={className}>
      {label}
    </Link>
  ) : (
    <span className="font-medium">{label}</span>
  );
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

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <span className="sr-only">Selection</span>
            </TableHead>
            <TableHead className="w-[130px]">Type</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Manuscript</TableHead>
            <TableHead className="hidden lg:table-cell">Allograph</TableHead>
            <TableHead className="hidden xl:table-cell">Hand</TableHead>
            <TableHead className="hidden md:table-cell">Repository</TableHead>
            <TableHead className="hidden lg:table-cell">Date</TableHead>
            <TableHead className="w-14">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
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
                    aria-label={`Select ${getItemLabel(item)}`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">
                      {item.type === 'image' ? 'Image' : 'Annotation'}
                    </Badge>
                    {isEditorialAnnotation(item) && (
                      <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">
                        Editorial
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <CollectionItemLink item={item} />
                </TableCell>
                <TableCell>{item.shelfmark || '—'}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  {item.type === 'graph' ? item.allograph || '—' : '—'}
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  {item.type === 'graph' ? item.hand_name || '—' : '—'}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {item.repository_name || '—'}
                </TableCell>
                <TableCell className="hidden lg:table-cell">{item.date || '—'}</TableCell>
                <TableCell>
                  <OpenLightboxButton item={item} variant="ghost" size="icon" className="h-8 w-8" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
