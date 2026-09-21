import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GraphSelectionToolbar } from './graph-selection-toolbar';

describe('GraphSelectionToolbar', () => {
  it('renders the selected count badge and action buttons', () => {
    const onClear = vi.fn();
    const onSelectAll = vi.fn();
    const onEdit = vi.fn();

    render(
      <GraphSelectionToolbar
        selectedCount={5}
        pageCount={20}
        allOnPageSelected={false}
        onClearSelection={onClear}
        onSelectAllOnPage={onSelectAll}
        onUnselectAllOnPage={vi.fn()}
        onEditSelected={onEdit}
      />
    );

    expect(screen.getByText('5 selected')).toBeDefined();
    expect(screen.getByText(/Select all 20 on page/i)).toBeDefined();
    expect(screen.getByText('Edit selected')).toBeDefined();
    expect(screen.getByText('Clear')).toBeDefined();
  });

  it('triggers onClearSelection when Clear is clicked', () => {
    const onClear = vi.fn();
    render(
      <GraphSelectionToolbar
        selectedCount={3}
        pageCount={10}
        allOnPageSelected={false}
        onClearSelection={onClear}
        onSelectAllOnPage={vi.fn()}
        onUnselectAllOnPage={vi.fn()}
        onEditSelected={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Clear'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('triggers onSelectAllOnPage when Select all on page is clicked', () => {
    const onSelectAll = vi.fn();
    render(
      <GraphSelectionToolbar
        selectedCount={2}
        pageCount={50}
        allOnPageSelected={false}
        onClearSelection={vi.fn()}
        onSelectAllOnPage={onSelectAll}
        onUnselectAllOnPage={vi.fn()}
        onEditSelected={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText(/Select all 50 on page/i));
    expect(onSelectAll).toHaveBeenCalledTimes(1);
  });

  it('turns into an Unselect all button once every page item is already selected', () => {
    const onUnselectAll = vi.fn();
    render(
      <GraphSelectionToolbar
        selectedCount={50}
        pageCount={50}
        allOnPageSelected={true}
        onClearSelection={vi.fn()}
        onSelectAllOnPage={vi.fn()}
        onUnselectAllOnPage={onUnselectAll}
        onEditSelected={vi.fn()}
      />
    );

    // Anchored: "Unselect all 50 on page" contains "select all 50 on page" as a
    // substring, so an unanchored match would false-pass here.
    expect(screen.queryByRole('button', { name: /^Select all 50 on page/i })).toBeNull();
    const unselectBtn = screen.getByRole('button', { name: /Unselect all 50 on page/i });
    expect(unselectBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(unselectBtn);
    expect(onUnselectAll).toHaveBeenCalledTimes(1);
  });

  it('stays a Select-all button when selectedCount coincidentally equals pageCount across different pages', () => {
    // Regression test: 20 selected on page 1, then navigating to a fresh page 2
    // that also happens to have 20 items — selectedCount (20, cross-page) equals
    // pageCount (20, this page only) even though nothing on page 2 is selected.
    // Only allOnPageSelected (real membership, computed by the caller) should
    // decide which button renders, not a coincidental count match.
    render(
      <GraphSelectionToolbar
        selectedCount={20}
        pageCount={20}
        allOnPageSelected={false}
        onClearSelection={vi.fn()}
        onSelectAllOnPage={vi.fn()}
        onUnselectAllOnPage={vi.fn()}
        onEditSelected={vi.fn()}
      />
    );

    const selectAllBtn = screen.getByRole('button', { name: /Select all 20 on page/i });
    expect(selectAllBtn.hasAttribute('disabled')).toBe(false);
  });

  it('triggers onEditSelected when Edit selected is clicked', () => {
    const onEdit = vi.fn();
    render(
      <GraphSelectionToolbar
        selectedCount={2}
        pageCount={50}
        allOnPageSelected={false}
        onClearSelection={vi.fn()}
        onSelectAllOnPage={vi.fn()}
        onUnselectAllOnPage={vi.fn()}
        onEditSelected={onEdit}
      />
    );

    fireEvent.click(screen.getByText('Edit selected'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('disables the edit button when selectedCount is 0', () => {
    render(
      <GraphSelectionToolbar
        selectedCount={0}
        pageCount={50}
        allOnPageSelected={false}
        onClearSelection={vi.fn()}
        onSelectAllOnPage={vi.fn()}
        onUnselectAllOnPage={vi.fn()}
        onEditSelected={vi.fn()}
      />
    );

    const editBtn = screen.getByRole('button', { name: /Edit selected/i });
    expect(editBtn.hasAttribute('disabled')).toBe(true);
  });
});
