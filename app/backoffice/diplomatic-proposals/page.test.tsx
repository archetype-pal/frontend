/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DiplomaticProposalsPage from './page';
import { renderWithQueryClient } from '@/test/render';
import { BackofficeApiError } from '@/services/backoffice/api-client';
import type { DiplomaticProposalItem } from '@/types/backoffice';

const services = vi.hoisted(() => ({
  getDiplomaticProposals: vi.fn(),
  getDiplomaticProposal: vi.fn(),
  getDiplomaticProposalDepth: vi.fn(),
  acceptDiplomaticProposal: vi.fn(),
  rejectDiplomaticProposal: vi.fn(),
}));

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('sonner', () => import('@/test/mocks/sonner'));
vi.mock('@/services/backoffice/diplomatic-proposals', () => services);

const CHARTER =
  'Omnibus sancte matris ecclesie filiis Johannes de Vallibus salutem . Hiis testibus . ' +
  'Roberto de Vallibus . Willelmo de Munfichet’';

function proposal(
  id: number,
  overrides: Partial<DiplomaticProposalItem> = {}
): DiplomaticProposalItem {
  return {
    id,
    pipeline: 'W2.1',
    source_type: 'imagetext',
    source_id: 61,
    source: {
      image_text: 61,
      type: 'Transcription',
      item_image: 3738,
      item_part: 420,
      historical_item: 412,
      label: `DCA DCD 4.3.Sacr.${id}`,
      date: '1221 × 1229',
    },
    payload: {
      entities: [
        { role: 'granter', name: 'Johannes de Vallibus', normalised: 'John de Vaux' },
        { role: 'witness', name: 'Roberto de Vallibus' },
        { role: 'witness', name: 'Ricardo de Morevilla' },
      ],
    },
    confidence: 0.82,
    ml_job: 1,
    model_name: 'anthropic/claude-fable-5-1',
    status: 'pending',
    reviewer: null,
    reviewer_username: '',
    reviewed: null,
    reason: '',
    created: '2026-11-04T00:00:00Z',
    ...overrides,
  };
}

