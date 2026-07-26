/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Manuscript } from '@/types/manuscript';
import type { HandType } from '@/types/hands';
import { ManuscriptViewer } from './manuscript-viewer';

// The viewer only needs these for chrome around the section under test.
vi.mock('@/contexts/model-labels-context', () => ({
  useModelLabels: () => ({
    getLabel: (key: string) => key,
    getPluralLabel: (key: string) => key,
  }),
}));

vi.mock('@/components/common/backoffice-link', () => ({
  BackofficeLink: () => null,
}));

const MANUSCRIPT = {
  id: 7,
  display_label: 'NRS GD 55/1',
  historical_item: {
    type: 'Charter',
    format: 'Single sheet',
    date: 1150,
    date_display: '1150 × 1152',
    catalogue_numbers: [],
    descriptions: [],
  },
  current_item: {
    shelfmark: 'GD 55/1',
    repository: {
      name: 'National Records of Scotland',
      label: 'NRS',
      place: 'Edinburgh',
      url: '',
    },
  },
  msdesc_areas: [
    {
      area: 'history',
      content: '<history><provenance><p>Kelso Abbey.</p></provenance></history>',
    },
  ],
} as Manuscript;

function renderViewer(msDescEnabled: boolean, hands: HandType[] = []) {
  return render(
    <ManuscriptViewer
      manuscript={MANUSCRIPT}
      images={[]}
      hands={hands}
      msDescEnabled={msDescEnabled}
    />
  );
}

describe('ManuscriptViewer — Hands section', () => {
  const HANDS = [
    { id: 141, name: 'Main Hand', date: null, place: '' },
    { id: 142, name: 'Second Hand', date: '1150', place: 'Kelso' },
  ] as HandType[];

  it('lists each hand with a link to its page and advertises the anchor', () => {
    const { container } = renderViewer(false, HANDS);
    const section = container.querySelector('section#hands');
    expect(section).not.toBeNull();
    expect(section?.querySelector('a[href="/hands/141"]')?.textContent).toContain('Main Hand');
    expect(section?.querySelector('a[href="/hands/142"]')?.textContent).toContain('Second Hand');
    expect(container.querySelector('a[href="#hands"]')).not.toBeNull();
  });

  it('renders no Hands section when the manuscript has no hands', () => {
    const { container } = renderViewer(false, []);
    expect(container.querySelector('section#hands')).toBeNull();
    expect(container.querySelector('a[href="#hands"]')).toBeNull();
  });
});

describe('ManuscriptViewer — manuscriptDescriptions feature gate', () => {
  it('renders the msDesc section and its on-this-page anchor when the flag is on', () => {
    const { container } = renderViewer(true);
    expect(container.querySelector('section#msdesc')).not.toBeNull();
    expect(container.querySelector('a[href="#msdesc"]')).not.toBeNull();
    expect(container.textContent).toContain('Kelso Abbey.');
  });

  it('removes BOTH the section and its nav entry when the flag is off', () => {
    const { container } = renderViewer(false);
    expect(container.querySelector('section#msdesc')).toBeNull();
    expect(container.querySelector('a[href="#msdesc"]')).toBeNull();
  });

  it('leaks no description markup at all when the flag is off', () => {
    // Server-rendered page: hidden-but-present markup would still be in
    // view-source. The content must simply not be produced.
    const { container } = renderViewer(false);
    expect(container.textContent).not.toContain('Kelso Abbey.');
    expect(container.innerHTML).not.toContain('msdesc');
  });

  it('leaves the rest of the page alone when the flag is off', () => {
    const { container } = renderViewer(false);
    expect(container.querySelector('section#record')).not.toBeNull();
    expect(container.textContent).toContain('NRS GD 55/1');
  });
});
