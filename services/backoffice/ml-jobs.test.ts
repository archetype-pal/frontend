/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonResponse } from '@/test/responses';
import { getMLJob, getMLJobSummary, getMLJobs } from './ml-jobs';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => jsonResponse({}));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const url = (n = 0) => fetchMock.mock.calls[n][0] as string;

describe('ml jobs service', () => {
  it('lists by outcome and task, a page at a time', async () => {
    await getMLJobs({ limit: 50, offset: 100, status: 'refused', task: 'W2.1' });

    expect(url()).toMatch(
      /\/api\/v1\/management\/ml-jobs\/?\?limit=50&offset=100&status=refused&task=W2\.1$/
    );
  });

  it('reads one call and the breaker summary, and writes nothing', async () => {
    await getMLJob(7);
    await getMLJobSummary();

    expect(url(0)).toMatch(/\/management\/ml-jobs\/7\/?$/);
    expect(url(1)).toMatch(/\/management\/ml-jobs\/summary\/?$/);
    expect(fetchMock.mock.calls.every(([, init]) => (init?.method ?? 'GET') === 'GET')).toBe(true);
  });
});
