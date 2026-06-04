'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  useCollection,
  type CollectionItem,
  type NamedCollection,
} from '@/contexts/collection-context';
import { CollectionStar } from '@/components/collection/collection-star';
import { CollectionManagerControls } from '@/components/collection/collection-manager-controls';
import { CollectionSelectionToolbar } from '@/components/collection/collection-selection-toolbar';
import { CollectionTableView } from '@/components/collection/collection-table-view';
import { PrintCollectionButton } from '@/components/collection/print-collection-button';
import { ShareCollectionButton } from '@/components/collection/share-collection-button';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpDown, Copy, LayoutGrid, Star, Table as TableIcon, Trash2 } from 'lucide-react';
import { OpenLightboxButton } from '@/components/lightbox/open-lightbox-button';
import { getIiifImageUrl } from '@/utils/iiif';
import { useIiifThumbnailUrl } from '@/hooks/use-iiif-thumbnail';
import { useCollectionItemSelection } from '@/hooks/collection/use-collection-item-selection';
import { getImageDetailUrl as buildImageDetailUrl } from '@/lib/media-url';
import { cn } from '@/lib/utils';
import { GraphDetailLink } from '@/components/search/graph-detail-link';
import { getCollectionAllographLabel } from '@/lib/collection-display';
import {
  COLLECTION_SHARE_QUERY_PARAM,
  parseAnonymousCollectionShareParam,
} from '@/lib/collection-share-url';
import { getPubliclyShareableCollectionItems } from '@/lib/collection-workset';
import {
  groupCollectionAnnotations,
  type CollectionAnnotationGroupBy,
} from '@/lib/collection-grouping';
import {
  useCollectionViewState,
  type FilterType,
  type SortOption,
} from '@/hooks/collection/use-collection-view-state';
import { getWorkset } from '@/services/worksets';
import { getAvailableCollectionName } from '@/lib/collection-storage';

type SharedCollectionState =
  | { status: 'idle' }
  | { status: 'ready'; shareId: string; collection: NamedCollection }
  | { status: 'missing'; shareId: string }
  | { status: 'error'; shareId: string };

type AnonymousSharedCollectionState =
  | { status: 'idle' }
  | { status: 'ready'; collection: NamedCollection }
  | { status: 'error' };

type CollectionGridSectionKey = 'image' | 'graph' | 'editorial';

type CollectionRenderWindow = {
  key: string;
  table: number;
  image: number;
  graph: number;
  editorial: number;
};

const COLLECTION_GRID_SECTION_BATCH_SIZE = 60;
const COLLECTION_TABLE_BATCH_SIZE = 100;

function createRenderWindow(key: string): CollectionRenderWindow {
  return {
    key,
    table: COLLECTION_TABLE_BATCH_SIZE,
    image: COLLECTION_GRID_SECTION_BATCH_SIZE,
    graph: COLLECTION_GRID_SECTION_BATCH_SIZE,
    editorial: COLLECTION_GRID_SECTION_BATCH_SIZE,
  };
}

