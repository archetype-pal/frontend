import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchMapView } from './search-map-view';

describe('SearchMapView', () => {
  it('shows an empty state when no city has known coordinates', () => {
    const { container } = render(
      <SearchMapView cityDistribution={{ Atlantis: 3 }} onSelectCity={vi.fn()} />
    );

    expect(screen.getByText('No repository city data for this selection.')).toBeTruthy();
    expect(container.querySelector('.leaflet-container')).toBeNull();
  });

  it('draws one marker per known city, sized by count', () => {
    const { container } = render(
      <SearchMapView
        cityDistribution={{ Edinburgh: 10, Durham: 2, Atlantis: 5 }}
        onSelectCity={vi.fn()}
      />
    );

    const markers = container.querySelectorAll('.city-cluster-icon');
    expect([...markers].map((m) => m.textContent)).toEqual(['10', '2']);
  });

  it('filters to a city from the marker popup', () => {
    const onSelectCity = vi.fn();
    const { container } = render(
      <SearchMapView cityDistribution={{ London: 4 }} onSelectCity={onSelectCity} />
    );

    fireEvent.click(container.querySelector('.city-cluster-icon')!);
    fireEvent.click(screen.getByRole('button', { name: 'Filter to this city' }));

    expect(onSelectCity).toHaveBeenCalledWith('London');
  });

  it('updates markers when the distribution changes', () => {
    const { container, rerender } = render(
      <SearchMapView cityDistribution={{ London: 4 }} onSelectCity={vi.fn()} />
    );
    rerender(<SearchMapView cityDistribution={{ Durham: 7, London: 1 }} onSelectCity={vi.fn()} />);

    const markers = container.querySelectorAll('.city-cluster-icon');
    expect([...markers].map((m) => m.textContent)).toEqual(['7', '1']);
  });
});
