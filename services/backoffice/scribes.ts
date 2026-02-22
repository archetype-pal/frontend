import { backofficeGet } from './api-client';
import { createCrudService } from './crud-factory';
import type { PaginatedResponse, ScribeListItem, HandListItem, Script } from '@/types/backoffice';

// ── Scribes ─────────────────────────────────────────────────────────────

const scribesCrud = createCrudService<PaginatedResponse<ScribeListItem>, ScribeListItem>(
  '/scribes/scribes/'
);

export const getScribes = (token: string) => scribesCrud.list(token);
export const getScribe = scribesCrud.get;
export const createScribe = scribesCrud.create;
export const updateScribe = scribesCrud.update;
export const deleteScribe = scribesCrud.remove;

// ── Hands ───────────────────────────────────────────────────────────────

const handsCrud = createCrudService<PaginatedResponse<HandListItem>, HandListItem>(
  '/scribes/hands/'
);

export function getHands(token: string, params?: { scribe?: number; item_part?: number }) {
  return handsCrud.list(token, params);
}

export const getHand = handsCrud.get;
export const createHand = handsCrud.create;
export const updateHand = handsCrud.update;
export const deleteHand = handsCrud.remove;

// ── Scripts ─────────────────────────────────────────────────────────────

const scriptsCrud = createCrudService<Script>('/scribes/scripts/');

export function getScripts(token: string) {
  return backofficeGet<Script[]>('/scribes/scripts/', token);
}

export const createScript = scriptsCrud.create;
export const deleteScript = scriptsCrud.remove;
