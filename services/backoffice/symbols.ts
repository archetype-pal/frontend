import { backofficeGet, backofficePost, backofficePatch, backofficeDelete } from './api-client'
import type {
  CharacterListItem,
  CharacterDetail,
  CharacterStructurePayload,
  Component,
  Feature,
  Position,
} from '@/types/backoffice'

// ── Characters ──────────────────────────────────────────────────────────

export function getCharacters(token: string) {
  return backofficeGet<CharacterListItem[]>('/symbols/characters/', token)
}

export function getCharacter(token: string, id: number) {
  return backofficeGet<CharacterDetail>(`/symbols/characters/${id}/`, token)
}

export function createCharacter(
  token: string,
  data: { name: string; type?: string | null }
) {
  return backofficePost<CharacterDetail>('/symbols/characters/', token, data)
}

export function updateCharacter(
  token: string,
  id: number,
  data: Partial<{ name: string; type: string | null }>
) {
  return backofficePatch<CharacterDetail>(`/symbols/characters/${id}/`, token, data)
}

export function deleteCharacter(token: string, id: number) {
  return backofficeDelete(`/symbols/characters/${id}/`, token)
}

export function updateCharacterStructure(
  token: string,
  id: number,
  data: CharacterStructurePayload
) {
  return backofficePost<CharacterDetail>(
    `/symbols/characters/${id}/update-structure/`,
    token,
    data
  )
}

// ── Components ──────────────────────────────────────────────────────────

export function getComponents(token: string) {
  return backofficeGet<Component[]>('/symbols/components/', token)
}

export function createComponent(
  token: string,
  data: { name: string; features?: number[] }
) {
  return backofficePost<Component>('/symbols/components/', token, data)
}

export function updateComponent(
  token: string,
  id: number,
  data: Partial<{ name: string; features: number[] }>
) {
  return backofficePatch<Component>(`/symbols/components/${id}/`, token, data)
}

export function deleteComponent(token: string, id: number) {
  return backofficeDelete(`/symbols/components/${id}/`, token)
}

// ── Features ────────────────────────────────────────────────────────────

export function getFeatures(token: string) {
  return backofficeGet<Feature[]>('/symbols/features/', token)
}

export function createFeature(token: string, data: { name: string }) {
  return backofficePost<Feature>('/symbols/features/', token, data)
}

export function updateFeature(
  token: string,
  id: number,
  data: { name: string }
) {
  return backofficePatch<Feature>(`/symbols/features/${id}/`, token, data)
}

export function deleteFeature(token: string, id: number) {
  return backofficeDelete(`/symbols/features/${id}/`, token)
}

// ── Positions ───────────────────────────────────────────────────────────

export function getPositions(token: string) {
  return backofficeGet<Position[]>('/symbols/positions/', token)
}

export function createPosition(token: string, data: { name: string }) {
  return backofficePost<Position>('/symbols/positions/', token, data)
}

export function updatePosition(
  token: string,
  id: number,
  data: { name: string }
) {
  return backofficePatch<Position>(`/symbols/positions/${id}/`, token, data)
}

export function deletePosition(token: string, id: number) {
  return backofficeDelete(`/symbols/positions/${id}/`, token)
}
