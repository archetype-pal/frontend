/**
 * The annotation proposal queue (AI programme W0.5): machine-proposed boxes
 * that become annotations only when a reviewer accepts them.
 */

import { backofficeGet, backofficePost } from './api-client';
import { createCrudService } from './crud-factory';
import type { GraphProposalItem, GraphProposalStatus, PaginatedResponse } from '@/types/backoffice';

const BASE = '/api/v1/management/annotations/proposals/';

const proposalsCrud = createCrudService<PaginatedResponse<GraphProposalItem>, GraphProposalItem>(
  BASE
);

export function getAnnotationProposals(params: {
  limit?: number;
  offset?: number;
  status?: GraphProposalStatus;
  item_image?: number;
}) {
  return proposalsCrud.list(params);
}

/** Pending proposals: the number the reviewer-capacity stop rule reads. */
export function getAnnotationProposalDepth() {
  return backofficeGet<{ pending: number }>(`${BASE}depth/`, { cache: 'no-store' });
}

/** Create the annotation. A 409 carries the reason it can't be accepted. */
export function acceptAnnotationProposal(id: number) {
  return backofficePost<{ status: GraphProposalStatus; graph_id: number }>(
    `${BASE}${id}/accept/`,
    {}
  );
}

export function rejectAnnotationProposal(id: number, reason = '') {
  return backofficePost<{ status: GraphProposalStatus }>(`${BASE}${id}/reject/`, { reason });
}