const page = (results: DiplomaticProposalItem[]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

const review = () => screen.getByRole('article');
const renderPage = () => renderWithQueryClient(<DiplomaticProposalsPage />);

describe('<DiplomaticProposalsPage>', () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockReset();
    services.getDiplomaticProposals.mockReset();
    services.getDiplomaticProposal
      .mockReset()
      .mockImplementation(async (id: number) => ({ ...proposal(id), source_text: CHARTER }));
    services.getDiplomaticProposalDepth.mockReset().mockResolvedValue({
      pending: 3,
      by_pipeline: { 'W2.1': 2, 'W2.2': 0, 'W2.4': 0, 'W3.2': 1, 'W3.3': 0 },
    });
    services.acceptDiplomaticProposal
      .mockReset()
      .mockResolvedValue({ status: 'accepted', created: 3 });
    services.rejectDiplomaticProposal.mockReset().mockResolvedValue({ status: 'rejected' });
  });

  it('opens the first pending proposal beside its charter, marking what the text does not contain', async () => {
    services.getDiplomaticProposals.mockResolvedValue(page([proposal(1), proposal(2)]));
    renderPage();

    expect(await screen.findByText('2 of 3 quotations found in the text')).not.toBeNull();
    expect(services.getDiplomaticProposals).toHaveBeenCalledWith({
      status: 'pending',
      pipeline: undefined,
      limit: 25,
      offset: 0,
    });
    expect(within(review()).getByRole('heading', { level: 2 }).textContent).toBe(
      'DCA DCD 4.3.Sacr.1'
    );
    expect(Array.from(document.querySelectorAll('mark'), (m) => m.textContent)).toEqual([
      'Johannes de Vallibus',
      'Roberto de Vallibus',
    ]);
    expect(within(review()).getAllByText('In the text')).toHaveLength(2);
    expect(within(review()).getAllByText('Not in the text')).toHaveLength(1);
    expect(
      within(review())
        .getByRole('link', { name: /Open the page in the viewer/ })
        .getAttribute('href')
    ).toBe('/manuscripts/420/images/3738');
    expect(within(review()).getByRole('link', { name: 'Edit the text' }).getAttribute('href')).toBe(
      '/backoffice/image-texts/61'
    );
  });

  it('opens a proposal chosen from the list', async () => {
    services.getDiplomaticProposals.mockResolvedValue(page([proposal(1), proposal(2)]));
    renderPage();
    await screen.findByText('2 of 3 quotations found in the text');

    fireEvent.click(screen.getByRole('button', { name: /DCA DCD 4\.3\.Sacr\.2/ }));

    expect(
      await within(review()).findByRole('heading', { level: 2, name: 'DCA DCD 4.3.Sacr.2' })
    ).not.toBeNull();
    expect(services.getDiplomaticProposal).toHaveBeenLastCalledWith(2);
  });

  it('accepts, then moves on to the next proposal and reloads the queue', async () => {
    services.getDiplomaticProposals.mockResolvedValue(page([proposal(1), proposal(2)]));
    renderPage();
    await screen.findByText('2 of 3 quotations found in the text');

    expect(
      within(review()).getByText('Accepting records these 3 entities against the charter.')
    ).not.toBeNull();
    fireEvent.click(within(review()).getByRole('button', { name: 'Accept' }));

    await waitFor(() => expect(services.acceptDiplomaticProposal).toHaveBeenCalledWith(1));
    expect(
      await within(review()).findByRole('heading', { level: 2, name: 'DCA DCD 4.3.Sacr.2' })
    ).not.toBeNull();
    await waitFor(() => expect(services.getDiplomaticProposals).toHaveBeenCalledTimes(2));
    expect(services.getDiplomaticProposalDepth).toHaveBeenCalledTimes(2);
  });

  it('rejects with the reason typed beside the button', async () => {
    services.getDiplomaticProposals.mockResolvedValue(page([proposal(1)]));
    renderPage();
    await screen.findByText('2 of 3 quotations found in the text');

    fireEvent.change(screen.getByRole('textbox', { name: 'Reason for rejecting proposal 1' }), {
      target: { value: '  Ricardo is not in the text ' },
    });
    fireEvent.click(within(review()).getByRole('button', { name: 'Reject' }));

    await waitFor(() =>
      expect(services.rejectDiplomaticProposal).toHaveBeenCalledWith(
        1,
        'Ricardo is not in the text'
      )
    );
  });

  it("shows the backend's reason when it refuses an accept, and stays on the proposal", async () => {
    services.getDiplomaticProposals.mockResolvedValue(page([proposal(1), proposal(2)]));
    services.acceptDiplomaticProposal.mockRejectedValue(
      new BackofficeApiError(409, { detail: 'Image 81 already has a translation.' })
    );
    renderPage();
    await screen.findByText('2 of 3 quotations found in the text');

    fireEvent.click(within(review()).getByRole('button', { name: 'Accept' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Could not accept the proposal', {
        description: 'Image 81 already has a translation.',
      })
    );
    expect(within(review()).getByRole('heading', { level: 2 }).textContent).toBe(
      'DCA DCD 4.3.Sacr.1'
    );
  });

  it('will not offer Accept on a proposal whose text was deleted, and says why', async () => {
    services.getDiplomaticProposals.mockResolvedValue(
      page([proposal(1, { source: null, source_id: 99 })])
    );
    renderPage();

    expect(
      await within(await screen.findByRole('article')).findByText('Text 99 (deleted)')
    ).not.toBeNull();
    expect(within(review()).getByRole('button', { name: 'Accept' }).hasAttribute('disabled')).toBe(
      true
    );
    expect(within(review()).getByRole('button', { name: 'Reject' }).hasAttribute('disabled')).toBe(
      false
    );
    expect(screen.getByText(/Its text has been deleted/)).not.toBeNull();
    expect(services.getDiplomaticProposal).not.toHaveBeenCalled();
  });

  it('filters by pipeline, showing what is pending in each', async () => {
    services.getDiplomaticProposals.mockResolvedValue(page([proposal(1)]));
    renderPage();
    await screen.findByText('2 of 3 quotations found in the text');

    fireEvent.click(await screen.findByRole('radio', { name: 'Dating flags, 1 pending' }));

    await waitFor(() =>
      expect(services.getDiplomaticProposals).toHaveBeenLastCalledWith({
        status: 'pending',
        pipeline: 'W3.2',
        limit: 25,
        offset: 0,
      })
    );
  });

  it('shows decided proposals with who decided them, and offers no actions', async () => {
    services.getDiplomaticProposals.mockImplementation(async ({ status }: { status: string }) =>
      status === 'rejected'
        ? page([
            proposal(4, {
              status: 'rejected',
              reviewer_username: 'luca',
              reviewed: '2026-11-04T00:00:00Z',
              reason: 'spurious witness',
            }),
          ])
        : page([])
    );
    renderPage();
    await screen.findByText('No proposals are waiting for review.');

    fireEvent.click(screen.getByRole('radio', { name: 'Rejected' }));

    expect(await screen.findByText(/Rejected by luca/)).not.toBeNull();
    expect(screen.getByText(/spurious witness/)).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
    expect(screen.queryByRole('radio', { name: /pending/ })).toBeNull();
  });

  it('says so when the queue cannot be loaded, instead of showing it empty', async () => {
    services.getDiplomaticProposals.mockRejectedValue(new Error('403'));
    renderPage();

    expect(await screen.findByText('Failed to load the proposals.')).not.toBeNull();
    expect(screen.queryByText('No proposals are waiting for review.')).toBeNull();
  });
});
