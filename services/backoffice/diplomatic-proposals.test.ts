/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonResponse } from '@/test/responses';
import {
  acceptDiplomaticProposal,
  getDiplomaticProposal,
  getDiplomaticProposalDepth,
  getDiplomaticProposals,
  rejectDiplomaticProposal,
} from './diplomatic-proposals';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => jsonResponse({}));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const call = (n = 0) => {
  const [url, init] = fetchMock.mock.calls[n];
  return { url, method: init?.method ?? 'GET', body: init?.body && JSON.parse(init.body) };
};

describe('diplomatic proposals service', () => {
  it('lists by status and pipeline, a page at a time, and leaves out an unset pipeline', async () => {
    await getDiplomaticProposals({ status: 'pending', pipeline: 'W3.2', limit: 25, offset: 50 });
    await getDiplomaticProposals({ status: 'accepted', limit: 25, offset: 0 });

    expect(call(0).url).toMatch(
      /\/api\/v1\/management\/diplomatic-proposals\/?\?status=pending&pipeline=W3\.2&limit=25&offset=50$/
    );
    expect(call(1).url).toMatch(/\/diplomatic-proposals\/?\?status=accepted&limit=25&offset=0$/);
  });

  it('reads one proposal, and the pending depth', async () => {
    await getDiplomaticProposal(9);
    await getDiplomaticProposalDepth();

    expect(call(0).url).toMatch(/\/diplomatic-proposals\/9\/?$/);
    expect(call(1).url).toMatch(/\/diplomatic-proposals\/depth\/?$/);
  });

  it('accepts with an empty body and rejects with the reason', async () => {
    await acceptDiplomaticProposal(7);
    await rejectDiplomaticProposal(8, 'not in the text');

    expect(call(0).method).toBe('POST');
    expect(call(0).url).toMatch(/\/diplomatic-proposals\/7\/accept\/?$/);
    expect(call(0).body).toEqual({});
    expect(call(1).method).toBe('POST');
    expect(call(1).url).toMatch(/\/diplomatic-proposals\/8\/reject\/?$/);
    expect(call(1).body).toEqual({ reason: 'not in the text' });
  });
});
