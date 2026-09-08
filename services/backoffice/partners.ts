import { backofficePostFormData, backofficePatchFormData } from './api-client';
import { createCrudService } from './crud-factory';
import type { PartnerItem } from '@/types/backoffice';
import { normalizeCarouselImagePath } from '@/utils/api';

// ── Partners ─────────────────────────────────────────────────────────────

const PARTNERS_PATH = '/api/v1/media/management/partners/';

const partnersCrud = createCrudService<PartnerItem[], PartnerItem>(PARTNERS_PATH);

export const getPartners = (token: string) => partnersCrud.list(token);
export const deletePartner = partnersCrud.remove;

/** Plain JSON update (e.g. reordering). */
export const updatePartnerJson = partnersCrud.update;

export interface PartnerItemPayload {
  name: string;
  url?: string;
  ordering?: number;
  logo?: File | string | null;
}

function buildPartnerFormData(data: Partial<PartnerItemPayload>): FormData {
  const fd = new FormData();
  if (data.name !== undefined) fd.append('name', data.name);
  if (data.url !== undefined) fd.append('url', data.url);
  if (data.ordering !== undefined) fd.append('ordering', String(data.ordering));
  if (data.logo instanceof File) {
    fd.append('logo', data.logo);
  } else if (typeof data.logo === 'string' && data.logo.trim().length > 0) {
    fd.append('logo', normalizeCarouselImagePath(data.logo));
  }
  return fd;
}

/** Create a partner. Uses multipart when a logo File is provided. */
export function createPartner(token: string, data: PartnerItemPayload): Promise<PartnerItem> {
  return backofficePostFormData<PartnerItem>(PARTNERS_PATH, token, buildPartnerFormData(data));
}

/** Update a partner. Uses multipart when a logo File is provided. */
export function updatePartner(
  token: string,
  id: number,
  data: Partial<PartnerItemPayload>
): Promise<PartnerItem> {
  return backofficePatchFormData<PartnerItem>(
    `${PARTNERS_PATH}${id}/`,
    token,
    buildPartnerFormData(data)
  );
}
