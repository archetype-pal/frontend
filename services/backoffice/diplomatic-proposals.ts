/**
 * The diplomatic proposal queue (AI programme Phases 2–3): entities, formulae,
 * translation drafts, dating flags and relations a model read out of charter
 * texts, which become records only when a reviewer accepts them.
 */

import { backofficeGet, backofficePost } from './api-client';
import { createCrudService } from './crud-factory';
import type {
  DiplomaticProposalDetail,
  DiplomaticProposalItem,
  GraphProposalStatus,
  PaginatedResponse,
} from '@/types/backoffice';

const BASE = '/api/v1/management/diplomatic-proposals/';

const proposalsCrud = createCrudService<
  PaginatedResponse<DiplomaticProposalItem>,
  DiplomaticProposalDetail
>(BASE);

export function getDiplomaticProposals(params: {
  limit?: number;
  offset?: number;
  status?: GraphProposalStatus;
  pipeline?: string;
}) {
  return proposalsCrud.list(params);
}

/** One proposal, with the charter text its model read. */
export const getDiplomaticProposal = proposalsCrud.get;

/** Pending proposals, in total and for every registered pipeline. */
export function getDiplomaticProposalDepth() {
  return backofficeGet<{ pending: number; by_pipeline: Record<string, number> }>(`${BASE}depth/`, {
    cache: 'no-store',
  });
}

/** Write the proposal's records. A 409 carries why it can't be accepted. */
export function acceptDiplomaticProposal(id: number) {
  return backofficePost<{ status: GraphProposalStatus; created: number }>(
    `${BASE}${id}/accept/`,
    {}
  );
}

export function rejectDiplomaticProposal(id: number, reason = '') {
  return backofficePost<{ status: GraphProposalStatus }>(`${BASE}${id}/reject/`, { reason });
}
