import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CompareToggleButton } from './compare-toggle-button';
import { useCompareStore } from '@/stores/compare-store';

const mockFeatures = vi.hoisted(() => ({ compareEnabled: true }));

vi.mock('@/contexts/site-features-context', () => ({
  useSiteFeatures: () => ({
    isSectionEnabled: (key: string) => (key === 'compare' ? mockFeatures.compareEnabled : true),
  }),
}));

const item = { itemPartId: 3, displayLabel: 'BL Cotton Ch. xviii.13' };

describe('CompareToggleButton', () => {
  beforeEach(() => {
    useCompareStore.setState({ items: [] });
    mockFeatures.compareEnabled = true;
  });

  it('stages and unstages the manuscript', () => {
    render(<CompareToggleButton item={item} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add to Compare' }));
    expect(useCompareStore.getState().isInCompare(3)).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Remove from Compare' }));
    expect(useCompareStore.getState().isInCompare(3)).toBe(false);
  });

  it('renders nothing when the Compare section is disabled', () => {
    mockFeatures.compareEnabled = false;
    const { container } = render(<CompareToggleButton item={item} />);
    expect(container.innerHTML).toBe('');
  });
});
