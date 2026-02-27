import { backofficeGet } from './api-client';
import { createCrudService } from './crud-factory';
import type {
  PaginatedResponse,
  HistoricalItemListItem,
  HistoricalItemDetail,
  Repository,
  BibliographicSource,
  ItemFormat,
  CatalogueNumber,
  HistoricalItemDescription,
  BackofficeDate,
  CurrentItemOption,
  ItemPartNested,
} from '@/types/backoffice';

// ── Historical Items ────────────────────────────────────────────────────

const historicalItemsCrud = createCrudService<
  PaginatedResponse<HistoricalItemListItem>,
  HistoricalItemDetail
>('/api/v1/manuscripts/management/historical-items/');

export function getHistoricalItems(
  token: string,
  params?: { limit?: number; offset?: number; type?: string }
) {
  return historicalItemsCrud.list(token, params);
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

export function getItemImages(
  token: string,
  params?: { item_part?: number; limit?: number; offset?: number }
) {
  const crud = createCrudService<PaginatedResponse<AdminItemImage>, AdminItemImage>(
    '/api/v1/manuscripts/management/item-images/'
  );
  return crud.list(token, params);
}

// ── Item Parts ───────────────────────────────────────────────────────────

const itemPartsCrud = createCrudService<PaginatedResponse<ItemPartNested>, ItemPartNested>(
  '/api/v1/manuscripts/management/item-parts/'
);

export const createItemPart = itemPartsCrud.create;
export const updateItemPart = itemPartsCrud.update;
export const deleteItemPart = itemPartsCrud.remove;

// ── Current Items ────────────────────────────────────────────────────────

const currentItemsCrud = createCrudService<PaginatedResponse<CurrentItemOption>, CurrentItemOption>(
  '/api/v1/manuscripts/management/current-items/'
);

export function getCurrentItems(
  token: string,
  params?: { repository?: number; limit?: number; offset?: number }
) {
  return currentItemsCrud.list(token, params);
}

export const getCurrentItem = currentItemsCrud.get;
export const createCurrentItem = currentItemsCrud.create;
export const updateCurrentItem = currentItemsCrud.update;
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

// ── Repositories ────────────────────────────────────────────────────────

const repositoriesCrud = createCrudService<PaginatedResponse<Repository>, Repository>(
  '/api/v1/manuscripts/management/repositories/'
);

export const getRepositories = (token: string) => repositoriesCrud.list(token);
export const createRepository = repositoriesCrud.create;
export const updateRepository = repositoriesCrud.update;
export const deleteRepository = repositoriesCrud.remove;

// ── Bibliographic Sources ───────────────────────────────────────────────

const sourcesCrud = createCrudService<BibliographicSource>(
  '/api/v1/manuscripts/management/sources/'
);

export function getSources(token: string) {
  return backofficeGet<BibliographicSource[]>('/api/v1/manuscripts/management/sources/', token);
}

export const createSource = sourcesCrud.create;
export const updateSource = sourcesCrud.update;
export const deleteSource = sourcesCrud.remove;

// ── Item Formats ────────────────────────────────────────────────────────

const formatsCrud = createCrudService<ItemFormat>('/api/v1/manuscripts/management/formats/');

export function getFormats(token: string) {
  return backofficeGet<ItemFormat[]>('/api/v1/manuscripts/management/formats/', token);
}

export const createFormat = formatsCrud.create;
export const updateFormat = formatsCrud.update;
export const deleteFormat = formatsCrud.remove;

// ── Dates ───────────────────────────────────────────────────────────────

const datesCrud = createCrudService<BackofficeDate>('/api/v1/management/common/dates/');

export function getDates(token: string) {
  return backofficeGet<BackofficeDate[]>('/api/v1/management/common/dates/', token);
}

export const createDate = datesCrud.create;
export const updateDate = datesCrud.update;
export const deleteDate = datesCrud.remove;
