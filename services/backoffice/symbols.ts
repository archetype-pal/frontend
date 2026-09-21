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
  '/api/v1/symbols_structure/management/symbols/characters/'
);

export function getCharacters() {
  return backofficeGet<CharacterListItem[]>(
    '/api/v1/symbols_structure/management/symbols/characters/'
  );
}

export const getCharacter = charactersCrud.get;
export const createCharacter = charactersCrud.create;
export const updateCharacter = charactersCrud.update;
export const deleteCharacter = charactersCrud.remove;

export function updateCharacterStructure(id: number, data: CharacterStructurePayload) {
  return backofficePost<CharacterDetail>(
    `/api/v1/symbols_structure/management/symbols/characters/${id}/update-structure/`,
    data
  );
}

// ── Components ──────────────────────────────────────────────────────────

const componentsCrud = createCrudService<Component>(
  '/api/v1/symbols_structure/management/symbols/components/'
);

export function getComponents() {
  return backofficeGet<Component[]>('/api/v1/symbols_structure/management/symbols/components/');
}

export const createComponent = componentsCrud.create;
export const updateComponent = componentsCrud.update;
export const deleteComponent = componentsCrud.remove;

// ── Features ────────────────────────────────────────────────────────────

const featuresCrud = createCrudService<Feature>(
  '/api/v1/symbols_structure/management/symbols/features/'
);

export function getFeatures() {
  return backofficeGet<Feature[]>('/api/v1/symbols_structure/management/symbols/features/');
}

export const createFeature = featuresCrud.create;
export const updateFeature = featuresCrud.update;
export const deleteFeature = featuresCrud.remove;

// ── Positions ───────────────────────────────────────────────────────────

const positionsCrud = createCrudService<Position>(
  '/api/v1/symbols_structure/management/symbols/positions/'
);

export function getPositions() {
  return backofficeGet<Position[]>('/api/v1/symbols_structure/management/symbols/positions/');
}

export const createPosition = positionsCrud.create;
export const updatePosition = positionsCrud.update;
export const deletePosition = positionsCrud.remove;
