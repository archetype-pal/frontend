/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AnnotationProposalsPage from './page';
import { renderWithQueryClient } from '@/test/render';
import type { GraphProposalItem } from '@/types/backoffice';

const {
  getAnnotationProposals,
  acceptAnnotationProposal,
  rejectAnnotationProposal,
  routerReplace,
  urlParams,
} = vi.hoisted(() => ({
  getAnnotationProposals: vi.fn(),
  acceptAnnotationProposal: vi.fn(),
  rejectAnnotationProposal: vi.fn(),
  routerReplace: vi.fn(),
  urlParams: { current: new URLSearchParams() },
}));

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: routerReplace }),
  useSearchParams: () => urlParams.current,
}));
vi.mock('sonner', () => import('@/test/mocks/sonner'));
vi.mock('@/services/manuscripts', () => ({
  fetchAllographSummaries: () =>
    Promise.resolve([
      { id: 3, name: 'b', character_name: 'b' },
      { id: 4, name: 'long s', character_name: 's' },
    ]),
}));
vi.mock('@/services/backoffice/annotation-proposals', () => ({
  getAnnotationProposals,
  acceptAnnotationProposal,
  rejectAnnotationProposal,
}));
// The crop needs the image server; its geometry has its own tests.
vi.mock('@/components/backoffice/annotation-proposals/proposal-crop-view', () => ({
  ProposalCropView: ({ label }: { label: string }) => <div>{label}</div>,
}));

function proposal(id: number, overrides: Partial<GraphProposalItem> = {}): GraphProposalItem {
  return {
    id,
    item_image: 45,
    image_display: 'BL Cotton Ch. xviii.2 (locus: face)',
    image_iiif: 'http://iiif.test/page/info.json',
    historical_item: 697,
    item_part: 81,
    annotation: {},
    allograph: 3,
    allograph_name: 'b',
    hand: 9,
    hand_name: 'Main Hand',
    annotation_type: 'image',
    confidence: 0.71,
    ml_job: 1,
    model_name: 'google/gemini-3-pro',
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
    ...overrides,
  };
}

