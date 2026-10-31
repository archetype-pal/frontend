import { beforeEach, describe, expect, it, vi } from 'vitest';

const optionalAuthFetchMock = vi.fn();
const proxyFetchMock = vi.fn();

vi.mock('@/lib/api-fetch', () => ({
  optionalAuthFetch: (...args: unknown[]) => optionalAuthFetchMock(...args),
  proxyFetch: (...args: unknown[]) => proxyFetchMock(...args),
}));

import {
  createImageText,
  deleteImageText,
  formatTei,
  linkRegionToElement,
  unlinkElement,
  updateImageText,
  validateTei,
} from './image-texts';
import { jsonResponse } from '@/test/responses';

beforeEach(() => {
  optionalAuthFetchMock.mockReset();
  proxyFetchMock.mockReset();
});

describe('image-text write helpers', () => {
  it('PATCHes through the same-origin proxy', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse({ id: 7, content: 'ok' }, 200));

    await updateImageText(7, { content: 'ok' });

    expect(proxyFetchMock).toHaveBeenCalledWith('/api/v1/manuscripts/management/image-texts/7/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'ok' }),
    });
    expect(optionalAuthFetchMock).not.toHaveBeenCalled();
  });

  it('POSTs create requests through the same-origin proxy', async () => {
    proxyFetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          id: 9,
          item_image: 1,
          type: 'Transcription',
          content: '',
          status: 'Draft',
        },
        201
      )
    );

    await createImageText({ item_image: 1, type: 'Transcription' });

    expect(proxyFetchMock).toHaveBeenCalledWith('/api/v1/manuscripts/management/image-texts/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'Draft',
        content: '',
        language: '',
        item_image: 1,
        type: 'Transcription',
      }),
    });
    expect(optionalAuthFetchMock).not.toHaveBeenCalled();
  });

  it('DELETEs through the same-origin proxy', async () => {
    proxyFetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(deleteImageText(11)).resolves.toBeUndefined();

    expect(proxyFetchMock).toHaveBeenCalledWith('/api/v1/manuscripts/management/image-texts/11/', {
      method: 'DELETE',
    });
    expect(optionalAuthFetchMock).not.toHaveBeenCalled();
  });
});

describe('TEI tooling and region-link helpers', () => {
  const jsonPost = (body: unknown) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('validates TEI through the same-origin proxy', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse({ valid: true, errors: [] }, 200));

    await expect(validateTei('<p/>')).resolves.toEqual({ valid: true, errors: [] });

    expect(proxyFetchMock).toHaveBeenCalledWith(
      '/api/v1/manuscripts/image-texts/validate-tei/',
      jsonPost({ content: '<p/>' })
    );
    expect(optionalAuthFetchMock).not.toHaveBeenCalled();
  });

  it('formats TEI through the same-origin proxy', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse({ content: '<p>\n</p>' }, 200));

    await expect(formatTei('<p></p>')).resolves.toBe('<p>\n</p>');

    expect(proxyFetchMock).toHaveBeenCalledWith(
      '/api/v1/manuscripts/image-texts/format-tei/',
      jsonPost({ content: '<p></p>' })
    );
    expect(optionalAuthFetchMock).not.toHaveBeenCalled();
  });

  it('links a region through the same-origin proxy', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse({ graph_id: 5, content: 'x' }, 200));

    await linkRegionToElement(7, 3, undefined, 5);

    expect(proxyFetchMock).toHaveBeenCalledWith(
      '/api/v1/manuscripts/management/image-texts/7/link-region/',
      jsonPost({ element_index: 3, graph_id: 5 })
    );
    expect(optionalAuthFetchMock).not.toHaveBeenCalled();
  });

  it('unlinks an element through the same-origin proxy', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse({ content: 'x' }, 200));

    await unlinkElement(7, 3, 5);

    expect(proxyFetchMock).toHaveBeenCalledWith(
      '/api/v1/manuscripts/management/image-texts/7/unlink-element/',
      jsonPost({ element_index: 3, graph_id: 5 })
    );
    expect(optionalAuthFetchMock).not.toHaveBeenCalled();
  });
});
