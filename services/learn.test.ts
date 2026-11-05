import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchMock = vi.fn();
const proxyFetchMock = vi.fn();
vi.mock('@/lib/api-fetch', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
  proxyFetch: (...args: unknown[]) => proxyFetchMock(...args),
}));

import {
  LearnError,
  askTutor,
  getGlyphPart,
  getLearnPages,
  getLearnStatus,
  getLesson,
  getPagePart,
  startLesson,
} from './learn';
import { jsonResponse, textResponse } from '@/test/responses';

const SESSION = { id: 'dd6a7786-4b32-4203-ba04-91c96a461cec', status: 'queued' };

beforeEach(() => {
  apiFetchMock.mockReset();
  proxyFetchMock.mockReset();
});

/** The one call made, and which route it took. */
function onlyCall() {
  const calls = [...apiFetchMock.mock.calls, ...proxyFetchMock.mock.calls];
  expect(calls).toHaveLength(1);
  const [path, init] = calls[0]! as [string, RequestInit];
  return { path, init, proxied: proxyFetchMock.mock.calls.length === 1 };
}

describe('the route a request takes', () => {
  it.each([
    ['getLearnStatus', () => getLearnStatus(true), {}],
    ['getLesson', () => getLesson(SESSION.id, true), SESSION],
    ['askTutor', () => askTutor(SESSION.id, 'Why?', true), SESSION],
    ['startLesson', () => startLesson({ itemImage: 64 }, 'en', true), SESSION],
  ])(
    '%s goes through the proxy for a signed-in student, who has a token',
    async (_, call, body) => {
      proxyFetchMock.mockResolvedValueOnce(jsonResponse(body));

      await call();

      expect(onlyCall().proxied).toBe(true);
    }
  );

  it.each([
    ['getLearnStatus', () => getLearnStatus(false), {}],
    ['getLesson', () => getLesson(SESSION.id, false), SESSION],
    ['askTutor', () => askTutor(SESSION.id, 'Why?', false), SESSION],
    ['startLesson', () => startLesson({ itemImage: 64 }, 'en', false), SESSION],
  ])(
    '%s goes straight to the API for an anonymous one, who is known by their own address',
    async (_, call, body) => {
      apiFetchMock.mockResolvedValueOnce(jsonResponse(body));

      await call();

      expect(onlyCall().proxied).toBe(false);
    }
  );

  it('never caches what the tutor answers', async () => {
    apiFetchMock.mockResolvedValueOnce(jsonResponse(SESSION));

    await getLesson(SESSION.id, false);

    expect(onlyCall().init.cache).toBe('no-store');
  });
});

describe('getLearnStatus and getLearnPages', () => {
  it('reads the status', async () => {
    const status = { enabled: true, may_upload: false };
    apiFetchMock.mockResolvedValueOnce(jsonResponse(status));

    await expect(getLearnStatus(false)).resolves.toEqual(status);
    expect(onlyCall().path).toBe('/api/v1/learn/');
  });

  it('reads the suggested pages, which are the same for everyone', async () => {
    apiFetchMock.mockResolvedValueOnce(jsonResponse([{ id: 64, label: 'Page 1' }]));

    await expect(getLearnPages()).resolves.toEqual([{ id: 64, label: 'Page 1' }]);
    const { path, proxied } = onlyCall();
    expect(path).toBe('/api/v1/learn/pages/');
    expect(proxied).toBe(false);
  });
});

describe('startLesson', () => {
  it('starts on a corpus page with JSON', async () => {
    apiFetchMock.mockResolvedValueOnce(jsonResponse(SESSION, 202));

    await expect(startLesson({ itemImage: 64 }, 'de', false)).resolves.toEqual(SESSION);

    const { path, init } = onlyCall();
    expect(path).toBe('/api/v1/learn/sessions/');
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ item_image: 64, language: 'de' });
  });

  it('sends a picture as multipart, leaving the boundary to the browser', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse(SESSION, 202));
    const picture = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'charter.jpg', {
      type: 'image/jpeg',
    });

    await startLesson({ picture }, 'fr', true);

    const { path, init } = onlyCall();
    expect(path).toBe('/api/v1/learn/sessions/');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    const body = init.body as FormData;
    expect((body.get('picture') as File).name).toBe('charter.jpg');
    expect(body.get('language')).toBe('fr');
    // A Content-Type set here would lack the boundary, and the API could not read the parts.
    expect(new Headers(init.headers).has('Content-Type')).toBe(false);
  });
});

