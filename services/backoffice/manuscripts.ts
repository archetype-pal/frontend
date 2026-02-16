import { backofficeGet } from './api-client'
import { createCrudService } from './crud-factory'
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
} from '@/types/backoffice'

// ── Historical Items ────────────────────────────────────────────────────

const historicalItemsCrud = createCrudService<
  PaginatedResponse<HistoricalItemListItem>,
  HistoricalItemDetail
>('/manuscripts/historical-items/')

export function getHistoricalItems(
  token: string,
  params?: { limit?: number; offset?: number; type?: string }
) {
  return historicalItemsCrud.list(token, params)
}

export const getHistoricalItem = historicalItemsCrud.get
export const createHistoricalItem = historicalItemsCrud.create
export const updateHistoricalItem = historicalItemsCrud.update
export const deleteHistoricalItem = historicalItemsCrud.remove

// ── Item Images ─────────────────────────────────────────────────────────

export interface AdminItemImage {
  id: number
  item_part: number
  image: string | null
  locus: string
}

export function getItemImages(
  token: string,
  params?: { item_part?: number; limit?: number; offset?: number }
) {
  const crud = createCrudService<PaginatedResponse<AdminItemImage>, AdminItemImage>(
    '/manuscripts/item-images/'
  )
  return crud.list(token, params)
}

// ── Catalogue Numbers ───────────────────────────────────────────────────

const catalogueNumbersCrud = createCrudService<CatalogueNumber>(
  '/manuscripts/catalogue-numbers/'
)

export const createCatalogueNumber = catalogueNumbersCrud.create
export const updateCatalogueNumber = catalogueNumbersCrud.update
export const deleteCatalogueNumber = catalogueNumbersCrud.remove

// ── Descriptions ────────────────────────────────────────────────────────

const descriptionsCrud = createCrudService<HistoricalItemDescription>(
  '/manuscripts/descriptions/'
)

export const createDescription = descriptionsCrud.create
export const updateDescription = descriptionsCrud.update
export const deleteDescription = descriptionsCrud.remove

// ── Repositories ────────────────────────────────────────────────────────

const repositoriesCrud = createCrudService<
  PaginatedResponse<Repository>,
  Repository
>('/manuscripts/repositories/')

export const getRepositories = (token: string) => repositoriesCrud.list(token)
export const createRepository = repositoriesCrud.create
export const updateRepository = repositoriesCrud.update
export const deleteRepository = repositoriesCrud.remove

// ── Bibliographic Sources ───────────────────────────────────────────────

const sourcesCrud = createCrudService<BibliographicSource>(
  '/manuscripts/sources/'
)

export function getSources(token: string) {
  return backofficeGet<BibliographicSource[]>('/manuscripts/sources/', token)
}

export const createSource = sourcesCrud.create
export const updateSource = sourcesCrud.update
export const deleteSource = sourcesCrud.remove

// ── Item Formats ────────────────────────────────────────────────────────

const formatsCrud = createCrudService<ItemFormat>('/manuscripts/formats/')

export function getFormats(token: string) {
  return backofficeGet<ItemFormat[]>('/manuscripts/formats/', token)
}

export const createFormat = formatsCrud.create
export const updateFormat = formatsCrud.update
export const deleteFormat = formatsCrud.remove

// ── Dates ───────────────────────────────────────────────────────────────

const datesCrud = createCrudService<BackofficeDate>('/common/dates/')

export function getDates(token: string) {
  return backofficeGet<BackofficeDate[]>('/common/dates/', token)
}

export const createDate = datesCrud.create
export const updateDate = datesCrud.update
export const deleteDate = datesCrud.remove
