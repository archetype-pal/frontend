import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultConfig, type SiteFeaturesConfig } from '@/lib/site-features';

const { readSiteFeatures } = vi.hoisted(() => ({ readSiteFeatures: vi.fn() }));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/site-features-server', () => ({ readSiteFeatures }));

import PublicationKindLayout from './layout';

let config: SiteFeaturesConfig;

const renderKind = (kind: string) =>
  PublicationKindLayout({ children: 'list', params: Promise.resolve({ kind }) });

beforeEach(() => {
  config = getDefaultConfig();
  readSiteFeatures.mockResolvedValue(config);
});

describe('/publications/[kind]', () => {
  it('404s a kind that does not exist', async () => {
    await expect(renderKind('press')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it("404s a kind whose section is off, by the section's own key", async () => {
    config.sections.featureArticles = false;
    await expect(renderKind('feature')).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(renderKind('news')).resolves.toBe('list');
  });

  it('renders a kind whose section is on', async () => {
    await expect(renderKind('blogs')).resolves.toBe('list');
  });
});
