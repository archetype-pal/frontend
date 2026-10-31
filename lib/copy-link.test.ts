import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyLink } from './copy-link';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const MESSAGES = { copied: 'Link copied', failed: 'Could not copy' };

describe('copyLink', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('writes the url to the clipboard and confirms', async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { toast } = await import('sonner');

    await copyLink('https://example.test/w/1', MESSAGES);

    expect(writeText).toHaveBeenCalledWith('https://example.test/w/1');
    expect(toast.success).toHaveBeenCalledWith('Link copied');
  });

  it('puts the url in the failure toast when the clipboard refuses', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn(async () => Promise.reject(new Error('denied'))) },
    });
    const { toast } = await import('sonner');

    await copyLink('https://example.test/w/1', MESSAGES);

    expect(toast.error).toHaveBeenCalledWith('Could not copy', {
      description: 'https://example.test/w/1',
    });
  });
});
