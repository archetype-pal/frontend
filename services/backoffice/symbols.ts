import { backofficeGet, backofficePost } from './api-client';
import { createCrudService } from './crud-factory';
import type {
  CharacterListItem,
  CharacterDetail,
  CharacterStructurePayload,
  Component,
  Feature,
  Position,
} from '@/types/backoffice';

// ── Characters ──────────────────────────────────────────────────────────

const charactersCrud = createCrudService<CharacterListItem, CharacterDetail>(
  '/symbols/characters/'
);

export function getCharacters(token: string) {
  return backofficeGet<CharacterListItem[]>('/symbols/characters/', token);
}

export const getCharacter = charactersCrud.get;
export const createCharacter = charactersCrud.create;
export const updateCharacter = charactersCrud.update;
export const deleteCharacter = charactersCrud.remove;

export function updateCharacterStructure(
  token: string,
  id: number,
  data: CharacterStructurePayload
) {
  return backofficePost<CharacterDetail>(
    `/symbols/characters/${id}/update-structure/`,
    token,
    data
  );
}

// ── Components ──────────────────────────────────────────────────────────

const componentsCrud = createCrudService<Component>('/symbols/components/');

export function getComponents(token: string) {
  return backofficeGet<Component[]>('/symbols/components/', token);
}

export const createComponent = componentsCrud.create;
export const updateComponent = componentsCrud.update;
export const deleteComponent = componentsCrud.remove;

// ── Features ────────────────────────────────────────────────────────────

const featuresCrud = createCrudService<Feature>('/symbols/features/');

export function getFeatures(token: string) {
  return backofficeGet<Feature[]>('/symbols/features/', token);
}

export const createFeature = featuresCrud.create;
export const updateFeature = featuresCrud.update;
export const deleteFeature = featuresCrud.remove;

// ── Positions ───────────────────────────────────────────────────────────

const positionsCrud = createCrudService<Position>('/symbols/positions/');

export function getPositions(token: string) {
  return backofficeGet<Position[]>('/symbols/positions/', token);
}

export const createPosition = positionsCrud.create;
export const updatePosition = positionsCrud.update;
export const deletePosition = positionsCrud.remove;
