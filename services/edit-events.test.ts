import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authFetchMock = vi.fn();
vi.mock('@/lib/api-fetch', () => ({
  authFetch: (...args: unknown[]) => authFetchMock(...args),
}));

import { fetchEventsForTarget } from './edit-events';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const event = (id: number, created: string) => ({
  id,
  actor: null,
  actor_username: null,
  action: 'updated' as const,
  target_type: 'graph',
  target_id: 1,
  summary: '',
  payload: null,
  created,
});

beforeEach(() => {
  authFetchMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('fetchEventsForTarget', () => {
  it('returns first-page events sorted newest-first', async () => {
    // Backend has no default ordering — page returns insertion order (oldest
    // first). The service must reorder client-side so the History tab leads
    // with the most recent activity.
    authFetchMock.mockResolvedValueOnce(
      jsonResponse({
        count: 3,
        next: null,
        previous: null,
        results: [
          event(1, '2026-01-01T00:00:00Z'),
          event(2, '2026-01-02T00:00:00Z'),
          event(3, '2026-01-03T00:00:00Z'),
        ],
      })
    );
    const result = await fetchEventsForTarget('graph', 1);
    expect(result.map((e) => e.id)).toEqual([3, 2, 1]);
    const path = authFetchMock.mock.calls[0]![0] as string;
    expect(path).toContain('limit=100');
    expect(path).toContain('target_type=graph');
    expect(path).toContain('target_id=1');
  });

  it('walks `next` and merges all pages before sorting', async () => {
    authFetchMock.mockResolvedValueOnce(
      jsonResponse({
        count: 2,
        next: 'http://api.example.com/api/v1/common/edit-events/?target_type=graph&target_id=1&limit=100&offset=100',
        previous: null,
        results: [event(1, '2026-01-01T00:00:00Z')],
      })
    );
    authFetchMock.mockResolvedValueOnce(
      jsonResponse({
        count: 2,
        next: null,
        previous: null,
        results: [event(2, '2026-02-01T00:00:00Z')],
      })
    );
    const result = await fetchEventsForTarget('graph', 1);
    expect(result.map((e) => e.id)).toEqual([2, 1]);
    const secondPath = authFetchMock.mock.calls[1]![0] as string;
    expect(secondPath.startsWith('/api/v1/common/edit-events/')).toBe(true);
    expect(secondPath.includes('http://')).toBe(false);
  });

  it('encodes target_type to survive special characters', async () => {
    authFetchMock.mockResolvedValueOnce(
      jsonResponse({ count: 0, next: null, previous: null, results: [] })
    );
    await fetchEventsForTarget('text annotation', 1);
    const path = authFetchMock.mock.calls[0]![0] as string;
    expect(path).toContain('target_type=text%20annotation');
  });

  it('returns empty on non-OK without throwing', async () => {
    authFetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'forbidden' }, 403));
    expect(await fetchEventsForTarget('graph', 1)).toEqual([]);
  });
});
