/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProposalCorrectionDialog } from './proposal-correction-dialog';
import {
  acceptAnnotationProposal,
  correctAnnotationProposal,
} from '@/services/backoffice/annotation-proposals';
import { getHands } from '@/services/backoffice/scribes';
import { fetchAllographSummaries } from '@/services/manuscripts';
import { renderWithQueryClient } from '@/test/render';
import type { AdminHandListItem, GraphProposalItem, PaginatedResponse } from '@/types/backoffice';
import { fetchIiifImageInfo } from '@/utils/iiif';

vi.mock('sonner', () => import('@/test/mocks/sonner'));
vi.mock('@/services/backoffice/annotation-proposals', () => ({
  acceptAnnotationProposal: vi.fn(),
  correctAnnotationProposal: vi.fn(),
}));
vi.mock('@/services/backoffice/scribes', () => ({ getHands: vi.fn() }));
vi.mock('@/services/manuscripts', () => ({ fetchAllographSummaries: vi.fn() }));
vi.mock('@/utils/iiif', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/iiif')>()),
  fetchIiifImageInfo: vi.fn(),
}));

// A 40×20 box whose lower edge is 200px above the foot of a 1000×2000 page.
function ring(left: number, lower: number, right: number, upper: number) {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [left, lower],
          [right, lower],
          [right, upper],
          [left, upper],
          [left, lower],
        ],
      ],
    },
  };
}

function proposal(fields: Partial<GraphProposalItem> = {}): GraphProposalItem {
  return {
    id: 12,
    item_image: 45,
    image_display: 'BL Cotton Ch. xviii.2',
    image_iiif: 'http://iiif.test/page/info.json',
    historical_item: 697,
    item_part: 81,
    annotation: ring(500, 200, 540, 220),
    allograph: 3,
    allograph_name: 'round s',
    hand: 9,
    hand_name: 'Main Hand',
    annotation_type: 'image',
    confidence: 0.71,
    ml_job: 1,
    model_name: 'letters on catmus-medieval',
    status: 'pending',
    reviewer: null,
    reviewer_username: '',
    reviewed: null,
    reason: '',
    accepted_graph: null,
    created: '2026-11-04T00:00:00Z',
    proposed: null,
    corrected_by: null,
    corrected_by_username: '',
    corrected: null,
    ...fields,
  };
}

function hands(...names: [number, string][]) {
  return {
    count: names.length,
    next: null,
    previous: null,
    results: names.map(([id, name]) => ({ id, name }) as AdminHandListItem),
  } as PaginatedResponse<AdminHandListItem>;
}

function open(item: GraphProposalItem, onCorrected = vi.fn()) {
  const onOpenChange = vi.fn();
  renderWithQueryClient(
    <ProposalCorrectionDialog
      proposal={item}
      open
      onOpenChange={onOpenChange}
      onCorrected={onCorrected}
    />
  );
  return { onOpenChange, onCorrected };
}

async function pick(label: string, option: string) {
  const picker = screen.getByRole('combobox', { name: label });
  await waitFor(() => expect(picker.hasAttribute('disabled')).toBe(false));
  fireEvent.click(picker);
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchIiifImageInfo).mockResolvedValue({ width: 1000, height: 2000 });
  vi.mocked(fetchAllographSummaries).mockResolvedValue([
    { id: 3, name: 'round s', character_name: 's' },
    { id: 4, name: 'long s', character_name: 's' },
  ]);
  vi.mocked(getHands).mockResolvedValue(hands([9, 'Main Hand'], [10, 'Second Hand']));
  vi.mocked(correctAnnotationProposal).mockResolvedValue(proposal());
  vi.mocked(acceptAnnotationProposal).mockResolvedValue({ status: 'accepted', graph_id: 5 });
});

describe('<ProposalCorrectionDialog>', () => {
  it('sends only what changed, and leaves the proposal in the queue', async () => {
    const { onOpenChange, onCorrected } = open(proposal());
    expect(button('Save correction').disabled).toBe(true);

    await pick('Allograph', 's, long s');
    fireEvent.click(button('Save correction'));

    await waitFor(() =>
      expect(correctAnnotationProposal).toHaveBeenCalledWith(12, { allograph: 4 })
    );
    expect(acceptAnnotationProposal).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Correction saved; the proposal is still pending');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onCorrected).toHaveBeenCalled();
  });

  it('offers only the hands of the page’s part', async () => {
    open(proposal());

    await waitFor(() => expect(getHands).toHaveBeenCalledWith({ item_part: 81, limit: 200 }));
  });

  it('sends a moved box as the platform stores it', async () => {
    open(proposal());

    const box = await screen.findByRole('group', { name: 'The proposed box' });
    fireEvent.keyDown(box, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(box, { key: 'ArrowDown', altKey: true });
    fireEvent.click(button('Save correction'));

    // Ten pixels right, and the lower edge a pixel lower: one pixel nearer the foot.
    await waitFor(() =>
      expect(correctAnnotationProposal).toHaveBeenCalledWith(12, {
        annotation: ring(510, 199, 550, 220),
      })
    );
  });

  it('corrects, then accepts, in one step', async () => {
    open(proposal());

    await pick('Hand', 'Second Hand');
    fireEvent.click(button('Correct and accept'));

    await waitFor(() => expect(acceptAnnotationProposal).toHaveBeenCalledWith(12));
    expect(correctAnnotationProposal).toHaveBeenCalledWith(12, { hand: 10 });
    expect(vi.mocked(correctAnnotationProposal).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(acceptAnnotationProposal).mock.invocationCallOrder[0]
    );
    expect(toast.success).toHaveBeenCalledWith('Corrected, and the annotation created');
  });

  it('refreshes the queue when the accept after a saved correction fails', async () => {
    vi.mocked(acceptAnnotationProposal).mockRejectedValue(new Error('409'));
    const { onOpenChange, onCorrected } = open(proposal());

    await pick('Hand', 'Second Hand');
    fireEvent.click(button('Correct and accept'));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(onCorrected).toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('cannot accept a letter with no hand when the part has none, and says why', async () => {
    vi.mocked(getHands).mockResolvedValue(hands());
    open(proposal({ hand: null, hand_name: null }));

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Hand' }).textContent).toBe(
        'No hand is recorded for this part'
      )
    );
    expect(button('Accept').disabled).toBe(true);
    expect(
      screen.getByText('No hand is recorded for this part. Add one before accepting.')
    ).toBeTruthy();
  });
});
