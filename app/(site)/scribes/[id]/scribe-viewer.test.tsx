/** @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SiteFeaturesProvider } from '@/contexts/site-features-context';
import { getDefaultConfig } from '@/lib/site-features';
import { ScribeViewer } from './scribe-viewer';

vi.mock('next/navigation', () => ({
  usePathname: () => '/scribes/1',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams('tab=hands'),
}));
vi.mock('@/components/common/backoffice-link', () => ({ BackofficeLink: () => null }));

describe('ScribeViewer Hands tab', () => {
  it("shows each hand's script, and a dash for a hand without one", () => {
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
