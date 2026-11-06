/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getDefaultConfig } from '@/lib/site-features';
import { getDefaultModelLabelsConfig } from '@/lib/model-labels';
import type { ManuscriptImage } from '@/types/manuscript-image';

const { tabsMock, fetchAnnotationsMock } = vi.hoisted(() => ({
  tabsMock: vi.fn((_props: { counts: Record<string, number> }) => null),
  fetchAnnotationsMock: vi.fn(),
}));

vi.mock('next-intl/server', () => ({ getLocale: async () => 'en' }));
vi.mock('@/lib/site-features-server', () => ({ readSiteFeatures: async () => getDefaultConfig() }));
vi.mock('@/lib/model-labels-server', () => ({
  readModelLabels: async () => getDefaultModelLabelsConfig(),
}));
vi.mock('@/components/manuscript/manuscript-tabs', () => ({ ManuscriptTabs: tabsMock }));
vi.mock('@/components/common/backoffice-link', () => ({ BackofficeLink: () => null }));
vi.mock('@/services/manuscripts', () => ({ fetchManuscript: async () => null }));
vi.mock('@/services/manuscript-image-tabs', () => ({ fetchOtherImages: async () => [{}, {}] }));
vi.mock('@/services/image-texts', () => ({ fetchImageTextsForImage: async () => [{}] }));
vi.mock('@/services/annotations', () => ({ fetchAnnotationsForImage: fetchAnnotationsMock }));

import { ImageHeader } from './image-header';

describe('manuscript image header', () => {
  it("counts the Annotations tab from the image's own payload", async () => {
    const image = {
      id: 9,
      item_part: 5,
      locus: 'fol. 1r',
      number_of_annotations: 12,
    } as ManuscriptImage;

    render(await ImageHeader({ id: '5', imageId: '9', image }));

    expect(tabsMock.mock.calls[0][0].counts).toEqual({
      annotations: 12,
      texts: 1,
      otherImages: 2,
    });
    expect(fetchAnnotationsMock).not.toHaveBeenCalled();
  });
});
