import { backofficeGet, backofficePost, backofficePatch, backofficeDelete } from './api-client'
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

export function getHistoricalItems(
  token: string,
  params?: { limit?: number; offset?: number; type?: string }
) {
  const qs = new URLSearchParams()
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.offset) qs.set('offset', String(params.offset))
  if (params?.type) qs.set('type', params.type)
  const query = qs.toString()
  return backofficeGet<PaginatedResponse<HistoricalItemListItem>>(
    `/manuscripts/historical-items/${query ? `?${query}` : ''}`,
    token
  )
}

export function getHistoricalItem(token: string, id: number) {
  return backofficeGet<HistoricalItemDetail>(
    `/manuscripts/historical-items/${id}/`,
    token
  )
}

export function createHistoricalItem(
  token: string,
  data: Partial<HistoricalItemDetail>
) {
  return backofficePost<HistoricalItemDetail>(
    '/manuscripts/historical-items/',
    token,
    data
  )
}

export function updateHistoricalItem(
  token: string,
  id: number,
  data: Partial<HistoricalItemDetail>
) {
  return backofficePatch<HistoricalItemDetail>(
    `/manuscripts/historical-items/${id}/`,
    token,
    data
  )
}

export function deleteHistoricalItem(token: string, id: number) {
  return backofficeDelete(`/manuscripts/historical-items/${id}/`, token)
}

// ── Catalogue Numbers ───────────────────────────────────────────────────

export function createCatalogueNumber(
  token: string,
  data: Omit<CatalogueNumber, 'id' | 'catalogue_label'>
) {
  return backofficePost<CatalogueNumber>(
    '/manuscripts/catalogue-numbers/',
    token,
    data
  )
}

export function updateCatalogueNumber(
  token: string,
  id: number,
  data: Partial<CatalogueNumber>
) {
  return backofficePatch<CatalogueNumber>(
    `/manuscripts/catalogue-numbers/${id}/`,
    token,
    data
  )
}

export function deleteCatalogueNumber(token: string, id: number) {
  return backofficeDelete(`/manuscripts/catalogue-numbers/${id}/`, token)
}

// ── Descriptions ────────────────────────────────────────────────────────

export function createDescription(
  token: string,
  data: Omit<HistoricalItemDescription, 'id' | 'source_label'>
) {
  return backofficePost<HistoricalItemDescription>(
    '/manuscripts/descriptions/',
    token,
    data
  )
}

export function updateDescription(
  token: string,
  id: number,
  data: Partial<HistoricalItemDescription>
) {
  return backofficePatch<HistoricalItemDescription>(
    `/manuscripts/descriptions/${id}/`,
    token,
    data
  )
}

export function deleteDescription(token: string, id: number) {
  return backofficeDelete(`/manuscripts/descriptions/${id}/`, token)
}

// ── Repositories ────────────────────────────────────────────────────────

export function getRepositories(token: string) {
  return backofficeGet<PaginatedResponse<Repository>>(
    '/manuscripts/repositories/',
    token
  )
}

export function createRepository(
  token: string,
  data: Omit<Repository, 'id'>
) {
  return backofficePost<Repository>('/manuscripts/repositories/', token, data)
}

export function updateRepository(
  token: string,
  id: number,
  data: Partial<Repository>
) {
  return backofficePatch<Repository>(
    `/manuscripts/repositories/${id}/`,
    token,
    data
  )
}

export function deleteRepository(token: string, id: number) {
  return backofficeDelete(`/manuscripts/repositories/${id}/`, token)
}

// ── Bibliographic Sources ───────────────────────────────────────────────

export function getSources(token: string) {
  return backofficeGet<BibliographicSource[]>('/manuscripts/sources/', token)
}

export function createSource(
  token: string,
  data: Omit<BibliographicSource, 'id'>
) {
  return backofficePost<BibliographicSource>(
    '/manuscripts/sources/',
    token,
    data
  )
}

export function deleteSource(token: string, id: number) {
  return backofficeDelete(`/manuscripts/sources/${id}/`, token)
}

// ── Item Formats ────────────────────────────────────────────────────────

export function getFormats(token: string) {
  return backofficeGet<ItemFormat[]>('/manuscripts/formats/', token)
}

export function createFormat(token: string, data: { name: string }) {
  return backofficePost<ItemFormat>('/manuscripts/formats/', token, data)
}

export function deleteFormat(token: string, id: number) {
  return backofficeDelete(`/manuscripts/formats/${id}/`, token)
}

// ── Dates ───────────────────────────────────────────────────────────────

export function getDates(token: string) {
  return backofficeGet<BackofficeDate[]>('/common/dates/', token)
}

export function createDate(
  token: string,
  data: Omit<BackofficeDate, 'id'>
) {
  return backofficePost<BackofficeDate>('/common/dates/', token, data)
}

export function deleteDate(token: string, id: number) {
  return backofficeDelete(`/common/dates/${id}/`, token)
}