function getAnonymousSharePayloadFromHash(): string {
  if (typeof window === 'undefined') return '';

  const hash = window.location.hash.replace(/^#/, '');
  return new URLSearchParams(hash).get(COLLECTION_SHARE_QUERY_PARAM)?.trim() ?? '';
}

function subscribeToHashChange(callback: () => void) {
  window.addEventListener('hashchange', callback);

  return () => {
    window.removeEventListener('hashchange', callback);
  };
}

function useAnonymousShareHashPayload(): string {
  return React.useSyncExternalStore(
    subscribeToHashChange,
    getAnonymousSharePayloadFromHash,
    () => ''
  );
}

/** Sync thumbnail URL for image items (no coordinates). */
function getImageItemThumbnailUrl(item: CollectionItem): string | null {
  const infoUrl = item.image_iiif;
  if (!infoUrl) return null;
  return getIiifImageUrl(infoUrl, { thumbnail: true });
}

function getItemTitle(item: CollectionItem): string {
  const locus = 'locus' in item ? item.locus : undefined;
  return String(locus ?? item.shelfmark ?? 'Untitled');
}

function getAnnotationCardTitle(item: CollectionItem): string {
  return getCollectionAllographLabel(item);
}

function getImageDetailUrl(item: CollectionItem): string {
  return buildImageDetailUrl(item) ?? '#';
}

function isEditorialAnnotation(item: CollectionItem): boolean {
  return item.type === 'graph' && item.annotation_type === 'editorial';
}

/** Card for a graph item: thumbnail URL with bounds (no upscaling). */
function CollectionGraphCard({
  item,
  title,
  isSelected,
  onToggleSelection,
  readOnly,
}: {
  item: CollectionItem;
  title: string;
  isSelected: boolean;
  onToggleSelection: (item: CollectionItem) => void;
  readOnly: boolean;
}) {
  const infoUrl = (item.image_iiif || '').trim();
  const imageUrl = useIiifThumbnailUrl(infoUrl, item.coordinates ?? undefined);
  const isEditorial = isEditorialAnnotation(item);

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all duration-300 hover:border-border/80 hover:shadow-lg',
        isSelected && 'border-primary ring-2 ring-primary/30'
      )}
    >
      <div className="relative aspect-4/3 bg-secondary overflow-hidden">
        {imageUrl ? (
          <>
            <GraphDetailLink graph={item} className="relative block h-full w-full">
              <Image
                src={imageUrl}
                alt={title}
                fill
                className="object-contain transition-transform duration-300 group-hover:scale-110"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 16vw"
                unoptimized
              />
            </GraphDetailLink>
            <div className="absolute inset-0 bg-linear-to-t from-black/0 via-black/0 to-black/0 group-hover:from-black/5 group-hover:via-black/0 group-hover:to-black/0 transition-all duration-300 pointer-events-none" />
          </>
        ) : (
          <GraphDetailLink
            graph={item}
            className="bg-linear-to-br from-secondary to-muted w-full h-full flex items-center justify-center text-xs text-muted-foreground"
          >
            {infoUrl ? '…' : 'No Image'}
          </GraphDetailLink>
        )}
        {isEditorial && (
          <div className="absolute left-2 top-2 z-10 rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800 shadow-sm">
            Editorial
          </div>
        )}
        {!readOnly && (
          <>
            <div className="absolute bottom-2 left-2 z-20 rounded bg-white/90 p-1 shadow-sm">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelection(item)}
                aria-label={`Select graph ${title}`}
              />
            </div>
            <CollectionStar itemId={item.id} itemType="graph" item={item} />
          </>
        )}
      </div>
      <div className="p-3 text-center space-y-1 bg-white">
        <div className="font-medium text-foreground truncate text-xs sm:text-sm" title={title}>
          {title}
        </div>
      </div>
    </div>
  );
}

function CollectionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shareId = searchParams.get('share')?.trim() ?? '';
  const anonymousShareHashPayload = useAnonymousShareHashPayload();
  const anonymousSharePayload =
    shareId.length === 0
      ? anonymousShareHashPayload || (searchParams.get(COLLECTION_SHARE_QUERY_PARAM)?.trim() ?? '')
      : '';
  const {
    items: localItems,
    activeCollection: localActiveCollection,
    collections,
    canManageCollections,
    createCollection,
    clearCollection,
    removeItems,
  } = useCollection();
  const [sharedState, setSharedState] = React.useState<SharedCollectionState>({ status: 'idle' });
  const anonymousSharedCollection = React.useMemo<AnonymousSharedCollectionState>(() => {
    if (!anonymousSharePayload) return { status: 'idle' };

    try {
      return {
        status: 'ready',
        collection: parseAnonymousCollectionShareParam(anonymousSharePayload),
      };
    } catch {
      return { status: 'error' };
    }
  }, [anonymousSharePayload]);
  const isSharedView = shareId.length > 0 || anonymousSharePayload.length > 0;
  const sharedStateMatches = 'shareId' in sharedState && sharedState.shareId === shareId;
  const sharedCollection =
    (anonymousSharedCollection.status === 'ready' ? anonymousSharedCollection.collection : null) ??
    (sharedState.status === 'ready' && sharedStateMatches ? sharedState.collection : null);
  const activeCollection = sharedCollection ?? localActiveCollection;
  const items = sharedCollection?.items ?? localItems;
  const clearDisplayedCollection = React.useCallback(() => {
    if (!isSharedView) clearCollection();
  }, [clearCollection, isSharedView]);

  React.useEffect(() => {
    if (!shareId) return;

    let cancelled = false;

    getWorkset(shareId)
      .then((workset) => {
        if (cancelled) return;

        const snapshot = workset?.payload.collection;
        if (!workset || !snapshot) {
          setSharedState({ status: 'missing', shareId });
          return;
        }

        setSharedState({
          status: 'ready',
          shareId,
          collection: {
            id: `shared-${workset.public_id}`,
            name: snapshot.name || workset.title,
            items: getPubliclyShareableCollectionItems(snapshot.items),
          },
        });
      })
      .catch(() => {
        if (!cancelled) setSharedState({ status: 'error', shareId });
      });

    return () => {
      cancelled = true;
    };
  }, [shareId]);

  const {
    filter,
    setFilter,
    sortBy,
    setSortBy,
    view,
    setView,
    annotationGroup,
    setAnnotationGroup,
    showClearConfirm,
    filteredItems,
    handleClear,
  } = useCollectionViewState(items, clearDisplayedCollection);
  const images = filteredItems.filter((item) => item.type === 'image');
  const annotations = filteredItems.filter(
    (item) => item.type === 'graph' && !isEditorialAnnotation(item)
  );
  const editorialAnnotations = filteredItems.filter(isEditorialAnnotation);
  const allImages = items.filter((item) => item.type === 'image');
  const allAnnotations = items.filter(
    (item) => item.type === 'graph' && !isEditorialAnnotation(item)
  );
  const allEditorialAnnotations = items.filter(isEditorialAnnotation);
  const hasAnnotations = allAnnotations.length + allEditorialAnnotations.length > 0;
  const renderWindowKey = [
    activeCollection.id,
    filter,
    sortBy,
    view,
    annotationGroup,
    items.length,
  ].join(':');
  const [renderWindowState, setRenderWindowState] = React.useState<CollectionRenderWindow>(() =>
    createRenderWindow('')
  );
  const renderWindow =
    renderWindowState.key === renderWindowKey
      ? renderWindowState
      : createRenderWindow(renderWindowKey);
  const visibleImages = images.slice(0, renderWindow.image);
  const visibleAnnotations = annotations.slice(0, renderWindow.graph);
  const visibleEditorialAnnotations = editorialAnnotations.slice(0, renderWindow.editorial);
  const visibleTableItems = filteredItems.slice(0, renderWindow.table);
  const visibleGridItems = [...visibleImages, ...visibleAnnotations, ...visibleEditorialAnnotations];
  const visibleItems = view === 'table' ? visibleTableItems : visibleGridItems;
  const showMoreGridSection = React.useCallback(
    (section: CollectionGridSectionKey) => {
      setRenderWindowState((previous) => {
        const current =
          previous.key === renderWindowKey ? previous : createRenderWindow(renderWindowKey);

        return {
          ...current,
          [section]: current[section] + COLLECTION_GRID_SECTION_BATCH_SIZE,
        };
      });
    },
    [renderWindowKey]
  );
  const showMoreTableItems = React.useCallback(() => {
    setRenderWindowState((previous) => {
      const current =
        previous.key === renderWindowKey ? previous : createRenderWindow(renderWindowKey);

      return {
        ...current,
        table: current.table + COLLECTION_TABLE_BATCH_SIZE,
      };
    });
  }, [renderWindowKey]);
  const {
    selectedItems,
    allVisibleItemsSelected,
    someVisibleItemsSelected,
    isItemSelected,
    toggleItem,
    toggleVisibleItems,
    clearSelection,
  } = useCollectionItemSelection(activeCollection.id, items, visibleItems);

  const getUrl = (item: CollectionItem) => (item.type === 'image' ? getImageDetailUrl(item) : '#');
  const handleRemoveSelectedItems = () => {
    if (isSharedView) return;
    removeItems(selectedItems);
    clearSelection();
  };
  const handleSaveSharedCollectionCopy = () => {
    if (!sharedCollection) return;

    if (!canManageCollections) {
      toast.error('Local collections are not available in this browser session.');
      return;
    }

    const name = getAvailableCollectionName(collections, sharedCollection.name);
    if (!name || !createCollection(name, sharedCollection.items)) {
      toast.error('Could not save this shared collection.');
      return;
    }

    toast.success(`Saved ${name} to your collections`);
    router.push('/collection');
  };

  if (anonymousSharedCollection.status === 'error') {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-3 text-3xl font-bold text-foreground">Shared collection not found</h1>
        <p className="mb-6 text-muted-foreground">
          This public collection link is invalid or incomplete.
        </p>
        <Button asChild>
          <Link href="/collection">Open your collection</Link>
        </Button>
      </div>
    );
  }

  if (shareId && !sharedStateMatches) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">
        Loading shared collection...
      </div>
    );
  }

  if (isSharedView && sharedStateMatches && sharedState.status === 'missing') {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-3 text-3xl font-bold text-foreground">Shared collection not found</h1>
        <p className="mb-6 text-muted-foreground">
          This public link is unavailable or no longer contains a collection snapshot.
        </p>
        <Button asChild>
          <Link href="/collection">Open your collection</Link>
        </Button>
      </div>
    );
  }

  if (isSharedView && sharedStateMatches && sharedState.status === 'error') {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-3 text-3xl font-bold text-foreground">Could not load collection</h1>
        <p className="mb-6 text-muted-foreground">
          The public collection link could not be loaded. Please try again.
        </p>
        <Button asChild>
          <Link href="/collection">Open your collection</Link>
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 sm:py-20">
        {!isSharedView && <CollectionManagerControls />}
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-linear-to-br from-gray-50 to-gray-100 mb-6 shadow-sm">
            <Star className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-foreground">{activeCollection.name}</h1>
          <p className="text-muted-foreground text-lg mb-10 leading-relaxed max-w-md mx-auto">
            {isSharedView
              ? 'This shared collection has no public items.'
              : 'Your collection is empty. Start adding images or graphs from search results and manuscript viewers by clicking the star icon.'}
          </p>
          {!isSharedView && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/search/images">
                <Button size="lg" className="w-full sm:w-auto">
                  Browse Images
                </Button>
              </Link>
              <Link href="/search/graphs">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Browse Graphs
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderCard = (item: CollectionItem, type: 'image' | 'graph') => {
    const isSelected = isItemSelected(item);

    if (type === 'graph') {
      const title = getAnnotationCardTitle(item);

      return (
        <CollectionGraphCard
          key={`graph-${item.id}`}
          item={item}
          title={title}
          isSelected={isSelected}
          onToggleSelection={toggleItem}
          readOnly={isSharedView}
        />
      );
    }

    const title = getItemTitle(item);
    const imageUrl = getImageItemThumbnailUrl(item);

    return (
      <div
        key={`image-${item.id}`}
        className={cn(
          'group relative overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all duration-300 hover:border-border/80 hover:shadow-lg',
          isSelected && 'border-primary ring-2 ring-primary/30'
        )}
      >
        <div className="relative aspect-4/3 bg-secondary overflow-hidden">
          {imageUrl ? (
            <>
              <Link href={getUrl(item)} className="relative block h-full w-full">
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  className="object-contain transition-transform duration-300 group-hover:scale-110"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 20vw, 16vw"
                  unoptimized
                />
              </Link>
              <div className="absolute inset-0 bg-linear-to-t from-black/0 via-black/0 to-black/0 group-hover:from-black/5 group-hover:via-black/0 group-hover:to-black/0 transition-all duration-300 pointer-events-none" />
            </>
          ) : (
            <div className="bg-linear-to-br from-secondary to-muted w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              No Image
            </div>
          )}
          {!isSharedView && (
            <>
              <div className="absolute bottom-2 left-2 z-20 rounded bg-white/90 p-1 shadow-sm">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleItem(item)}
                  aria-label={`Select image ${title}`}
                />
              </div>
              <CollectionStar itemId={item.id} itemType="image" item={item} />
            </>
          )}
        </div>
        <div className="p-3 text-center space-y-1 bg-white">
          <div className="font-medium text-foreground truncate text-xs sm:text-sm" title={title}>
            {title}
          </div>
          {item.repository_name && (
            <div className="text-xs text-muted-foreground truncate" title={item.repository_name}>
              {item.repository_name}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSection = (
    title: string,
    visibleItems: CollectionItem[],
    matchedItems: CollectionItem[],
    allItems: CollectionItem[],
    type: 'image' | 'graph',
    onShowMore?: () => void
  ) => {
    if (allItems.length === 0 || (filter !== 'all' && filter !== type)) return null;
    const groups =
      type === 'graph' ? groupCollectionAnnotations(visibleItems, annotationGroup) : undefined;
    const hasMore = visibleItems.length < matchedItems.length;

    return (
      <section>
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">{title}</h2>
          <span className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-full font-medium">
            {hasMore
              ? `Showing ${visibleItems.length} of ${matchedItems.length}`
              : `${matchedItems.length} ${matchedItems.length === 1 ? 'item' : 'items'}`}
            {matchedItems.length !== allItems.length && ` of ${allItems.length}`}
          </span>
        </div>
        {matchedItems.length > 0 ? (
          groups && groups.length > 0 ? (
            <>
              <div className="space-y-8">
                {groups.map((group) => (
                  <div key={group.key}>
                    <div className="mb-3 flex items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground">{group.label}</h3>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {group.items.map((item) => renderCard(item, type))}
                    </div>
                  </div>
                ))}
              </div>
              {hasMore && onShowMore && (
                <div className="mt-6 flex justify-center">
                  <Button type="button" variant="outline" onClick={onShowMore}>
                    Show more {title.toLowerCase()}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {visibleItems.map((item) => renderCard(item, type))}
              </div>
              {hasMore && onShowMore && (
                <div className="mt-6 flex justify-center">
                  <Button type="button" variant="outline" onClick={onShowMore}>
                    Show more {title.toLowerCase()}
                  </Button>
                </div>
              )}
            </>
          )
        ) : (
          <div className="text-center py-12 bg-secondary rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">
              No {title.toLowerCase()} match the current filter.
            </p>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
      {!isSharedView && <CollectionManagerControls />}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-foreground">
              {activeCollection.name}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {isSharedView ? 'Public shared collection · ' : ''}
              {items.length} {items.length === 1 ? 'item' : 'items'}
              {!isSharedView ? ' saved' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            {!isSharedView && <ShareCollectionButton collection={activeCollection} />}
            <PrintCollectionButton collection={activeCollection} />
            {isSharedView && sharedCollection && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveSharedCollectionCopy}
              >
                <Copy className="mr-2 h-4 w-4" />
                Save collection copy
              </Button>
            )}
            {!isSharedView && (
              <>
                <OpenLightboxButton items={items} variant="outline" size="sm" />
                <Button
                  variant={showClearConfirm ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={handleClear}
                  className={
                    showClearConfirm
                      ? 'w-full sm:w-auto'
                      : 'text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto'
                  }
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {showClearConfirm ? 'Click again to confirm' : 'Clear All'}
                </Button>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex gap-2 bg-secondary p-1 rounded-lg">
            {(['all', 'image', 'graph'] as FilterType[]).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter(f)}
                className={f === 'all' ? 'min-w-[60px]' : 'min-w-[70px]'}
              >
                {f === 'all' ? 'All' : f === 'image' ? 'Images' : 'Graphs'}
              </Button>
            ))}
          </div>
          <div className="flex gap-2 bg-secondary p-1 rounded-lg">
            {(['added', 'name', 'repository'] as SortOption[]).map((s) => (
              <Button
                key={s}
                variant={sortBy === s ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSortBy(s)}
                className={s === 'repository' ? 'min-w-[100px]' : 'min-w-[80px]'}
              >
                {s === 'added' && <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />}
                {s === 'added' ? 'Added' : s === 'name' ? 'Name' : 'Repository'}
              </Button>
            ))}
          </div>
          {view === 'grid' && hasAnnotations && (
            <div className="flex items-center gap-2 rounded-lg bg-secondary p-1 pl-3">
              <span className="text-xs font-medium text-muted-foreground">Group graphs</span>
              <Select
                value={annotationGroup}
                onValueChange={(value) => setAnnotationGroup(value as CollectionAnnotationGroupBy)}
              >
                <SelectTrigger className="h-8 w-[150px] bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No grouping</SelectItem>
                  <SelectItem value="allograph">Allograph</SelectItem>
                  <SelectItem value="hand">Hand</SelectItem>
                  <SelectItem value="manuscript">Manuscript</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2 bg-secondary p-1 rounded-lg sm:ml-auto">
            <Button
              type="button"
              variant={view === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('grid')}
              aria-pressed={view === 'grid'}
            >
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
              Grid
            </Button>
            <Button
              type="button"
              variant={view === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('table')}
              aria-pressed={view === 'table'}
            >
              <TableIcon className="mr-1.5 h-3.5 w-3.5" />
              Table
            </Button>
          </div>
        </div>
        {!isSharedView && (
          <div className="mt-4">
            <CollectionSelectionToolbar
              selectedItems={selectedItems}
              visibleItemCount={visibleItems.length}
              allVisibleItemsSelected={allVisibleItemsSelected}
              someVisibleItemsSelected={someVisibleItemsSelected}
              onToggleVisibleItems={toggleVisibleItems}
              onClearSelection={clearSelection}
              onRemoveSelectedItems={handleRemoveSelectedItems}
            />
          </div>
        )}
      </div>
      {view === 'table' ? (
        <>
          <CollectionTableView
            items={visibleTableItems}
            isItemSelected={isItemSelected}
            onToggleSelection={toggleItem}
            readOnly={isSharedView}
          />
          {visibleTableItems.length < filteredItems.length && (
            <div className="mt-6 flex justify-center">
              <Button type="button" variant="outline" onClick={showMoreTableItems}>
                Show more items
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-12">
          {renderSection('Images', visibleImages, images, allImages, 'image', () =>
            showMoreGridSection('image')
          )}
          {renderSection('Graphs', visibleAnnotations, annotations, allAnnotations, 'graph', () =>
            showMoreGridSection('graph')
          )}
          {renderSection(
            'Editorial Annotations',
            visibleEditorialAnnotations,
            editorialAnnotations,
            allEditorialAnnotations,
            'graph',
            () => showMoreGridSection('editorial')
          )}
        </div>
      )}
    </div>
  );
}

export default function CollectionPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-16 text-center">Loading...</div>}>
      <CollectionPageContent />
    </Suspense>
  );
}
