import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_IMAGE_ADJUSTMENTS,
  useViewerImageAdjustments,
} from './use-viewer-image-adjustments';

describe('useViewerImageAdjustments', () => {
  it('starts at 0° rotation and default adjustments', () => {
    const { result } = renderHook(() => useViewerImageAdjustments());
    expect(result.current.rotation).toBe(0);
    expect(result.current.adjustments).toEqual(DEFAULT_IMAGE_ADJUSTMENTS);
    expect(result.current.hasAdjustments).toBe(false);
    expect(result.current.hasChanges).toBe(false);
  });

  it('rotate(90) normalizes rotation modulo 360', () => {
    const { result } = renderHook(() => useViewerImageAdjustments());
    act(() => result.current.rotate(90));
    expect(result.current.rotation).toBe(90);
    act(() => result.current.rotate(300));
    expect(result.current.rotation).toBe(30); // 390 mod 360
  });

  it('rotate(-90) wraps negative correctly', () => {
    const { result } = renderHook(() => useViewerImageAdjustments());
    act(() => result.current.rotate(-90));
    expect(result.current.rotation).toBe(270);
  });

  it('setAdjustment flips hasAdjustments and hasChanges', () => {
    const { result } = renderHook(() => useViewerImageAdjustments());
    act(() => result.current.setAdjustment('brightness', 150));
    expect(result.current.adjustments.brightness).toBe(150);
    expect(result.current.hasAdjustments).toBe(true);
    expect(result.current.hasChanges).toBe(true);
  });

  it('hasChanges is true when only rotation is non-zero', () => {
    const { result } = renderHook(() => useViewerImageAdjustments());
    act(() => result.current.rotate(90));
    expect(result.current.hasAdjustments).toBe(false);
    expect(result.current.hasChanges).toBe(true);
  });

  it('reset() returns both rotation and adjustments to defaults', () => {
    const { result } = renderHook(() => useViewerImageAdjustments());
    act(() => {
      result.current.rotate(180);
      result.current.setAdjustment('brightness', 50);
      result.current.setAdjustment('saturation', 0);
    });
    expect(result.current.hasChanges).toBe(true);

    act(() => result.current.reset());
    expect(result.current.rotation).toBe(0);
    expect(result.current.adjustments).toEqual(DEFAULT_IMAGE_ADJUSTMENTS);
    expect(result.current.hasChanges).toBe(false);
  });

  it('action callbacks are stable across renders', () => {
    const { result, rerender } = renderHook(() => useViewerImageAdjustments());
    const firstRotate = result.current.rotate;
    const firstReset = result.current.reset;
    const firstSet = result.current.setAdjustment;
    rerender();
    expect(result.current.rotate).toBe(firstRotate);
    expect(result.current.reset).toBe(firstReset);
    expect(result.current.setAdjustment).toBe(firstSet);
  });
});
