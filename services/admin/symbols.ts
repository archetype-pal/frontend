import { adminGet, adminPost, adminPatch, adminDelete } from './api-client'
import type {
  CharacterListItem,
  CharacterDetail,
  CharacterStructurePayload,
  Component,
  Feature,
  Position,
} from '@/types/admin'

// ── Characters ──────────────────────────────────────────────────────────

export function getCharacters(token: string) {
  return adminGet<CharacterListItem[]>('/symbols/characters/', token)
}

export function getCharacter(token: string, id: number) {
  return adminGet<CharacterDetail>(`/symbols/characters/${id}/`, token)
}

export function createCharacter(
  token: string,
  data: { name: string; type?: string | null }
) {
  return adminPost<CharacterDetail>('/symbols/characters/', token, data)
}

export function updateCharacter(
  token: string,
  id: number,
  data: Partial<{ name: string; type: string | null }>
) {
  return adminPatch<CharacterDetail>(`/symbols/characters/${id}/`, token, data)
}

export function deleteCharacter(token: string, id: number) {
  return adminDelete(`/symbols/characters/${id}/`, token)
}

export function updateCharacterStructure(
  token: string,
  id: number,
  data: CharacterStructurePayload
) {
  return adminPost<CharacterDetail>(
    `/symbols/characters/${id}/update-structure/`,
    token,
    data
  )
}

// ── Components ──────────────────────────────────────────────────────────

export function getComponents(token: string) {
  return adminGet<Component[]>('/symbols/components/', token)
}

export function createComponent(
  token: string,
  data: { name: string; features?: number[] }
) {
  return adminPost<Component>('/symbols/components/', token, data)
}

export function updateComponent(
  token: string,
  id: number,
  data: Partial<{ name: string; features: number[] }>
) {
  return adminPatch<Component>(`/symbols/components/${id}/`, token, data)
}

export function deleteComponent(token: string, id: number) {
  return adminDelete(`/symbols/components/${id}/`, token)
}

// ── Features ────────────────────────────────────────────────────────────

export function getFeatures(token: string) {
  return adminGet<Feature[]>('/symbols/features/', token)
}

export function createFeature(token: string, data: { name: string }) {
  return adminPost<Feature>('/symbols/features/', token, data)
}

export function updateFeature(
  token: string,
  id: number,
  data: { name: string }
) {
  return adminPatch<Feature>(`/symbols/features/${id}/`, token, data)
}

export function deleteFeature(token: string, id: number) {
  return adminDelete(`/symbols/features/${id}/`, token)
}

// ── Positions ───────────────────────────────────────────────────────────

export function getPositions(token: string) {
  return adminGet<Position[]>('/symbols/positions/', token)
}

export function createPosition(token: string, data: { name: string }) {
  return adminPost<Position>('/symbols/positions/', token, data)
}

export function updatePosition(
  token: string,
  id: number,
  data: { name: string }
) {
  return adminPatch<Position>(`/symbols/positions/${id}/`, token, data)
}

export function deletePosition(token: string, id: number) {
  return adminDelete(`/symbols/positions/${id}/`, token)
}
