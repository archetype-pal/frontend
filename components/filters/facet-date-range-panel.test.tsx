import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FacetDateRangePanel } from './facet-date-range-panel';

const RANGE: [number, number] = [1093, 1309];

function thumbValues() {
  return screen.getAllByRole('slider').map((thumb) => Number(thumb.getAttribute('aria-valuenow')));
}

function typeWindow(value: string) {
  fireEvent.change(screen.getByLabelText('Text Date range (min x max)'), { target: { value } });
}

function passDebounce() {
  act(() => {
    vi.advanceTimersByTime(300);
  });
}

describe('<FacetDateRangePanel>', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the track on its range while the thumbs sit on the applied window', () => {
    render(<FacetDateRangePanel range={RANGE} value={[1150, 1200]} defaultExpanded />);

    expect(thumbValues()).toEqual([1150, 1200]);
    expect(screen.getByText('1093')).toBeTruthy();
    expect(screen.getByText('1309')).toBeTruthy();
  });

  it('moves the thumbs back to the ends once the window is removed', () => {
    const { rerender } = render(
      <FacetDateRangePanel range={RANGE} value={[1150, 1200]} defaultExpanded />
    );
    expect(thumbValues()).toEqual([1150, 1200]);

    rerender(<FacetDateRangePanel range={RANGE} value={RANGE} defaultExpanded />);

    expect(thumbValues()).toEqual([1093, 1309]);
  });

  it('leaves the thumbs alone when its own submitted window comes back', () => {
    const onSearch = vi.fn();
    const { rerender } = render(
      <FacetDateRangePanel range={RANGE} value={[1100, 1250]} defaultExpanded onSearch={onSearch} />
    );
    expect(thumbValues()).toEqual([1100, 1250]);

    typeWindow('1150x1200');
    passDebounce();
    typeWindow('1160x1200');
    rerender(
      <FacetDateRangePanel range={RANGE} value={[1150, 1200]} defaultExpanded onSearch={onSearch} />
    );

    expect(thumbValues()).toEqual([1160, 1200]);
  });

  it('submits the same window again after it was removed', () => {
    const onSearch = vi.fn();
    const { rerender } = render(
      <FacetDateRangePanel range={RANGE} value={RANGE} defaultExpanded onSearch={onSearch} />
    );

    typeWindow('1150x1200');
    passDebounce();
    rerender(
      <FacetDateRangePanel range={RANGE} value={[1150, 1200]} defaultExpanded onSearch={onSearch} />
    );
    rerender(
      <FacetDateRangePanel range={RANGE} value={RANGE} defaultExpanded onSearch={onSearch} />
    );
    typeWindow('1150x1200');
    passDebounce();

    expect(onSearch).toHaveBeenCalledTimes(2);
  });

  it('names its toggle and fields after its title', () => {
    render(<FacetDateRangePanel title="Hand Date" range={RANGE} defaultExpanded />);

    expect(screen.getByRole('button', { name: 'Hand Date' })).toBeTruthy();
    expect(screen.getByLabelText('Hand Date range (min x max)')).toBeTruthy();
    expect(screen.getByLabelText('Hand Date year difference')).toBeTruthy();
  });
});
