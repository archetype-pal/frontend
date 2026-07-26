/** @vitest-environment jsdom */
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const searchScribesMock = vi.fn();
vi.mock('@/services/tei-ref-search', () => ({
  searchScribes: (...args: unknown[]) => searchScribesMock(...args),
  searchItemParts: vi.fn().mockResolvedValue([]),
  searchPlaces: vi.fn().mockResolvedValue([]),
}));

import { TeiRefPicker } from './tei-ref-picker';

/**
 * Regression cover for the picker's transient state. The dialog is opened from
 * forms that re-render on their own schedule (the msDesc area panel's debounced
 * `validate-tei` resolving re-renders every field), and `kinds` is passed as an
 * inline array literal — so anything keyed on that array's identity re-fires on
 * every parent render.
 */

function Harness({ personOnly = false }: { personOnly?: boolean }) {
  const [, force] = React.useState(0);
  const client = React.useMemo(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    []
  );
  return (
    <QueryClientProvider client={client}>
      <button type="button" onClick={() => force((n) => n + 1)}>
        force-parent-render
      </button>
      <TeiRefPicker
        open
        onOpenChange={() => {}}
        onPick={() => {}}
        // Deliberately built INSIDE the render, exactly as ms-key-field.tsx used
        // to: a fresh array identity on every parent render.
        kinds={personOnly ? ['person'] : undefined}
      />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  searchScribesMock.mockReset();
  searchScribesMock.mockResolvedValue([]);
});

describe('TeiRefPicker — transient state survives parent re-renders', () => {
  it('keeps the typed query when the parent re-renders', () => {
    render(<Harness personOnly />);
    const input = screen.getByPlaceholderText('Search scribes…') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'john' } });
    expect(input.value).toBe('john');

    act(() => {
      fireEvent.click(screen.getByText('force-parent-render'));
    });
    expect((screen.getByPlaceholderText('Search scribes…') as HTMLInputElement).value).toBe('john');
  });

  it('keeps the active tab when the parent re-renders', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('radio', { name: 'Manuscript' }));
    expect(screen.getByPlaceholderText('Search manuscripts…')).toBeTruthy();

    act(() => {
      fireEvent.click(screen.getByText('force-parent-render'));
    });
    expect(screen.getByPlaceholderText('Search manuscripts…')).toBeTruthy();
  });

  it('restricts the tabs to the requested kinds', () => {
    render(<Harness personOnly />);
    // A single tab renders no segmented control at all.
    expect(screen.queryByRole('radio', { name: 'Place' })).toBeNull();
    expect(screen.getByPlaceholderText('Search scribes…')).toBeTruthy();
  });

  it('seeds the query from the selection', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <TeiRefPicker
          open
          onOpenChange={() => {}}
          onPick={() => {}}
          kinds={['person']}
          seedText="Kelso"
        />
      </QueryClientProvider>
    );
    expect((screen.getByPlaceholderText('Search scribes…') as HTMLInputElement).value).toBe(
      'Kelso'
    );
  });
});
