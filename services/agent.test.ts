import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchMock = vi.fn();
const proxyFetchMock = vi.fn();
vi.mock('@/lib/api-fetch', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
  proxyFetch: (...args: unknown[]) => proxyFetchMock(...args),
}));

import { AskError, askArchetype, getAgentTools } from './agent';
import { jsonResponse, textResponse } from '@/test/responses';

beforeEach(() => {
  apiFetchMock.mockReset();
  proxyFetchMock.mockReset();
});

describe('askArchetype', () => {
  it('posts the question straight to the API, never through the proxy', async () => {
    apiFetchMock.mockResolvedValueOnce(jsonResponse({ id: 1, status: 'answered' }));

    await expect(askArchetype('Who witnessed it?')).resolves.toEqual({
      id: 1,
      status: 'answered',
    });

    const [path, init] = apiFetchMock.mock.calls[0]!;
    expect(path).toBe('/api/v1/agent/ask/');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ question: 'Who witnessed it?' });
    // Through the proxy every visitor would share the Next server's address,
    // and so one daily quota.
    expect(proxyFetchMock).not.toHaveBeenCalled();
  });

  it("carries the backend's reason when it declines", async () => {
    apiFetchMock.mockResolvedValueOnce(
      jsonResponse({ detail: 'Daily quota of 200 questions reached; try again tomorrow.' }, 503)
    );

    const error = await askArchetype('Again?').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AskError);
    expect((error as AskError).status).toBe(503);
    expect((error as AskError).detail).toMatch(/quota/);
  });

  it("keeps only the status when a gateway's error page comes back", async () => {
    apiFetchMock.mockResolvedValueOnce(textResponse(504, '<html>Gateway Timeout</html>'));

    const error = (await askArchetype('Slow?').catch((e: unknown) => e)) as AskError;

    expect(error.status).toBe(504);
    expect(error.detail).toBe('');
  });

  it('reports a request that never reached the API as status 0', async () => {
    apiFetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const error = (await askArchetype('Anyone?').catch((e: unknown) => e)) as AskError;

    expect(error).toBeInstanceOf(AskError);
    expect(error.status).toBe(0);
  });
});

describe('getAgentTools', () => {
  it('reads the public tool list', async () => {
    apiFetchMock.mockResolvedValueOnce(jsonResponse({ enabled: true, tools: [] }));

    await expect(getAgentTools()).resolves.toEqual({ enabled: true, tools: [] });
    expect(apiFetchMock.mock.calls[0]![0]).toBe('/api/v1/agent/tools/');
  });

  it('throws on a failure rather than reporting the agent switched off', async () => {
    apiFetchMock.mockResolvedValueOnce(jsonResponse({}, 500));

    await expect(getAgentTools()).rejects.toThrow('500');
  });
});
