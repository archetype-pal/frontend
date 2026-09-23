import { beforeEach, describe, expect, it, vi } from 'vitest';

const authFetchMock = vi.fn();
const proxyFetchMock = vi.fn();

vi.mock('@/lib/api-fetch', () => ({
  authFetch: (...args: unknown[]) => authFetchMock(...args),
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

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  authFetchMock.mockReset();
  proxyFetchMock.mockReset();
});

describe('image-text write helpers', () => {
  it('PATCHes through the same-origin proxy', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 7, content: 'ok' }));

    await updateImageText(7, { content: 'ok' });

    expect(proxyFetchMock).toHaveBeenCalledWith('/api/v1/manuscripts/management/image-texts/7/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'ok' }),
    });
    expect(authFetchMock).not.toHaveBeenCalled();
  });

  it('POSTs create requests through the same-origin proxy', async () => {
    proxyFetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        id: 9,
        item_image: 1,
        type: 'Transcription',
        content: '',
        status: 'Draft',
      })
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
    expect(authFetchMock).not.toHaveBeenCalled();
  });

  it('DELETEs through the same-origin proxy', async () => {
    proxyFetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(deleteImageText(11)).resolves.toBeUndefined();

    expect(proxyFetchMock).toHaveBeenCalledWith('/api/v1/manuscripts/management/image-texts/11/', {
      method: 'DELETE',
    });
    expect(authFetchMock).not.toHaveBeenCalled();
  });
});

describe('TEI tooling and region-link helpers', () => {
  const jsonPost = (body: unknown) => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('validates TEI through the same-origin proxy', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse(200, { valid: true, errors: [] }));

    await expect(validateTei('<p/>')).resolves.toEqual({ valid: true, errors: [] });

    expect(proxyFetchMock).toHaveBeenCalledWith(
      '/api/v1/manuscripts/image-texts/validate-tei/',
      jsonPost({ content: '<p/>' })
    );
    expect(authFetchMock).not.toHaveBeenCalled();
  });

  it('formats TEI through the same-origin proxy', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse(200, { content: '<p>\n</p>' }));

    await expect(formatTei('<p></p>')).resolves.toBe('<p>\n</p>');

    expect(proxyFetchMock).toHaveBeenCalledWith(
      '/api/v1/manuscripts/image-texts/format-tei/',
      jsonPost({ content: '<p></p>' })
    );
    expect(authFetchMock).not.toHaveBeenCalled();
  });

  it('links a region through the same-origin proxy', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse(200, { graph_id: 5, content: 'x' }));

    await linkRegionToElement(7, 3, undefined, 5);

    expect(proxyFetchMock).toHaveBeenCalledWith(
      '/api/v1/manuscripts/management/image-texts/7/link-region/',
      jsonPost({ element_index: 3, graph_id: 5 })
    );
    expect(authFetchMock).not.toHaveBeenCalled();
  });

  it('unlinks an element through the same-origin proxy', async () => {
    proxyFetchMock.mockResolvedValueOnce(jsonResponse(200, { content: 'x' }));

    await unlinkElement(7, 3, 5);

    expect(proxyFetchMock).toHaveBeenCalledWith(
      '/api/v1/manuscripts/management/image-texts/7/unlink-element/',
      jsonPost({ element_index: 3, graph_id: 5 })
    );
    expect(authFetchMock).not.toHaveBeenCalled();
  });
});
