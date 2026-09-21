import { backofficeGet } from './api-client';
import { createCrudService } from './crud-factory';
import type {
  PaginatedResponse,
  AdminScribeListItem,
  AdminHandListItem,
  Script,
} from '@/types/backoffice';

// ── Scribes ─────────────────────────────────────────────────────────────

const scribesCrud = createCrudService<PaginatedResponse<AdminScribeListItem>, AdminScribeListItem>(
  '/api/v1/management/scribes/scribes/'
);

export const getScribes = () => scribesCrud.list();
export const getScribe = scribesCrud.get;
export const createScribe = scribesCrud.create;
export const updateScribe = scribesCrud.update;
export const deleteScribe = scribesCrud.remove;

// ── Hands ───────────────────────────────────────────────────────────────

const handsCrud = createCrudService<PaginatedResponse<AdminHandListItem>, AdminHandListItem>(
  '/api/v1/management/scribes/hands/'
);

export function getHands(params?: { scribe?: number; item_part?: number }) {
  return handsCrud.list(params);
}

export const getHand = handsCrud.get;
export const createHand = handsCrud.create;
export const updateHand = handsCrud.update;
export const deleteHand = handsCrud.remove;

// ── Scripts ─────────────────────────────────────────────────────────────

const scriptsCrud = createCrudService<Script>('/api/v1/management/scribes/scripts/');

export function getScripts() {
  return backofficeGet<Script[]>('/api/v1/management/scribes/scripts/');
}

export const createScript = scriptsCrud.create;
export const deleteScript = scriptsCrud.remove;
