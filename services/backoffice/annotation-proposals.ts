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
  ml_job?: number;
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

/** What a correction may change. Only what is given changes; nothing can be cleared. */
export interface ProposalCorrection {
  allograph?: number;
  /** One of the hands of the page's part. */
  hand?: number;
  /** The box as stored: a closed, Y-up GeoJSON ring in the page's pixels. */
  annotation?: Record<string, unknown>;
}

/**
 * Correct a pending proposal's letter, hand or box. It stays pending, and the
 * reply is the corrected row. A 409 if someone decided it meanwhile.
 */
export function correctAnnotationProposal(id: number, changes: ProposalCorrection) {
  return backofficePost<GraphProposalItem>(`${BASE}${id}/correct/`, changes);
}

export function rejectAnnotationProposal(id: number, reason = '') {
  return backofficePost<{ status: GraphProposalStatus }>(`${BASE}${id}/reject/`, { reason });
}

/** A letter as the find-on-page route names it: an allograph and its character. */
export interface PageLetter {
  id: number;
  name: string;
  character: string;
}

/** A letter the request could mean, with how many examples of it are marked on the page. */
export interface PageLetterOption {
  allograph: PageLetter;
  examples: number;
}

export type FindOnPageReply =
  | {
      status: 'proposed';
      allograph: PageLetter;
      hand: number | null;
      examples: number;
      job: number;
      proposed: number;
    }
  | { status: 'ask'; options: PageLetterOption[] }
  | { status: 'cannot'; reason: 'unknown_letter'; options: PageLetterOption[] }
  | {
      status: 'cannot';
      reason: 'too_few_examples';
      allograph: PageLetter;
      examples: number;
      minimum: number;
    }
  | {
      status: 'cannot';
      reason: 'page_too_large';
      allograph: PageLetter;
      side: number;
      maximum: number;
    };

/**
 * "Label every long-s on this folio" (AI programme W3.4): searches the page
 * for the letter's other examples, using the ones already marked there, and
 * files what it finds as proposals for review. Send `request` as the user
 * wrote it, or `allograph` once they have picked one of the options.
 * A 503 carries the reason the search could not run.
 */
export function findOnPage(
  imageId: number | string,
  body: { request: string } | { allograph: number; hand?: number | null; count?: number }
) {
  return backofficePost<FindOnPageReply>(`/api/v1/management/vision/pages/${imageId}/find/`, body);
}
