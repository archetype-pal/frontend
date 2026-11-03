/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getDefaultConfig } from '@/lib/site-features';
import { getDefaultModelLabelsConfig } from '@/lib/model-labels';

const { tabsMock, fetchAnnotationsMock } = vi.hoisted(() => ({
  tabsMock: vi.fn((_props: { counts: Record<string, number> }) => null),
  fetchAnnotationsMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('next-intl/server', () => ({ getLocale: async () => 'en' }));
vi.mock('@/lib/site-features-server', () => ({ readSiteFeatures: async () => getDefaultConfig() }));
vi.mock('@/lib/model-labels-server', () => ({
  readModelLabels: async () => getDefaultModelLabelsConfig(),
}));
vi.mock('@/components/manuscript/manuscript-tabs', () => ({ ManuscriptTabs: tabsMock }));
vi.mock('@/components/common/backoffice-link', () => ({ BackofficeLink: () => null }));
vi.mock('@/services/manuscripts', () => ({
  fetchManuscriptImage: async () => ({
    id: 9,
    item_part: 5,
    locus: 'fol. 1r',
    number_of_annotations: 12,
  }),
  fetchManuscript: async () => null,
}));
vi.mock('@/services/manuscript-image-tabs', () => ({ fetchOtherImages: async () => [{}, {}] }));
vi.mock('@/services/image-texts', () => ({ fetchImageTextsForImage: async () => [{}] }));
vi.mock('@/services/annotations', () => ({ fetchAnnotationsForImage: fetchAnnotationsMock }));

import ManuscriptImageLayout from './layout';

describe('manuscript image layout', () => {
  it("counts the Annotations tab from the image's own payload", async () => {
    render(
      await ManuscriptImageLayout({
        children: null,
        params: Promise.resolve({ id: '5', imageId: '9' }),
      })
    );

    expect(tabsMock.mock.calls[0][0].counts).toEqual({
      annotations: 12,
      texts: 1,
      otherImages: 2,
    });
    expect(fetchAnnotationsMock).not.toHaveBeenCalled();
  });
});