const page = (results: GraphProposalItem[]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

const row = (id: number) =>
  screen.getByRole('checkbox', { name: `Select proposal ${id}` }).closest('li') as HTMLElement;

const renderPage = () => renderWithQueryClient(<AnnotationProposalsPage />);

describe('<AnnotationProposalsPage>', () => {
  beforeEach(() => {
    urlParams.current = new URLSearchParams();
    routerReplace.mockReset();
    getAnnotationProposals.mockReset();
    acceptAnnotationProposal.mockReset().mockResolvedValue({ status: 'accepted', graph_id: 1 });
    rejectAnnotationProposal.mockReset().mockResolvedValue({ status: 'rejected' });
  });

  it('opens on the pending proposals, each naming its letter, hand, page and model', async () => {
    getAnnotationProposals.mockResolvedValue(page([proposal(1)]));
    renderPage();

    expect(await screen.findByText('Hand: Main Hand')).not.toBeNull();
    expect(getAnnotationProposals).toHaveBeenCalledWith({
      status: 'pending',
      limit: 20,
      offset: 0,
    });
    expect(screen.getByText('71% confidence')).not.toBeNull();
    expect(screen.getByText(/Proposed by google\/gemini-3-pro/)).not.toBeNull();
    const link = screen.getByRole('link', { name: /BL Cotton Ch\. xviii\.2/ });
    expect(link.getAttribute('href')).toBe('/manuscripts/697/images/45');
  });

  it('says who corrected a proposal and what the model had proposed', async () => {
    getAnnotationProposals.mockResolvedValue(
      page([
        proposal(1, {
          proposed: { annotation: { type: 'Feature' }, allograph: 4, hand: 9 },
          corrected_by: 2,
          corrected_by_username: 'ahmed',
          corrected: '2026-11-05T00:00:00Z',
        }),
      ])
    );
    renderPage();

    expect(
      await screen.findByText(/Corrected by ahmed · the model proposed s, long s · box redrawn/)
    ).not.toBeNull();
  });

  it("shows one request's proposals when the link names its job, and can show every request's", async () => {
    urlParams.current = new URLSearchParams('ml_job=31&from=viewer');
    getAnnotationProposals.mockResolvedValue(page([proposal(1, { ml_job: 31 })]));
    renderPage();

    expect(await screen.findByText('From request #31')).not.toBeNull();
    expect(getAnnotationProposals).toHaveBeenCalledWith({
      status: 'pending',
      limit: 20,
      offset: 0,
      ml_job: 31,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Show the proposals from every request' }));

    expect(routerReplace).toHaveBeenCalledWith('?from=viewer', { scroll: false });
  });

  it('clears the request filter to a bare query string when it was the only one', async () => {
    urlParams.current = new URLSearchParams('ml_job=31');
    getAnnotationProposals.mockResolvedValue(page([proposal(1, { ml_job: 31 })]));
    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Show the proposals from every request' })
    );

    expect(routerReplace).toHaveBeenCalledWith('?', { scroll: false });
  });

  it('ignores a request filter that is not a job number', async () => {
    urlParams.current = new URLSearchParams('ml_job=latest');
    getAnnotationProposals.mockResolvedValue(page([proposal(1)]));
    renderPage();

    await screen.findByText('Hand: Main Hand');
    expect(getAnnotationProposals).toHaveBeenCalledWith({
      status: 'pending',
      limit: 20,
      offset: 0,
    });
    expect(screen.queryByText(/From request/)).toBeNull();
    expect(document.body.textContent).not.toContain('NaN');
  });

  it('clearing the request filter goes back to the first page, with nothing selected', async () => {
    urlParams.current = new URLSearchParams('ml_job=31');
    getAnnotationProposals.mockImplementation(async ({ offset }: { offset: number }) => ({
      ...page([proposal(offset + 1, { ml_job: 31 })]),
      count: 45,
    }));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Go to page 2' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select proposal 21' }));
    expect(screen.getByText('1 selected')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show the proposals from every request' }));

    await waitFor(() =>
      expect(getAnnotationProposals).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 0 })
      )
    );
    expect(screen.queryByText('1 selected')).toBeNull();
  });

  it('will not offer Accept on a proposal with no hand, and says why', async () => {
    getAnnotationProposals.mockResolvedValue(page([proposal(1, { hand: null, hand_name: null })]));
    renderPage();

    await screen.findByText('No hand recorded');
    const accept = within(row(1)).getByRole('button', { name: 'Accept' });
    expect(accept.hasAttribute('disabled')).toBe(true);
    expect(
      screen.getByText('No hand is recorded for this part. Add one before accepting.')
    ).not.toBeNull();
  });

  it('accepts a proposal and reloads the queue', async () => {
    getAnnotationProposals.mockResolvedValue(page([proposal(1)]));
    renderPage();
    await screen.findByText('Hand: Main Hand');

    fireEvent.click(within(row(1)).getByRole('button', { name: 'Accept' }));

    await waitFor(() => expect(acceptAnnotationProposal).toHaveBeenCalledWith(1));
    await waitFor(() => expect(getAnnotationProposals).toHaveBeenCalledTimes(2));
  });

  it('rejects with the reason typed beside the button', async () => {
    getAnnotationProposals.mockResolvedValue(page([proposal(1)]));
    renderPage();
    await screen.findByText('Hand: Main Hand');

    fireEvent.change(screen.getByRole('textbox', { name: 'Reason for rejecting proposal 1' }), {
      target: { value: '  box is off the letter ' },
    });
    fireEvent.click(within(row(1)).getByRole('button', { name: 'Reject' }));

    await waitFor(() =>
      expect(rejectAnnotationProposal).toHaveBeenCalledWith(1, 'box is off the letter')
    );
  });

  it('bulk-accepts only the selected proposals that can be accepted', async () => {
    getAnnotationProposals.mockResolvedValue(
      page([proposal(1), proposal(2, { hand: null, hand_name: null }), proposal(3)])
    );
    renderPage();
    await screen.findAllByText('Hand: Main Hand');

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Select every pending proposal on this page' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Accept 2' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(/1 selected proposal lacks a hand or an allograph/)
    ).not.toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Accept' }));

    await waitFor(() => expect(acceptAnnotationProposal).toHaveBeenCalledTimes(2));
    expect(acceptAnnotationProposal.mock.calls.map(([id]) => id).sort()).toEqual([1, 3]);
  });

  it('shows decided proposals with who decided them, and offers no actions', async () => {
    getAnnotationProposals.mockImplementation(async ({ status }: { status: string }) =>
      status === 'rejected'
        ? page([
            proposal(4, {
              status: 'rejected',
              reviewer_username: 'luca',
              reviewed: '2026-11-04T00:00:00Z',
              reason: 'spurious',
            }),
          ])
        : page([])
    );
    renderPage();
    await screen.findByText('No proposals are waiting for review.');

    fireEvent.click(screen.getByRole('radio', { name: 'Rejected' }));

    expect(await screen.findByText(/Rejected by luca/)).not.toBeNull();
    expect(screen.getByText(/spurious/)).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
    expect(getAnnotationProposals).toHaveBeenLastCalledWith({
      status: 'rejected',
      limit: 20,
      offset: 0,
    });
  });

  it('says so when the queue cannot be loaded, instead of showing it empty', async () => {
    getAnnotationProposals.mockRejectedValue(new Error('403'));
    renderPage();

    expect(await screen.findByText('Failed to load the proposals.')).not.toBeNull();
    expect(screen.queryByText('No proposals are waiting for review.')).toBeNull();
  });
});
