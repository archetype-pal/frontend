/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonResponse } from '@/test/responses';
import {
  acceptAnnotationProposal,
  getAnnotationProposalDepth,
  getAnnotationProposals,
  rejectAnnotationProposal,
} from './annotation-proposals';

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

describe('annotation proposals service', () => {
  it('lists by status, a page at a time', async () => {
    await getAnnotationProposals({ status: 'pending', limit: 20, offset: 40 });

    expect(call().url).toMatch(
      /\/api\/v1\/management\/annotations\/proposals\/?\?status=pending&limit=20&offset=40$/
    );
  });

  it("narrows the list to one request's proposals", async () => {
    await getAnnotationProposals({ status: 'pending', ml_job: 31 });

    expect(call().url).toMatch(/\/proposals\/?\?status=pending&ml_job=31$/);
  });

  it('reads the pending depth', async () => {
    await getAnnotationProposalDepth();

    expect(call().url).toMatch(/\/management\/annotations\/proposals\/depth\/?$/);
  });

  it('accepts with an empty body and rejects with the reason', async () => {
    await acceptAnnotationProposal(7);
    await rejectAnnotationProposal(8, 'box is off the letter');

    expect(call(0).method).toBe('POST');
    expect(call(0).url).toMatch(/\/proposals\/7\/accept\/?$/);
    expect(call(0).body).toEqual({});
    expect(call(1).method).toBe('POST');
    expect(call(1).url).toMatch(/\/proposals\/8\/reject\/?$/);
    expect(call(1).body).toEqual({ reason: 'box is off the letter' });
  });
});
