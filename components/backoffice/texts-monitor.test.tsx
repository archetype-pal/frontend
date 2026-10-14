/** @vitest-environment jsdom */
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TextsOverview } from '@/services/texts-monitor';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams('view=recent'),
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ token: 'tok' }),
}));

const OVERVIEW: TextsOverview = {
  generated_at: '2026-10-12T00:00:00Z',
  matrix: {
    kinds: ['Transcription', 'Translation'],
    statuses: ['Draft', 'Review', 'Live', 'Reviewed'],
    by_kind: {
      Transcription: { Draft: 1, Review: 0, Live: 0, Reviewed: 0 },
      Translation: { Draft: 0, Review: 0, Live: 0, Reviewed: 0 },
    },
    empty_by_kind: { Transcription: 0, Translation: 0 },
    totals: { Transcription: 1, Translation: 0 },
  },
  coverage: {
    images_total: 1,
    with_transcription: 1,
    with_translation: 0,
    with_both: 0,
    with_either: 1,
    with_neither: 0,
  },
  languages: [],
  recent: [
    {
      id: 42,
      type: 'Transcription',
      status: 'Draft',
      language: 'la',
      modified: '2026-10-11T00:00:00Z',
      created: '2026-10-10T00:00:00Z',
      is_empty: false,
      char_count: 10,
      annotation_count: 0,
      item_image_id: 7,
      item_part_id: 3,
      locus: 'f. 1r',
      label: 'Charter of David I',
    },
  ],
  activity: [],
  annotation_activity: [],
  annotation_health: {
    image_texts_total: 1,
    image_texts_with_content: 1,
    annotations_total: 0,
    average_annotations_per_text: 0,
  },
};

vi.mock('@/services/texts-monitor', () => ({
  fetchTextsOverview: async () => OVERVIEW,
}));

import { TextsMonitor } from './texts-monitor';

describe('TextsMonitor recent edits', () => {
  it('opens a recent edit in the text editor when its row is clicked', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <TextsMonitor />
      </QueryClientProvider>
    );

    const label = await screen.findByText('Charter of David I');
    fireEvent.click(label.closest('tr')!);

    expect(pushMock).toHaveBeenCalledWith('/backoffice/image-texts/42');
  });
});
