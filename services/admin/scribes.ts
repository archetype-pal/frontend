import { adminGet, adminPost, adminPatch, adminDelete } from './api-client'
import type {
  PaginatedResponse,
  ScribeListItem,
  HandListItem,
  Script,
} from '@/types/admin'

// ── Scribes ─────────────────────────────────────────────────────────────

export function getScribes(token: string) {
  return adminGet<PaginatedResponse<ScribeListItem>>(
    '/scribes/scribes/',
    token
  )
}

export function getScribe(token: string, id: number) {
  return adminGet<ScribeListItem>(`/scribes/scribes/${id}/`, token)
}

export function createScribe(
  token: string,
  data: Partial<ScribeListItem>
) {
  return adminPost<ScribeListItem>('/scribes/scribes/', token, data)
}

export function updateScribe(
  token: string,
  id: number,
  data: Partial<ScribeListItem>
) {
  return adminPatch<ScribeListItem>(
    `/scribes/scribes/${id}/`,
    token,
    data
  )
}

export function deleteScribe(token: string, id: number) {
  return adminDelete(`/scribes/scribes/${id}/`, token)
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
  return adminGet<PaginatedResponse<HandListItem>>(
    `/scribes/hands/${query ? `?${query}` : ''}`,
    token
  )
}

export function getHand(token: string, id: number) {
  return adminGet<HandListItem>(`/scribes/hands/${id}/`, token)
}

export function createHand(
  token: string,
  data: Partial<HandListItem>
) {
  return adminPost<HandListItem>('/scribes/hands/', token, data)
}

export function updateHand(
  token: string,
  id: number,
  data: Partial<HandListItem>
) {
  return adminPatch<HandListItem>(`/scribes/hands/${id}/`, token, data)
}

export function deleteHand(token: string, id: number) {
  return adminDelete(`/scribes/hands/${id}/`, token)
}

// ── Scripts ─────────────────────────────────────────────────────────────

export function getScripts(token: string) {
  return adminGet<Script[]>('/scribes/scripts/', token)
}

export function createScript(token: string, data: { name: string }) {
  return adminPost<Script>('/scribes/scripts/', token, data)
}

export function deleteScript(token: string, id: number) {
  return adminDelete(`/scribes/scripts/${id}/`, token)
}
