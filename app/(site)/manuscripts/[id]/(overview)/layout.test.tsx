import { beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonResponse, textResponse } from '@/test/responses';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/api-fetch', () => ({ apiFetch }));

import ManuscriptLayout from './layout';

const renderPart = (id: string) =>
  ManuscriptLayout({ children: 'overview', params: Promise.resolve({ id }) });

beforeEach(() => {
  apiFetch.mockReset();
});

describe('/manuscripts/[id]', () => {
  it('404s a part the API does not have', async () => {
    apiFetch.mockResolvedValue(jsonResponse({ detail: 'Not found.' }, 404));
    await expect(renderPart('999999')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('renders a part the API has', async () => {
    apiFetch.mockResolvedValue(jsonResponse({ id: 5 }));
    await expect(renderPart('5')).resolves.toBe('overview');
  });

  it('leaves an API failure to the page, which reports it', async () => {
    apiFetch.mockResolvedValue(textResponse(503, 'Service Unavailable'));
    await expect(renderPart('5')).resolves.toBe('overview');
  });
});
