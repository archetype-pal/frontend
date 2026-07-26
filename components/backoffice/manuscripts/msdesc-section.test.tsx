/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SiteFeaturesProvider } from '@/contexts/site-features-context';
import { getDefaultConfig, type SiteFeaturesConfig } from '@/lib/site-features';
import type { ItemPartNested } from '@/types/backoffice';
import { MsDescSection } from './msdesc-section';

const PART = {
  id: 5,
  display_label: 'GD 55/1 (face)',
  msdesc_areas: [],
} as unknown as ItemPartNested;

function renderSection(itemParts: ItemPartNested[], config: SiteFeaturesConfig) {
  return render(
    <SiteFeaturesProvider initialConfig={config}>
      <MsDescSection historicalItemId={1} itemParts={itemParts} />
    </SiteFeaturesProvider>
  );
}

function configWith(manuscriptDescriptions: boolean): SiteFeaturesConfig {
  const config = getDefaultConfig();
  config.features.manuscriptDescriptions = manuscriptDescriptions;
  return config;
}

describe('backoffice MsDescSection — manuscriptDescriptions feature gate', () => {
  it('renders the editor section when the flag is on', () => {
    const { container } = renderSection([], configWith(true));
    expect(container.textContent).toContain('Structured description (TEI)');
  });

  it('renders nothing at all when the flag is off — heading included', () => {
    const { container } = renderSection([], configWith(false));
    expect(container.innerHTML).toBe('');
  });

  it('mounts no per-part editors when the flag is off', () => {
    // Gating here (rather than in manuscript-workspace.tsx) means the whole
    // subtree is skipped: no area tabs, no seed buttons, no queries.
    const { container } = renderSection([PART], configWith(false));
    expect(container.innerHTML).toBe('');
  });

  it('is enabled by default — the flag only hides on an explicit opt-out', () => {
    const { container } = renderSection([], getDefaultConfig());
    expect(container.textContent).toContain('Structured description (TEI)');
  });
});
