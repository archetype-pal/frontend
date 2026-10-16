import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DensityControl, type ThumbDensity } from './thumb-density';

function Harness() {
  const [density, setDensity] = React.useState<ThumbDensity>('comfortable');
  return <DensityControl density={density} onChange={setDensity} />;
}

describe('DensityControl', () => {
  it('keeps only the chosen size in the tab order', () => {
    render(<Harness />);
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
  });

  it('moves to the next and previous size with the arrow keys, wrapping round', () => {
    render(<Harness />);
    const medium = screen.getByRole('radio', { name: 'M' });

    fireEvent.keyDown(medium, { key: 'ArrowRight' });
    const large = screen.getByRole('radio', { name: 'L' });
    expect(large.getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(large);

    fireEvent.keyDown(large, { key: 'ArrowRight' });
    expect(screen.getByRole('radio', { name: 'S' }).getAttribute('aria-checked')).toBe('true');

    fireEvent.keyDown(screen.getByRole('radio', { name: 'S' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('radio', { name: 'L' }).getAttribute('aria-checked')).toBe('true');
  });
});
