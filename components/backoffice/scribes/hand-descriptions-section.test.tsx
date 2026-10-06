/** @vitest-environment jsdom */
import * as React from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { backofficeKeys } from '@/lib/backoffice/query-keys';
import type { AdminHandListItem, HandDescription } from '@/types/backoffice';

const createHandDescriptionMock = vi.fn();
const deleteHandDescriptionMock = vi.fn();
const updateHandDescriptionMock = vi.fn();
const getSourcesMock = vi.fn().mockResolvedValue([{ id: 11, name: 'Ker 1957', label: 'Ker' }]);
vi.mock('@/services/backoffice/scribes', () => ({
  createHandDescription: (...args: unknown[]) => createHandDescriptionMock(...args),
  updateHandDescription: (...args: unknown[]) => updateHandDescriptionMock(...args),
  deleteHandDescription: (...args: unknown[]) => deleteHandDescriptionMock(...args),
}));

vi.mock('@/services/backoffice/manuscripts', () => ({
  getSources: () => getSourcesMock(),
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ token: 'token' }),
}));

// The real editor is TipTap behind next/dynamic; a textarea exercises the same
// `content` / `onChange` contract.
vi.mock('next/dynamic', () => ({
  default: () =>
    function RichTextEditorStub({
      content,
      onChange,
    }: {
      content: string;
      onChange: (html: string) => void;
    }) {
      return (
        <textarea aria-label="content" value={content} onChange={(e) => onChange(e.target.value)} />
      );
    },
}));

import { HandDescriptionsSection } from './hand-descriptions-section';

const DESCRIPTION: HandDescription = {
  id: 7,
  hand: 3,
  source: null,
  source_label: null,
  content: '<p>Original</p>',
};

function renderSection(onDirtyChange = vi.fn(), descriptions = [DESCRIPTION]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <HandDescriptionsSection
        handId={3}
        descriptions={descriptions}
        onDirtyChange={onDirtyChange}
      />
    </QueryClientProvider>
  );
  return { onDirtyChange };
}

/** Renders the section from the cached hand, as the hand page does. */
function renderFromCache() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const key = backofficeKeys.hands.detail(3);
  client.setQueryData(key, { id: 3, descriptions: [DESCRIPTION] } as AdminHandListItem);
  // Keep the refetch from replacing the optimistic value during the test.
  client.setQueryDefaults(key, { queryFn: () => new Promise(() => {}), staleTime: Infinity });
  function FromCache() {
    const { data } = useQuery<AdminHandListItem>({ queryKey: key });
    return <HandDescriptionsSection handId={3} descriptions={data?.descriptions ?? []} />;
  }
  render(
    <QueryClientProvider client={client}>
      <FromCache />
    </QueryClientProvider>
  );
}

async function pickSource(name: string) {
  const trigger = screen.getByRole('combobox');
  // Radix opens on keyboard in jsdom (its pointer path needs pointer capture).
  fireEvent.keyDown(trigger, { key: 'Enter' });
  fireEvent.click(await screen.findByRole('option', { name }));
}

beforeEach(() => {
  updateHandDescriptionMock.mockReset();
  createHandDescriptionMock.mockReset();
  createHandDescriptionMock.mockResolvedValue({});
  deleteHandDescriptionMock.mockReset();
  deleteHandDescriptionMock.mockResolvedValue(undefined);
});

describe('HandDescriptionsSection', () => {
  it('asks for confirmation before deleting a description', async () => {
    renderSection();

    fireEvent.click(screen.getByRole('button', { name: 'Delete description' }));
    expect(deleteHandDescriptionMock).not.toHaveBeenCalled();
    expect(screen.getByText('Delete this description?')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteHandDescriptionMock).toHaveBeenCalledWith(7));
  });

  it('reports unsaved content edits, and clears them on cancel', () => {
    const { onDirtyChange } = renderSection();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);

    fireEvent.change(screen.getByLabelText('content'), { target: { value: '<p>Edited</p>' } });
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByText('Unsaved')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByText('Unsaved')).toBeNull();
  });

  it('opens a local draft on Add and creates it only on Save, with content', async () => {
    const { onDirtyChange } = renderSection(vi.fn(), []);

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(createHandDescriptionMock).not.toHaveBeenCalled();

    const save = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
    // The editor's empty document is not content.
    fireEvent.change(screen.getByLabelText('content'), { target: { value: '<p></p>' } });
    expect(save.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('content'), { target: { value: '<p>Text</p>' } });
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    expect(save.disabled).toBe(false);

    fireEvent.click(save);
    await waitFor(() =>
      expect(createHandDescriptionMock).toHaveBeenCalledWith({
        hand: 3,
        source: null,
        content: '<p>Text</p>',
      })
    );
  });

  it('discards a draft on Cancel without calling the API', () => {
    const { onDirtyChange } = renderSection(vi.fn(), []);

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.change(screen.getByLabelText('content'), { target: { value: '<p>Text</p>' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByLabelText('content')).toBeNull();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    expect(createHandDescriptionMock).not.toHaveBeenCalled();
  });

  it('shows a new source at once, and rolls it back if the update fails', async () => {
    let reject: (err: Error) => void = () => {};
    updateHandDescriptionMock.mockReturnValue(
      new Promise((_, r) => {
        reject = r;
      })
    );
    renderFromCache();
    // The source list loads asynchronously.
    await waitFor(() => expect(getSourcesMock).toHaveBeenCalled());

    await pickSource('Ker 1957');
    await waitFor(() => expect(screen.getByRole('combobox').textContent).toBe('Ker 1957'));
    expect(updateHandDescriptionMock).toHaveBeenCalledWith(7, { source: 11 });

    reject(new Error('boom'));
    await waitFor(() => expect(screen.getByRole('combobox').textContent).toBe('No source'));
  });
});
