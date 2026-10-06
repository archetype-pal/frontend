/** @vitest-environment jsdom */
import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/scroll-utils', () => ({
  smoothScrollToElement: vi.fn(),
}));

import { smoothScrollToElement } from '@/lib/scroll-utils';
import { DataPagination } from './data-pagination';

describe('DataPagination', () => {
  it('renders nothing when totalItems is 0', () => {
    const { container } = render(
      <DataPagination totalItems={0} page={1} pageSize={10} onPageChange={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders range text and no nav when there is only 1 page', () => {
    render(<DataPagination totalItems={5} page={1} pageSize={10} onPageChange={vi.fn()} />);

    expect(screen.getByText('1–5 of 5')).toBeDefined();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByLabelText('Go to page')).toBeNull();
  });

  it('renders page numbers, Prev, and Next for multiple pages without ellipses', () => {
    const onPageChange = vi.fn();
    render(<DataPagination totalItems={50} page={1} pageSize={10} onPageChange={onPageChange} />);

    expect(screen.getByText('1–10 of 50')).toBeDefined();
    const nav = screen.getByRole('navigation', { name: 'Pagination' });
    expect(nav).toBeDefined();

    const prevBtn = screen.getByRole('button', { name: 'Go to previous page' });
    const nextBtn = screen.getByRole('button', { name: 'Go to next page' });

    expect((prevBtn as HTMLButtonElement).disabled).toBe(true);
    expect((nextBtn as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);

    const page1Btn = screen.getByRole('button', { name: 'Page 1' });
    expect(page1Btn.getAttribute('aria-current')).toBe('page');

    const page3Btn = screen.getByRole('button', { name: 'Go to page 3' });
    fireEvent.click(page3Btn);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('disables Next on the last page', () => {
    const onPageChange = vi.fn();
    render(<DataPagination totalItems={50} page={5} pageSize={10} onPageChange={onPageChange} />);

    const prevBtn = screen.getByRole('button', { name: 'Go to previous page' });
    const nextBtn = screen.getByRole('button', { name: 'Go to next page' });

    expect((prevBtn as HTMLButtonElement).disabled).toBe(false);
    expect((nextBtn as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(prevBtn);
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('renders jump input when ellipses appear and clamps jump values', () => {
    const onPageChange = vi.fn();
    render(<DataPagination totalItems={487} page={5} pageSize={10} onPageChange={onPageChange} />);

    expect(screen.getByText('41–50 of 487')).toBeDefined();
    expect(screen.getByText('of 49')).toBeDefined();

    const jumpInput = screen.getByLabelText('Go to page') as HTMLInputElement;
    expect(jumpInput.value).toBe('5');

    fireEvent.change(jumpInput, { target: { value: '0' } });
    fireEvent.keyDown(jumpInput, { key: 'Enter' });
    expect(jumpInput.value).toBe('1');
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.change(jumpInput, { target: { value: '999' } });
    fireEvent.blur(jumpInput);
    expect(jumpInput.value).toBe('49');
    expect(onPageChange).toHaveBeenCalledWith(49);

    onPageChange.mockClear();
    fireEvent.change(jumpInput, { target: { value: '' } });
    fireEvent.blur(jumpInput);
    expect(jumpInput.value).toBe('5');
    expect(onPageChange).not.toHaveBeenCalled();

    fireEvent.change(jumpInput, { target: { value: '12' } });
    fireEvent.keyDown(jumpInput, { key: 'Escape' });
    expect(jumpInput.value).toBe('5');
  });

  it('hides page size selector when onPageSizeChange is omitted', () => {
    render(<DataPagination totalItems={50} page={1} pageSize={10} onPageChange={vi.fn()} />);

    expect(screen.queryByText('Rows per page')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('renders page size selector when onPageSizeChange is provided', () => {
    const onPageSizeChange = vi.fn();
    render(
      <DataPagination
        totalItems={100}
        page={1}
        pageSize={20}
        onPageChange={vi.fn()}
        onPageSizeChange={onPageSizeChange}
      />
    );

    expect(screen.getByText('Rows per page')).toBeDefined();
    const selectTrigger = screen.getByRole('combobox');
    expect(selectTrigger).toBeDefined();
  });

  it('renders default page size options [20, 50, 100]', () => {
    const onPageSizeChange = vi.fn();
    render(
      <DataPagination
        totalItems={500}
        page={1}
        pageSize={20}
        onPageChange={vi.fn()}
        onPageSizeChange={onPageSizeChange}
      />
    );

    const selectTrigger = screen.getByRole('combobox');
    fireEvent.keyDown(selectTrigger, { key: 'ArrowDown' });
    const options = screen.getAllByRole('option');
    expect(options.map((opt) => opt.textContent)).toEqual(['20', '50', '100']);
  });

  it('renders custom summary instead of default range text', () => {
    render(
      <DataPagination
        totalItems={100}
        page={1}
        pageSize={10}
        onPageChange={vi.fn()}
        summary={<span>3 of 100 selected</span>}
      />
    );

    expect(screen.getByText('3 of 100 selected')).toBeDefined();
    expect(screen.queryByText('1–10 of 100')).toBeNull();
  });

  it('scrolls up to the list it drives on page navigation', () => {
    vi.clearAllMocks();
    const list = document.createElement('div');
    render(
      <DataPagination
        totalItems={50}
        page={1}
        pageSize={10}
        onPageChange={vi.fn()}
        scrollTargetRef={{ current: list }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }));

    expect(smoothScrollToElement).toHaveBeenCalledTimes(1);
    expect(smoothScrollToElement).toHaveBeenCalledWith(list, { duration: 250 });
  });

  it('moves a page past the end back to the last page', () => {
    const onPageChange = vi.fn();
    render(<DataPagination totalItems={40} page={3} pageSize={20} onPageChange={onPageChange} />);

    expect(onPageChange).toHaveBeenCalledWith(2, { clamped: true });
  });

  it('leaves the page alone when only the page size changes', () => {
    const onPageChange = vi.fn();
    const { rerender } = render(
      <DataPagination totalItems={100} page={5} pageSize={20} onPageChange={onPageChange} />
    );
    rerender(
      <DataPagination totalItems={100} page={5} pageSize={100} onPageChange={onPageChange} />
    );

    expect(onPageChange).not.toHaveBeenCalled();
  });
});
