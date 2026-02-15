import { backofficeGet, backofficePost, backofficePatch, backofficeDelete } from './api-client'
import type {
  PaginatedResponse,
  ScribeListItem,
  HandListItem,
  Script,
} from '@/types/backoffice'

// ── Scribes ─────────────────────────────────────────────────────────────

export function getScribes(token: string) {
  return backofficeGet<PaginatedResponse<ScribeListItem>>(
    '/scribes/scribes/',
    token
  )
}

export function getScribe(token: string, id: number) {
  return backofficeGet<ScribeListItem>(`/scribes/scribes/${id}/`, token)
}

export function createScribe(
  token: string,
  data: Partial<ScribeListItem>
) {
  return backofficePost<ScribeListItem>('/scribes/scribes/', token, data)
}

export function updateScribe(
  token: string,
  id: number,
  data: Partial<ScribeListItem>
) {
  return backofficePatch<ScribeListItem>(
    `/scribes/scribes/${id}/`,
    token,
    data
  )
}

export function deleteScribe(token: string, id: number) {
  return backofficeDelete(`/scribes/scribes/${id}/`, token)
}

// ── Hands ───────────────────────────────────────────────────────────────

export function getHands(
  token: string,
  params?: { scribe?: number; item_part?: number }
) {
  const qs = new URLSearchParams()
  if (params?.scribe) qs.set('scribe', String(params.scribe))
  if (params?.item_part) qs.set('item_part', String(params.item_part))
  const query = qs.toString()
  return backofficeGet<PaginatedResponse<HandListItem>>(
    `/scribes/hands/${query ? `?${query}` : ''}`,
    token
  )
}

export function getHand(token: string, id: number) {
  return backofficeGet<HandListItem>(`/scribes/hands/${id}/`, token)
}

export function createHand(
  token: string,
  data: Partial<HandListItem>
) {
  return backofficePost<HandListItem>('/scribes/hands/', token, data)
}

export function updateHand(
  token: string,
  id: number,
  data: Partial<HandListItem>
) {
  return backofficePatch<HandListItem>(`/scribes/hands/${id}/`, token, data)
}

export function deleteHand(token: string, id: number) {
  return backofficeDelete(`/scribes/hands/${id}/`, token)
}

// ── Scripts ─────────────────────────────────────────────────────────────

export function getScripts(token: string) {
  return backofficeGet<Script[]>('/scribes/scripts/', token)
}

export function createScript(token: string, data: { name: string }) {
  return backofficePost<Script>('/scribes/scripts/', token, data)
}

export function deleteScript(token: string, id: number) {
  return backofficeDelete(`/scribes/scripts/${id}/`, token)
}
