/** @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ScribeSimilarHands } from '@/services/hand-similarity';
import type { ScribeDetail } from '@/types/scribe-detail';
import { SiteFeaturesProvider } from '@/contexts/site-features-context';
import { getDefaultConfig } from '@/lib/site-features';
import { ScribeViewer } from './scribe-viewer';

const nav = vi.hoisted(() => ({ search: '' }));

vi.mock('next/navigation', () => ({
  usePathname: () => '/scribes/1',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));

vi.mock('@/components/common/backoffice-link', () => ({
  BackofficeLink: () => null,
}));

const SCRIBE: ScribeDetail = { id: 1, name: 'Barrow, Scribe Ab', idiographs: [] };

const SIMILAR: ScribeSimilarHands = {
  scribe: 1,
  minimum_glyphs: 10,
  vectors: 'hog@48px-6cell-9bin-1',
  computed: '2026-11-05T00:00:00Z',
  hands: [
    {
      id: 40,
      name: 'Main Hand',
      item_part: 72,
      item_part_display_label: 'NRS GD55/53',
      compared: true,
      siblings: [],
    },
  ],
  results: [
    {
      hand: {
        id: 53,
        name: 'Main Hand',
        item_part: 90,
        item_part_display_label: 'NLS Adv. MS 15.1.18, no. 71',
        scribe: null,
        date: null,
        place: null,
      },
      similarity: 0.27,
      near: [{ hand: 40, rank: 3, similarity: 0.27 }],
    },
  ],
};

function renderWith(similarHands: ScribeSimilarHands | null) {
  return render(
    <SiteFeaturesProvider initialConfig={getDefaultConfig()}>
      <ScribeViewer scribe={SCRIBE} hands={[]} similarHands={similarHands} />
    </SiteFeaturesProvider>
  );
}

describe('ScribeViewer Similar hands tab (AI programme W1.3)', () => {
  it('opens on the hands near the scribe’s, linked to their pages', () => {
    nav.search = 'tab=similar';

    renderWith(SIMILAR);

    const tab = screen.getByRole('tab', { name: 'Similar hands' });
    expect(tab.getAttribute('aria-selected')).toBe('true');
    expect(
      screen.getByRole('link', { name: 'NLS Adv. MS 15.1.18, no. 71' }).getAttribute('href')
    ).toBe('/hands/53');
  });

  it.each([
    ['no matches', { ...SIMILAR, results: [], vectors: null, computed: null }],
    ['an API that could not say', null],
  ])('has no such tab with %s, and a link to it opens the information', (_, similarHands) => {
    nav.search = 'tab=similar';

    renderWith(similarHands);

    expect(screen.queryByRole('tab', { name: 'Similar hands' })).toBeNull();
    expect(screen.getByRole('tab', { name: 'Information' }).getAttribute('aria-selected')).toBe(
      'true'
    );
  });
});

describe('ScribeViewer Hands tab', () => {
  it("shows each hand's script, and a dash for a hand without one", () => {
    nav.search = 'tab=hands';

    render(
      <SiteFeaturesProvider initialConfig={getDefaultConfig()}>
        <ScribeViewer
          scribe={{ id: 1, name: 'Scribe' }}
          hands={[
            { id: 2, name: 'Main Hand (Latin)', item_part: 7, script: 'Caroline minuscule' },
            { id: 3, name: 'Main Hand', item_part: 7, script: null },
          ]}
        />
      </SiteFeaturesProvider>
    );

    const column = screen
      .getAllByRole('columnheader')
      .map((header) => header.textContent)
      .indexOf('Script');
    const scripts = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[column]?.textContent);

    expect(scripts).toEqual(['Caroline minuscule', '—']);
  });
});
