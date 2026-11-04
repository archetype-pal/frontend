import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchMock = vi.fn();
vi.mock('@/lib/api-fetch', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import { getDiplomaticSummary, getFormulae } from './diplomatic';
import { jsonResponse } from '@/test/responses';

beforeEach(() => apiFetchMock.mockReset());

describe('getFormulae', () => {
  it('asks for a page, with the kind and the search only when set', async () => {
    apiFetchMock.mockImplementation(async () => jsonResponse({ count: 0, results: [] }));

    await getFormulae({ limit: 20, offset: 40 });
    await getFormulae({ kind: 'sanctio', search: 'anathema', limit: 20, offset: 0 });

    expect(apiFetchMock.mock.calls[0]![0]).toBe('/api/v1/diplomatic/formulae/?limit=20&offset=40');
    expect(apiFetchMock.mock.calls[1]![0]).toBe(
      '/api/v1/diplomatic/formulae/?limit=20&offset=0&kind=sanctio&search=anathema'
    );
  });

  it('throws on a failure rather than reporting an empty formulary', async () => {
    apiFetchMock.mockResolvedValue(jsonResponse({}, 500));

    await expect(getFormulae({ limit: 20, offset: 0 })).rejects.toThrow('500');
  });
});

describe('getDiplomaticSummary', () => {
  it('reads the counts', async () => {
    apiFetchMock.mockResolvedValue(jsonResponse({ formulae: 2, entities: 0, relations: 1 }));

    await expect(getDiplomaticSummary()).resolves.toEqual({
      formulae: 2,
      entities: 0,
      relations: 1,
    });
    expect(apiFetchMock.mock.calls[0]![0]).toBe('/api/v1/diplomatic/summary/');
  });

  it('throws on a failure rather than reporting nothing approved', async () => {
    apiFetchMock.mockResolvedValue(jsonResponse({}, 502));

    await expect(getDiplomaticSummary()).rejects.toThrow('502');
  });
});
