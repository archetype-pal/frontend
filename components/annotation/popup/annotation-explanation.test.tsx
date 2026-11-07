/** @vitest-environment jsdom */
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnnotationExplanation } from './annotation-explanation';
import { renderWithQueryClient } from '@/test/render';

const services = vi.hoisted(() => ({
  explainAnnotation: vi.fn(),
  getStoredExplanation: vi.fn(),
}));

vi.mock('@/services/glyph-assist', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/glyph-assist')>()),
  ...services,
}));

const { GlyphAssistError } = await import('@/services/glyph-assist');

const ANSWER = {
  id: 1,
  verdict: 'obvious',
  summary: 'A clear long s.',
  reasons: [],
  doubts: [],
  alternative: null,
  model_name: 'claude-opus-5-5',
};

describe('<AnnotationExplanation>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    services.getStoredExplanation.mockResolvedValue(null);
  });

  it('shows an answer already paid for without asking', async () => {
    services.getStoredExplanation.mockResolvedValue(ANSWER);

    renderWithQueryClient(<AnnotationExplanation graphId={7} hasLocalChanges={false} />);

    expect(await screen.findByText('A clear long s.')).not.toBeNull();
    expect(screen.queryByText(/about \$/)).toBeNull();
    expect(services.explainAnnotation).not.toHaveBeenCalled();
  });

  it('keeps a new answer when the tab is left and opened again', async () => {
    services.explainAnnotation.mockResolvedValue(ANSWER);
    const view = renderWithQueryClient(
      <AnnotationExplanation graphId={7} hasLocalChanges={false} />
    );
    const ask = await screen.findByRole('button', { name: /explain/i });
    await vi.waitFor(() => expect((ask as HTMLButtonElement).disabled).toBe(false));

    fireEvent.click(ask);
    expect(await screen.findByText('A clear long s.')).not.toBeNull();

    view.rerender(<QueryClientProvider client={view.client}>{null}</QueryClientProvider>);
    expect(screen.queryByText('A clear long s.')).toBeNull();
    services.getStoredExplanation.mockResolvedValue(ANSWER);
    view.rerender(
      <QueryClientProvider client={view.client}>
        <AnnotationExplanation graphId={7} hasLocalChanges={false} />
      </QueryClientProvider>
    );

    expect(await screen.findByText('A clear long s.')).not.toBeNull();
    expect(services.explainAnnotation).toHaveBeenCalledTimes(1);
  });

  it('words a refusal from the catalogue, not in the backend English', async () => {
    services.explainAnnotation.mockRejectedValue(
      new GlyphAssistError(429, 'The backend words', 'limit')
    );
    renderWithQueryClient(<AnnotationExplanation graphId={7} hasLocalChanges={false} />);
    const ask = await screen.findByRole('button', { name: /explain/i });
    await vi.waitFor(() => expect((ask as HTMLButtonElement).disabled).toBe(false));

    fireEvent.click(ask);

    expect(await screen.findByText(/reached its spending limit/)).not.toBeNull();
    expect(screen.queryByText('The backend words')).toBeNull();
  });
});
