import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ImageTextDetail } from '@/services/image-texts';
import { loadImageText, loadImageTexts } from './image-texts';

const live = { id: 59, status: 'Live' } as ImageTextDetail;

function stubFetch(...responses: Response[]) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => responses.shift()!);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const authorizations = (fetchMock: ReturnType<typeof stubFetch>) =>
  fetchMock.mock.calls.map((c) => new Headers(c[1]?.headers).get('Authorization'));

const rejected = () => new Response('{"detail":"Invalid token."}', { status: 401 });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('image texts read by a server page', () => {
  it("reads with the reader's login", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify({ results: [live] })));

    expect(await loadImageTexts('56', 'abc')).toEqual([live]);
    expect(authorizations(fetchMock)).toEqual(['Token abc']);
  });

  it('reads as a visitor when nobody is signed in', async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify([live])));

    expect(await loadImageTexts('56', null)).toEqual([live]);
    expect(authorizations(fetchMock)).toEqual([null]);
  });

  it('lists the published texts when the login is no longer valid', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = stubFetch(rejected(), new Response(JSON.stringify({ results: [live] })));

    expect(await loadImageTexts('56', 'stale')).toEqual([live]);
    expect(authorizations(fetchMock)).toEqual(['Token stale', null]);
  });

  it('opens a published text when the login is no longer valid', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = stubFetch(rejected(), new Response(JSON.stringify(live)));

    expect(await loadImageText('59', 'stale')).toEqual(live);
    expect(authorizations(fetchMock)).toEqual(['Token stale', null]);
  });
});
