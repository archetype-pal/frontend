import { backofficeGet } from './api-client';
import { createCrudService } from './crud-factory';
import { walkPaginated } from '@/lib/backoffice/walk-paginated';
import type {
  PaginatedResponse,
  HistoricalItemListItem,
  HistoricalItemDetail,
  Repository,
  BibliographicSource,
  ItemFormat,
  CatalogueNumber,
  HistoricalItemDescription,
  MsDescArea,
  BackofficeDate,
  BackofficePlace,
  CurrentItemOption,
  ItemPartNested,
} from '@/types/backoffice';

// ── Historical Items ────────────────────────────────────────────────────

const historicalItemsCrud = createCrudService<
  PaginatedResponse<HistoricalItemListItem>,
  HistoricalItemDetail
>('/api/v1/manuscripts/management/historical-items/');

export function getHistoricalItems(params?: {
  limit?: number;
  offset?: number;
  type?: string;
  search?: string;
  ordering?: string;
}) {
  return historicalItemsCrud.list(params);
}

export const getHistoricalItem = historicalItemsCrud.get;
export const createHistoricalItem = historicalItemsCrud.create;
export const updateHistoricalItem = historicalItemsCrud.update;
export const deleteHistoricalItem = historicalItemsCrud.remove;

// ── Item Images ─────────────────────────────────────────────────────────

export interface AdminItemImage {
  id: number;
  item_part: number;
  image: string | null;
  locus: string;
}

export interface MediaPickerFolder {
  name: string;
  path: string;
}

export interface MediaPickerImage {
  name: string;
  path: string;
  url: string;
}

export interface MediaPickerContent {
  folders: MediaPickerFolder[];
  images: MediaPickerImage[];
}

const itemImagesCrud = createCrudService<PaginatedResponse<AdminItemImage>, AdminItemImage>(
  '/api/v1/manuscripts/management/item-images/'
);

export const updateItemImage = itemImagesCrud.update;
export const deleteItemImage = itemImagesCrud.remove;

export function getMediaPickerContent(path = ''): Promise<MediaPickerContent> {
  const qs = new URLSearchParams();
  if (path) qs.set('path', path);
  const endpoint = `/api/v1/manuscripts/management/image-picker-content/${qs.toString() ? `?${qs.toString()}` : ''}`;
  return backofficeGet<MediaPickerContent>(endpoint);
}

// ── Item Parts ───────────────────────────────────────────────────────────

const itemPartsCrud = createCrudService<PaginatedResponse<ItemPartNested>, ItemPartNested>(
  '/api/v1/manuscripts/management/item-parts/'
);

export const createItemPart = itemPartsCrud.create;
export const updateItemPart = itemPartsCrud.update;
export const deleteItemPart = itemPartsCrud.remove;

/** The HistoricalItem an ItemPart belongs to — the id the manuscript workspace is keyed by. */
export async function getItemPartHistoricalItemId(itemPartId: number): Promise<number> {
  const part = await backofficeGet<{ historical_item: number }>(
    `/api/v1/manuscripts/management/item-parts/${itemPartId}/`
  );
  return part.historical_item;
}

// ── Current Items ────────────────────────────────────────────────────────

const currentItemsCrud = createCrudService<PaginatedResponse<CurrentItemOption>, CurrentItemOption>(
  '/api/v1/manuscripts/management/current-items/'
);

export function getCurrentItems(params?: {
  repository?: number;
  search?: string;
  limit?: number;
  offset?: number;
  ordering?: string;
}) {
  return currentItemsCrud.list(params);
}

export const createCurrentItem = currentItemsCrud.create;
export const deleteCurrentItem = currentItemsCrud.remove;

// ── Catalogue Numbers ───────────────────────────────────────────────────

const catalogueNumbersCrud = createCrudService<CatalogueNumber>(
  '/api/v1/manuscripts/management/catalogue-numbers/'
);

export const createCatalogueNumber = catalogueNumbersCrud.create;
export const updateCatalogueNumber = catalogueNumbersCrud.update;
export const deleteCatalogueNumber = catalogueNumbersCrud.remove;

// ── Descriptions ────────────────────────────────────────────────────────

const descriptionsCrud = createCrudService<HistoricalItemDescription>(
  '/api/v1/manuscripts/management/descriptions/'
);

export const createDescription = descriptionsCrud.create;
export const updateDescription = descriptionsCrud.update;
export const deleteDescription = descriptionsCrud.remove;

// ── MsDesc Areas ────────────────────────────────────────────────────────

// Writes only — reads arrive nested per item_part on the HistoricalItem management detail.
const msdescAreasCrud = createCrudService<MsDescArea>(
  '/api/v1/manuscripts/management/msdesc-areas/'
);

export const createMsDescArea = msdescAreasCrud.create;
export const updateMsDescArea = msdescAreasCrud.update;

// ── Repositories ────────────────────────────────────────────────────────

const repositoriesCrud = createCrudService<PaginatedResponse<Repository>, Repository>(
  '/api/v1/manuscripts/management/repositories/'
);

// Walk all pages so consumers (the repositories CRUD page and the
// physical-volumes filter dropdown) see every repository. The earlier
// `repositoriesCrud.list()` returned the first DRF page only, silently
// capping the list at 20.
export const getRepositories = (): Promise<Repository[]> =>
  walkPaginated<Repository>('/api/v1/manuscripts/management/repositories/?limit=100');
export const createRepository = repositoriesCrud.create;
export const updateRepository = repositoriesCrud.update;
export const deleteRepository = repositoriesCrud.remove;

// ── Bibliographic Sources ───────────────────────────────────────────────

const sourcesCrud = createCrudService<BibliographicSource[], BibliographicSource>(
  '/api/v1/manuscripts/management/sources/'
);

export const getSources = () => sourcesCrud.list();

export const createSource = sourcesCrud.create;
export const updateSource = sourcesCrud.update;
export const deleteSource = sourcesCrud.remove;

// ── Item Formats ────────────────────────────────────────────────────────

const formatsCrud = createCrudService<ItemFormat[], ItemFormat>(
  '/api/v1/manuscripts/management/formats/'
);

export const getFormats = () => formatsCrud.list();

export const createFormat = formatsCrud.create;
export const updateFormat = formatsCrud.update;
export const deleteFormat = formatsCrud.remove;

// ── Dates ───────────────────────────────────────────────────────────────

const datesCrud = createCrudService<BackofficeDate[], BackofficeDate>(
  '/api/v1/management/common/dates/'
);

export const getDates = () => datesCrud.list();

export const createDate = datesCrud.create;
export const updateDate = datesCrud.update;
export const deleteDate = datesCrud.remove;

// ── Places ──────────────────────────────────────────────────────────────

const placesCrud = createCrudService<BackofficePlace[], BackofficePlace>(
  '/api/v1/management/common/places/'
);

export const getPlaces = () => placesCrud.list();

export const createPlace = placesCrud.create;
