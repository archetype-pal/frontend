import { beforeEach, describe, expect, it, vi } from 'vitest';

const authFetchMock = vi.fn();
const proxyFetchMock = vi.fn();

vi.mock('@/lib/api-fetch', () => ({
  authFetch: (...args: unknown[]) => authFetchMock(...args),
  proxyFetch: (...args: unknown[]) => proxyFetchMock(...args),
}));

import { createImageText, deleteImageText, updateImageText } from './image-texts';

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
      jsonResponse(201, { id: 9, item_image: 1, type: 'Transcription', content: '', status: 'Draft' })
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
