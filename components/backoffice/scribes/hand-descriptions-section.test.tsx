/** @vitest-environment jsdom */
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HandDescription } from '@/types/backoffice';

const createHandDescriptionMock = vi.fn();
const deleteHandDescriptionMock = vi.fn();
vi.mock('@/services/backoffice/scribes', () => ({
  createHandDescription: (...args: unknown[]) => createHandDescriptionMock(...args),
  updateHandDescription: vi.fn(),
  deleteHandDescription: (...args: unknown[]) => deleteHandDescriptionMock(...args),
}));

vi.mock('@/services/backoffice/manuscripts', () => ({
  getSources: vi.fn().mockResolvedValue([]),
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

beforeEach(() => {
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
});
