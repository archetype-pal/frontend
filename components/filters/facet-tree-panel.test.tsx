import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { FacetTreePanel } from './facet-tree-panel';

function mount(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe('FacetTreePanel readable labels', () => {
  it('lets grouped facet labels wrap instead of relying on hover-only truncation', () => {
    const component = 'DigiPal Allograph component with a long distinguishable label';
    const feature = 'Feature value with enough detail to need wrapping';
    const { container, cleanup } = mount(
      <FacetTreePanel
        id="component_features"
        title="Component features"
        items={[
          {
            label: `${component} - ${feature}`,
            value: `${component} - ${feature}`,
            count: 7,
            href: '',
          },
        ]}
        selectedValues={[]}
        onSelect={vi.fn()}
      />
    );

    const componentLabel = container.querySelector(`span[title="${component}"]`);
    const featureLabel = container.querySelector(`span[title="${feature}"]`);

    expect(componentLabel?.className).toContain('whitespace-normal');
    expect(componentLabel?.className).not.toContain('truncate');
    expect(featureLabel?.className).toContain('whitespace-normal');
    expect(featureLabel?.className).not.toContain('truncate');
    expect(container.innerHTML).not.toContain('w-12');

    cleanup();
  });
});
