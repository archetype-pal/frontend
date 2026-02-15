import { adminGet, adminPost, adminPatch, adminDelete } from './api-client'
import type {
  PaginatedResponse,
  HistoricalItemListItem,
  HistoricalItemDetail,
  Repository,
  BibliographicSource,
  ItemFormat,
  CatalogueNumber,
  HistoricalItemDescription,
  AdminDate,
} from '@/types/admin'

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
  return adminGet<PaginatedResponse<HistoricalItemListItem>>(
    `/manuscripts/historical-items/${query ? `?${query}` : ''}`,
    token
  )
}

export function getHistoricalItem(token: string, id: number) {
  return adminGet<HistoricalItemDetail>(
    `/manuscripts/historical-items/${id}/`,
    token
  )
}

export function createHistoricalItem(
  token: string,
  data: Partial<HistoricalItemDetail>
) {
  return adminPost<HistoricalItemDetail>(
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
  return adminPatch<HistoricalItemDetail>(
    `/manuscripts/historical-items/${id}/`,
    token,
    data
  )
}

export function deleteHistoricalItem(token: string, id: number) {
  return adminDelete(`/manuscripts/historical-items/${id}/`, token)
}

// ── Catalogue Numbers ───────────────────────────────────────────────────

export function createCatalogueNumber(
  token: string,
  data: Omit<CatalogueNumber, 'id' | 'catalogue_label'>
) {
  return adminPost<CatalogueNumber>(
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
  return adminPatch<CatalogueNumber>(
    `/manuscripts/catalogue-numbers/${id}/`,
    token,
    data
  )
}

export function deleteCatalogueNumber(token: string, id: number) {
  return adminDelete(`/manuscripts/catalogue-numbers/${id}/`, token)
}

// ── Descriptions ────────────────────────────────────────────────────────

export function createDescription(
  token: string,
  data: Omit<HistoricalItemDescription, 'id' | 'source_label'>
) {
  return adminPost<HistoricalItemDescription>(
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
  return adminPatch<HistoricalItemDescription>(
    `/manuscripts/descriptions/${id}/`,
    token,
    data
  )
}

export function deleteDescription(token: string, id: number) {
  return adminDelete(`/manuscripts/descriptions/${id}/`, token)
}

// ── Repositories ────────────────────────────────────────────────────────

export function getRepositories(token: string) {
  return adminGet<PaginatedResponse<Repository>>(
    '/manuscripts/repositories/',
    token
  )
}

export function createRepository(
  token: string,
  data: Omit<Repository, 'id'>
) {
  return adminPost<Repository>('/manuscripts/repositories/', token, data)
}

export function updateRepository(
  token: string,
  id: number,
  data: Partial<Repository>
) {
  return adminPatch<Repository>(
    `/manuscripts/repositories/${id}/`,
    token,
    data
  )
}

export function deleteRepository(token: string, id: number) {
  return adminDelete(`/manuscripts/repositories/${id}/`, token)
}

// ── Bibliographic Sources ───────────────────────────────────────────────

export function getSources(token: string) {
  return adminGet<BibliographicSource[]>('/manuscripts/sources/', token)
}

export function createSource(
  token: string,
  data: Omit<BibliographicSource, 'id'>
) {
  return adminPost<BibliographicSource>(
    '/manuscripts/sources/',
    token,
    data
  )
}

export function deleteSource(token: string, id: number) {
  return adminDelete(`/manuscripts/sources/${id}/`, token)
}

// ── Item Formats ────────────────────────────────────────────────────────

export function getFormats(token: string) {
  return adminGet<ItemFormat[]>('/manuscripts/formats/', token)
}

export function createFormat(token: string, data: { name: string }) {
  return adminPost<ItemFormat>('/manuscripts/formats/', token, data)
}

export function deleteFormat(token: string, id: number) {
  return adminDelete(`/manuscripts/formats/${id}/`, token)
}

// ── Dates ───────────────────────────────────────────────────────────────

export function getDates(token: string) {
  return adminGet<AdminDate[]>('/common/dates/', token)
}

export function createDate(
  token: string,
  data: Omit<AdminDate, 'id'>
) {
  return adminPost<AdminDate>('/common/dates/', token, data)
}

export function deleteDate(token: string, id: number) {
  return adminDelete(`/common/dates/${id}/`, token)
}
