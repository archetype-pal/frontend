import { backofficePost } from './api-client';
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

const charactersCrud = createCrudService<CharacterListItem[], CharacterDetail>(
  '/api/v1/symbols_structure/management/symbols/characters/'
);

export const getCharacters = () => charactersCrud.list();

export const getCharacter = charactersCrud.get;
export const createCharacter = charactersCrud.create;
export const deleteCharacter = charactersCrud.remove;

export function updateCharacterStructure(id: number, data: CharacterStructurePayload) {
  return backofficePost<CharacterDetail>(
    `/api/v1/symbols_structure/management/symbols/characters/${id}/update-structure/`,
    data
  );
}

// ── Components ──────────────────────────────────────────────────────────

const componentsCrud = createCrudService<Component[], Component>(
  '/api/v1/symbols_structure/management/symbols/components/'
);

export const getComponents = () => componentsCrud.list();

export const createComponent = componentsCrud.create;
export const updateComponent = componentsCrud.update;
export const deleteComponent = componentsCrud.remove;

// ── Features ────────────────────────────────────────────────────────────

const featuresCrud = createCrudService<Feature[], Feature>(
  '/api/v1/symbols_structure/management/symbols/features/'
);

export const getFeatures = () => featuresCrud.list();

export const createFeature = featuresCrud.create;
export const updateFeature = featuresCrud.update;
export const deleteFeature = featuresCrud.remove;

// ── Positions ───────────────────────────────────────────────────────────

const positionsCrud = createCrudService<Position[], Position>(
  '/api/v1/symbols_structure/management/symbols/positions/'
);

export const getPositions = () => positionsCrud.list();

export const createPosition = positionsCrud.create;
export const updatePosition = positionsCrud.update;
export const deletePosition = positionsCrud.remove;
