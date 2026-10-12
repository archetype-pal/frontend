/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { downloadBlob } from './download';

describe('downloadBlob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('clicks an attached anchor for the blob, then cleans up', () => {
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    let attachedOnClick = false;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      attachedOnClick = document.body.querySelector('a[download="rows.csv"]') !== null;
    });

    const blob = new Blob(['a,b'], { type: 'text/csv' });
    downloadBlob('rows.csv', blob);

    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(anchor.href).toBe('blob:mock');
    expect(attachedOnClick).toBe(true);
    expect(document.body.contains(anchor)).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });
});
