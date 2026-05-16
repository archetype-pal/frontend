import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useViewerChromeState } from './use-viewer-chrome-state';

function makeDrag() {
  return { reset: vi.fn() };
}

const baseOptions = () => ({
  filterPanelDrag: makeDrag(),
  settingsPanelDrag: makeDrag(),
  canUseSettings: true,
});

describe('useViewerChromeState', () => {
  it('starts with all panels closed and fullscreen off', () => {
    const { result } = renderHook(() => useViewerChromeState(baseOptions()));
    expect(result.current.isFullScreen).toBe(false);
    expect(result.current.isFilterPanelOpen).toBe(false);
    expect(result.current.isSettingsPanelOpen).toBe(false);
  });

  it('toggleFullScreen flips the flag', () => {
    const { result } = renderHook(() => useViewerChromeState(baseOptions()));
    act(() => result.current.toggleFullScreen());
    expect(result.current.isFullScreen).toBe(true);
    act(() => result.current.toggleFullScreen());
    expect(result.current.isFullScreen).toBe(false);
  });

  it('toggleFilterPanel opens, second call closes and resets drag', () => {
    const options = baseOptions();
    const { result } = renderHook(() => useViewerChromeState(options));

    act(() => result.current.toggleFilterPanel());
    expect(result.current.isFilterPanelOpen).toBe(true);
    expect(options.filterPanelDrag.reset).not.toHaveBeenCalled();

    act(() => result.current.toggleFilterPanel());
    expect(result.current.isFilterPanelOpen).toBe(false);
    expect(options.filterPanelDrag.reset).toHaveBeenCalledTimes(1);
  });

  it('toggleSettingsPanel is a no-op when canUseSettings is false', () => {
    const options = { ...baseOptions(), canUseSettings: false };
    const { result } = renderHook(() => useViewerChromeState(options));
    act(() => result.current.toggleSettingsPanel());
    expect(result.current.isSettingsPanelOpen).toBe(false);
    expect(options.settingsPanelDrag.reset).not.toHaveBeenCalled();
  });

  it('closeFilterPanel sets closed and resets the drag, even if already closed', () => {
    const options = baseOptions();
    const { result } = renderHook(() => useViewerChromeState(options));
    act(() => result.current.closeFilterPanel());
    expect(result.current.isFilterPanelOpen).toBe(false);
    expect(options.filterPanelDrag.reset).toHaveBeenCalledTimes(1);
  });

  it('closeAllPanels closes both panels and resets both drags', () => {
    const options = baseOptions();
    const { result } = renderHook(() => useViewerChromeState(options));
    act(() => {
      result.current.toggleFilterPanel();
      result.current.toggleSettingsPanel();
    });
    expect(result.current.isFilterPanelOpen).toBe(true);
    expect(result.current.isSettingsPanelOpen).toBe(true);

    act(() => result.current.closeAllPanels());
    expect(result.current.isFilterPanelOpen).toBe(false);
    expect(result.current.isSettingsPanelOpen).toBe(false);
    expect(options.filterPanelDrag.reset).toHaveBeenCalled();
    expect(options.settingsPanelDrag.reset).toHaveBeenCalled();
  });
});
