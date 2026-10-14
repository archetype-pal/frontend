import { createCrudService } from './crud-factory';
import type {
  PaginatedResponse,
  AdminScribeListItem,
  AdminHandListItem,
  HandDescription,
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

export const getHand = handsCrud.get;
export const createHand = handsCrud.create;
export const updateHand = handsCrud.update;
export const deleteHand = handsCrud.remove;

// ── Hand descriptions ──────────────────────────────────────────────────
// Writes only — reads arrive nested per hand on the Hand detail endpoint.

const handDescriptionsCrud = createCrudService<HandDescription>(
  '/api/v1/management/scribes/hand-descriptions/'
);

export const createHandDescription = handDescriptionsCrud.create;
export const updateHandDescription = handDescriptionsCrud.update;
export const deleteHandDescription = handDescriptionsCrud.remove;
