import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MiradorViewer } from './mirador-viewer';

const mocks = vi.hoisted(() => ({
  unmount: vi.fn(),
  viewer: vi.fn(),
}));

vi.mock('mirador', () => ({
  default: { viewer: mocks.viewer },
}));

describe('MiradorViewer', () => {
  beforeEach(() => {
    mocks.viewer.mockReset().mockImplementation(() => ({ store: {}, unmount: mocks.unmount }));
    mocks.unmount.mockReset();
  });

  it('boots Mirador into its container with one window per manifest', async () => {
    const { container } = render(
      <MiradorViewer manifestUrls={['https://a/manifest', 'https://b/manifest']} language="fr" />
    );

    await waitFor(() => expect(mocks.viewer).toHaveBeenCalledTimes(1));
    const config = mocks.viewer.mock.calls[0][0];
    expect(container.querySelector(`#${config.id}`)).not.toBeNull();
    expect(config.language).toBe('fr');
    expect(config.windows).toEqual([
      { manifestId: 'https://a/manifest' },
      { manifestId: 'https://b/manifest' },
    ]);
  });

  it('unmounts the Mirador root when the component unmounts', async () => {
    const { unmount } = render(<MiradorViewer manifestUrls={['https://a/manifest']} />);
    await waitFor(() => expect(mocks.viewer).toHaveBeenCalledTimes(1));

    unmount();

    expect(mocks.unmount).toHaveBeenCalledTimes(1);
  });

  it('tears down the old instance before rebooting on a manifest change', async () => {
    const { rerender } = render(<MiradorViewer manifestUrls={['https://a/manifest']} />);
    await waitFor(() => expect(mocks.viewer).toHaveBeenCalledTimes(1));

    // Same contents, new array: no reboot.
    rerender(<MiradorViewer manifestUrls={['https://a/manifest']} />);
    expect(mocks.unmount).not.toHaveBeenCalled();

    rerender(<MiradorViewer manifestUrls={['https://a/manifest', 'https://b/manifest']} />);
    await waitFor(() => expect(mocks.viewer).toHaveBeenCalledTimes(2));
    expect(mocks.unmount).toHaveBeenCalledTimes(1);
    expect(mocks.unmount.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.viewer.mock.invocationCallOrder[1]
    );
  });
});
