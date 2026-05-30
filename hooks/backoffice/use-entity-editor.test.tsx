import * as React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ token: 'tok' }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from 'sonner';
import { useEntityEditor } from './use-entity-editor';

type Detail = { id: number; name: string; note: string };
type Form = { name: string; note: string };

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function setup(overrides: Record<string, unknown> = {}) {
  const fetchFn = vi.fn(async (): Promise<Detail> => ({ id: 1, name: 'Alpha', note: 'hi' }));
  const saveFn = vi.fn(async () => ({}));
  const deleteFn = vi.fn(async () => {});
  const config = {
    id: 1,
    queryKey: ['entity', 1],
    invalidateKeys: [
      ['entity', 1],
      ['entity', 'all'],
    ],
    fetchFn,
    saveFn,
    deleteFn,
    toForm: (e: Detail): Form => ({ name: e.name, note: e.note }),
    listRoute: '/backoffice/entities',
    label: 'Entity',
    ...overrides,
  };
  const rendered = renderHook(() => useEntityEditor<Detail, Form>(config), { wrapper });
  return { ...rendered, fetchFn, saveFn, deleteFn };
}

describe('useEntityEditor', () => {
  beforeEach(() => {
    push.mockClear();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
  });

  it('mirrors the fetched entity into form (dirty=false)', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.form).not.toBeNull());
    expect(result.current.form).toEqual({ name: 'Alpha', note: 'hi' });
    expect(result.current.dirty).toBe(false);
  });

  it('setForm patches the form and marks dirty', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.form).not.toBeNull());
    act(() => result.current.setForm({ name: 'Beta' }));
    expect(result.current.form).toEqual({ name: 'Beta', note: 'hi' });
    expect(result.current.dirty).toBe(true);
  });

  it('save() calls saveFn with the current form, resets dirty, toasts success', async () => {
    const { result, saveFn } = setup();
    await waitFor(() => expect(result.current.form).not.toBeNull());
    act(() => result.current.setForm({ name: 'Beta' }));
    act(() => result.current.save());
    await waitFor(() =>
      expect(saveFn).toHaveBeenCalledWith('tok', 1, { name: 'Beta', note: 'hi' })
    );
    await waitFor(() => expect(result.current.dirty).toBe(false));
    expect(toast.success).toHaveBeenCalledWith('Entity saved');
  });

  it('remove() calls deleteFn and navigates to listRoute', async () => {
    const { result, deleteFn } = setup();
    await waitFor(() => expect(result.current.form).not.toBeNull());
    act(() => result.current.remove());
    await waitFor(() => expect(deleteFn).toHaveBeenCalledWith('tok', 1));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/backoffice/entities'));
  });

  it('exposes isError (form stays null) when the fetch fails', async () => {
    const { result } = setup({
      fetchFn: vi.fn(async () => {
        throw new Error('boom');
      }),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.form).toBeNull();
  });
});
