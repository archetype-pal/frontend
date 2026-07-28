/**
 * msDesc seeding helpers (TEI descriptions roadmap 2.5) — pure composition of
 * the create payloads that seed a part's structured description from the
 * canonical template skeletons in `lib/msdesc-template.ts`. Kept out of the
 * section component so the payload shape is unit-testable.
 */

import { msdescTemplateFragment } from '@/lib/msdesc-template';
import { MSDESC_AREAS, type MsDescAreaId } from '@/lib/msdesc-vocab';
import type { MsDescArea } from '@/types/backoffice';

export interface MsDescAreaSeedPayload {
  item_part: number;
  area: MsDescAreaId;
  content: string;
  is_published: boolean;
}

/** One template-seeded create payload (always unpublished — 0.1 decision). */
export function buildMsDescSeedPayload(
  itemPartId: number,
  area: MsDescAreaId
): MsDescAreaSeedPayload {
  return {
    item_part: itemPartId,
    area,
    content: msdescTemplateFragment(area),
    is_published: false,
  };
}

/** The four create payloads seeding a part's full structured description. */
export function buildMsDescSeedPayloads(itemPartId: number): MsDescAreaSeedPayload[] {
  return MSDESC_AREAS.map((area) => buildMsDescSeedPayload(itemPartId, area));
}

/** The stored row for an area, if any. */
export function msdescAreaRow<T extends Pick<MsDescArea, 'area'>>(
  rows: T[],
  area: MsDescAreaId
): T | undefined {
  return rows.find((row) => row.area === area);
}
