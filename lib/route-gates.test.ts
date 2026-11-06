import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultConfig, type SiteFeaturesConfig } from './site-features';

const { readSiteFeatures } = vi.hoisted(() => ({ readSiteFeatures: vi.fn() }));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('./site-features-server', () => ({ readSiteFeatures }));

import { requireFound, requireSection } from './route-gates';

let config: SiteFeaturesConfig;

beforeEach(() => {
  config = getDefaultConfig();
  readSiteFeatures.mockResolvedValue(config);
});

describe('requireSection', () => {
  it('404s a section switched off', async () => {
    config.sections.lightbox = false;
    await expect(requireSection('lightbox')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('lets a section through when it is on', async () => {
    await expect(requireSection('lightbox')).resolves.toBeUndefined();
  });

  it('lets a section through when the config does not mention it', async () => {
    delete (config.sections as Partial<SiteFeaturesConfig['sections']>).lightbox;
    await expect(requireSection('lightbox')).resolves.toBeUndefined();
  });
});

describe('requireFound', () => {
  it('404s a lookup that finds nothing', async () => {
    await expect(requireFound(Promise.resolve(null))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('lets a found record through', async () => {
    await expect(requireFound(Promise.resolve({ id: 1 }))).resolves.toBeUndefined();
  });

  it('leaves a failed lookup to the page instead of calling it missing', async () => {
    await expect(requireFound(Promise.reject(new Error('503')))).resolves.toBeUndefined();
  });
});