describe('getLesson and askTutor', () => {
  it('reads a lesson by its id', async () => {
    apiFetchMock.mockResolvedValueOnce(jsonResponse(SESSION));

    await expect(getLesson(SESSION.id, false)).resolves.toEqual(SESSION);
    expect(onlyCall().path).toBe(`/api/v1/learn/sessions/${SESSION.id}/`);
  });

  it('asks a question with JSON', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse({ ...SESSION, status: 'working' }, 202));

    await expect(askTutor(SESSION.id, 'Is this a c or a t?', true)).resolves.toMatchObject({
      status: 'working',
    });

    const { path, init } = onlyCall();
    expect(path).toBe(`/api/v1/learn/sessions/${SESSION.id}/questions/`);
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ question: 'Is this a c or a t?' });
  });

  it('keeps an id from reaching another path', async () => {
    apiFetchMock.mockResolvedValueOnce(jsonResponse(SESSION));

    await getLesson('../users', false);

    expect(onlyCall().path).toBe('/api/v1/learn/sessions/..%2Fusers/');
  });
});

describe('refusals', () => {
  async function refused(response: Response | Error) {
    if (response instanceof Error) apiFetchMock.mockRejectedValueOnce(response);
    else apiFetchMock.mockResolvedValueOnce(response);
    const error = await startLesson({ itemImage: 64 }, 'en', false).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LearnError);
    return error as LearnError;
  }

  it("carries the tutor's own words", async () => {
    const error = await refused(
      jsonResponse({ detail: 'You have started 5 lessons today; try again tomorrow.' }, 429)
    );

    expect(error.status).toBe(429);
    expect(error.detail).toBe('You have started 5 lessons today; try again tomorrow.');
    expect(error.message).toBe(error.detail);
  });

  it("carries a serializer's first message", async () => {
    const error = await refused(
      jsonResponse({ picture: ['The picture is larger than 15 MB.'] }, 400)
    );

    expect(error.status).toBe(400);
    expect(error.detail).toBe('The picture is larger than 15 MB.');
  });

  it("keeps only the status when a gateway's error page comes back", async () => {
    const error = await refused(textResponse(502, '<html>Bad Gateway</html>'));

    expect(error.status).toBe(502);
    expect(error.detail).toBe('');
    expect(error.message).toBe('The tutor answered 502');
  });

  it('reports a request that never reached the API as status 0', async () => {
    const error = await refused(new TypeError('Failed to fetch'));

    expect(error.status).toBe(0);
    expect(error.detail).toBe('');
  });
});

describe('the manuscript part a page belongs to', () => {
  it("reads a glyph's page's part, for the viewer's address", async () => {
    apiFetchMock.mockResolvedValueOnce(jsonResponse({ id: 326, item_part: 12 }));

    await expect(getGlyphPart(326)).resolves.toBe(12);
    const { path, proxied } = onlyCall();
    expect(path).toBe('/api/v1/manuscripts/graphs/326/');
    expect(proxied).toBe(false);
  });

  it("reads a corpus page's part", async () => {
    apiFetchMock.mockResolvedValueOnce(jsonResponse({ id: 64, item_part: 7 }));

    await expect(getPagePart(64)).resolves.toBe(7);
    expect(onlyCall().path).toBe('/api/v1/manuscripts/item-images/64/');
  });

  it('fails when the page has none', async () => {
    apiFetchMock.mockResolvedValueOnce(jsonResponse({ id: 64, item_part: null }));

    await expect(getPagePart(64)).rejects.toMatchObject({ status: 404 });
  });
});
